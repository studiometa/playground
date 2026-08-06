import { resolve, dirname, posix } from 'node:path';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import type { Compiler } from 'webpack';
import glob from 'fast-glob';
import type { ResolvedDependency } from '../utils/resolve-dependencies.js';
import { resolvePublicPath } from '../utils/resolve-public-path.js';

/**
 * Webpack plugin that processes self-hosted playground dependencies.
 *
 * Every dependency with a `source` is bundled with tsdown (rolldown +
 * rolldown-plugin-dts). The entry is emitted as `index.js` + `index.d.ts`;
 * when the dependency code-splits via dynamic `import()`, the extra chunks are
 * emitted alongside under their own content-hashed filenames. Works with both
 * npm packages and local TypeScript sources.
 *
 * A dependency with `entries` (multiple export subpaths of one workspace
 * package) is instead built in a single code-split tsdown build: every entry
 * is emitted at `static/deps/<specifier>/<name>.js` and the modules shared
 * between entries become one shared chunk referenced by all of them — a single
 * runtime instance, avoiding the singleton/identity hazard of building each
 * subpath as its own bundle. See `processMultiEntryBundle`.
 */
export class PlaygroundDependenciesPlugin {
  dependencies: ResolvedDependency[];
  configDir: string;
  publicPath: string;
  /**
   * Specifiers from the merged import map that should be externalized in
   * self-hosted bundles. This prevents inlining shared dependencies that
   * the browser's import map already resolves (e.g. via esm.sh).
   */
  importMapKeys: string[];
  /**
   * Reference to the shared import map object (from twigData). Mutated
   * at compilation time to prefix self-hosted entries with the resolved
   * public path. This works because HtmlWebpackPlugin renders templates
   * during compilation, after this plugin's hooks have run.
   */
  importMap?: Record<string, string>;

  constructor(
    dependencies: ResolvedDependency[],
    configDir: string,
    publicPath?: string,
    importMapKeys?: string[],
    importMap?: Record<string, string>,
  ) {
    this.dependencies = dependencies;
    this.configDir = configDir;
    this.publicPath = publicPath ?? '';
    this.importMapKeys = importMapKeys ?? [];
    this.importMap = importMap;
  }

  apply(compiler: Compiler) {
    const pluginName = 'PlaygroundDependenciesPlugin';
    const publicPath = resolvePublicPath(this.publicPath, compiler.options);

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      // Prefix self-hosted import map entries with the resolved publicPath.
      // The importMap reference is shared with prototyping's twig data, so
      // mutating it here is picked up when HtmlWebpackPlugin renders templates.
      if (publicPath && this.importMap) {
        for (const dep of this.dependencies) {
          // A multi-entry dependency contributes one import-map key per entry
          // subpath; single-entry ones contribute just their own specifier.
          // Alias specifiers (e.g. `.js` export aliases collapsed onto a
          // canonical entry) are prefixed too — they resolve to the same
          // emitted file as their canonical entry.
          const specifiers = dep.entries?.length
            ? [...dep.entries.map((entry) => entry.specifier), ...(dep.aliasSpecifiers ?? [])]
            : [dep.specifier];
          for (const specifier of specifiers) {
            const currentValue = this.importMap[specifier];
            if (currentValue && !currentValue.startsWith('http')) {
              this.importMap[specifier] = publicPath + currentValue;
            }
          }
        }
      }

      // Watch local source files so webpack rebuilds when they change
      for (const dep of this.dependencies) {
        if (dep.type !== 'bundle') continue;

        // Multi-entry: watch each entry source file (and the optional glob source).
        const watchSources = [
          ...(dep.entries?.map((entry) => entry.source) ?? []),
          ...(dep.source ? [dep.source] : []),
        ];
        for (const watchSource of watchSources) {
          if (!this.isLocalSource(watchSource)) continue;
          const resolvedPattern = resolve(this.configDir, watchSource);
          const isGlob = watchSource.includes('*');
          const sourceFiles = isGlob ? glob.globSync(resolvedPattern) : [resolvedPattern];
          for (const file of sourceFiles) {
            compilation.fileDependencies.add(file);
          }
        }
      }

      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async (_assets, callback) => {
          try {
            const headerEntries: Array<{ jsPath: string; dtsPath: string }> = [];

            for (const dep of this.dependencies) {
              if (dep.type !== 'bundle') continue;

              if (dep.entries?.length) {
                // Multi-entry: one code-split build, one `_headers` line per entry.
                await this.processMultiEntryBundle(compilation, dep);

                for (const entry of dep.entries) {
                  headerEntries.push({
                    jsPath: `${publicPath}/static/deps/${dep.specifier}/${entry.name}.js`,
                    dtsPath: `${publicPath}/static/deps/${dep.specifier}/${entry.name}.d.ts`,
                  });
                }
                continue;
              }

              await this.processBundle(compilation, dep);

              headerEntries.push({
                jsPath: `${publicPath}/static/deps/${dep.specifier}/index.js`,
                dtsPath: `${publicPath}/static/deps/${dep.specifier}/index.d.ts`,
              });
            }

            // Emit _headers file (Cloudflare Pages format) for x-typescript-types
            if (headerEntries.length > 0) {
              const headersContent =
                headerEntries
                  .map((e) => `${e.jsPath}\n  x-typescript-types: ${e.dtsPath}`)
                  .join('\n\n') + '\n';

              const existingHeaders = compilation.getAsset('_headers');
              if (existingHeaders) {
                const existing = existingHeaders.source.source().toString();
                compilation.updateAsset(
                  '_headers',
                  new compilation.compiler.webpack.sources.RawSource(
                    existing + '\n' + headersContent,
                  ),
                );
              } else {
                compilation.emitAsset(
                  '_headers',
                  new compilation.compiler.webpack.sources.RawSource(headersContent),
                );
              }
            }

            callback();
          } catch (err) {
            callback(err as Error);
          }
        },
      );
    });
  }

  /**
   * Bundle a dependency into `index.js` + `index.d.ts` (plus any code-split
   * sibling chunks) using tsdown.
   *
   * For npm packages, a temporary re-export entry file is created so that
   * tsdown can resolve the package from the consumer's `node_modules`.
   * For local sources, the entry is resolved from the source pattern or
   * explicit `entry` option.
   */
  private async processBundle(compilation: any, dep: ResolvedDependency) {
    let tsdown: typeof import('tsdown');
    try {
      tsdown = await import('tsdown');
    } catch {
      console.warn(
        `[playground] tsdown not found, skipping processing for "${dep.specifier}". ` +
          'Install it as a devDependency to enable this feature.',
      );
      return;
    }

    const entryPoint = this.resolveEntryPoint(dep);
    if (!entryPoint) return;

    const isNpmSource = !this.isLocalSource(dep.source!);
    const outputBase = `static/deps/${dep.specifier}`;

    try {
      // Externalize any specifier that is already in the import map so that
      // shared dependencies are not inlined (the browser resolves them via
      // the import map at runtime). Exclude the current dependency's own
      // specifier to avoid externalizing itself.
      const external = this.importMapKeys.filter((key) => key !== dep.specifier);

      const buildResults = await tsdown.build({
        entry: [entryPoint],
        format: 'esm',
        dts: true,
        outDir: '/tmp', // unused with write: false
        clean: false,
        platform: 'browser',
        target: 'es2020',
        config: false,
        write: false,
        logLevel: 'silent',
        external,
      });

      this.emitBundleChunks(compilation, buildResults, outputBase);
    } finally {
      if (isNpmSource) {
        try {
          rmSync(dirname(entryPoint), { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Bundle every entry point of a multi-entry dependency in a **single**
   * tsdown build so that modules shared between entries become a single shared
   * chunk instead of being duplicated per entry.
   *
   * This is the load-bearing property: when a workspace package exposes several
   * entry points (e.g. a barrel `.` and a lazy `./manifest`), building each as
   * its own bundle duplicates the shared component classes across bundles,
   * producing distinct module instances — a singleton/identity hazard for
   * class-keyed registries and `instanceof` checks. Building them together lets
   * rolldown hoist those shared modules into one chunk referenced by every
   * entry → a single instance.
   *
   * Each entry is emitted verbatim under the base `static/deps/<specifier>/`
   * directory using its rolldown filename (`<name>.js`, where `.` → `index`),
   * and shared chunks keep their content-hashed names alongside. Because every
   * chunk keeps the exact filename rolldown assigned, the entries' relative
   * `import`/`import()` of the shared chunks resolve unchanged — no rewriting.
   *
   * @private
   */
  private async processMultiEntryBundle(compilation: any, dep: ResolvedDependency) {
    let tsdown: typeof import('tsdown');
    try {
      tsdown = await import('tsdown');
    } catch {
      console.warn(
        `[playground] tsdown not found, skipping processing for "${dep.specifier}". ` +
          'Install it as a devDependency to enable this feature.',
      );
      return;
    }

    const entries = dep.entries ?? [];
    if (entries.length === 0) return;

    // rolldown entry object: name → resolved source file. Names drive the
    // emitted `<name>.js` filenames (see `resolve-dependencies.ts`).
    const entry: Record<string, string> = {};
    for (const item of entries) {
      entry[item.name] = resolve(this.configDir, item.source);
    }

    // Externalize every import-map specifier except this package's own entry
    // specifiers, so the shared runtime deps (e.g. js-toolkit) stay external
    // while the package's own modules are bundled and shared across entries.
    const ownSpecifiers = new Set<string>([
      dep.specifier,
      ...entries.map((item) => item.specifier),
    ]);
    const external = this.importMapKeys.filter((key) => !ownSpecifiers.has(key));

    const outputBase = `static/deps/${dep.specifier}`;

    const buildResults = await tsdown.build({
      entry,
      format: 'esm',
      dts: true,
      outDir: '/tmp', // unused with write: false
      clean: false,
      platform: 'browser',
      target: 'es2020',
      config: false,
      write: false,
      logLevel: 'silent',
      external,
    });

    // Emit every chunk verbatim: entry chunks are already named `<name>.js`
    // (via the rolldown entry object) and shared chunks keep their hashed
    // names, so relative imports between them resolve inside `outputBase`.
    this.emitBundleChunks(compilation, buildResults, outputBase, false);
  }

  /**
   * Emit every chunk of a tsdown build result as a webpack asset under
   * `outputBase`.
   *
   * The entry chunks are pinned to the stable `index.js` / `index.d.ts`
   * filenames because the import map (see `resolve-dependencies.ts`) and the
   * `_headers` file both point at `.../index.js` and `.../index.d.ts` — that
   * contract must not change.
   *
   * Every non-entry chunk (produced when a dependency code-splits via a
   * dynamic `import()`, e.g. `@studiometa/ui-mapbox`'s lazy `MapboxMap`
   * children) keeps its real, content-hashed filename. The entry chunk's
   * internal `import('./child-<hash>.js')` calls are relative, so those
   * chunks resolve as siblings in the same emitted directory — no import map
   * or runtime change is required.
   *
   * Renaming every chunk to `index.js` (the previous behaviour, which assumed
   * a single-chunk bundle) collapses all non-entry chunks onto the same path
   * and makes webpack abort at seal time with:
   * `Conflict: Multiple assets emit different content to the same filename
   * static/deps/<specifier>/index.js`.
   *
   * When `pinEntry` is `false` (multi-entry builds) every chunk — entries
   * included — is emitted under its own rolldown filename. Multi-entry builds
   * name their entries explicitly (`index.js`, `manifest.js`, …) via the
   * rolldown entry object, so no pinning is needed and every relative import
   * between entries and shared chunks resolves as emitted.
   *
   * @private
   */
  private emitBundleChunks(
    compilation: any,
    buildResults: Array<{
      chunks: Array<{ fileName: string; code?: string; isEntry?: boolean }>;
    }>,
    outputBase: string,
    pinEntry = true,
  ) {
    for (const buildResult of buildResults) {
      for (const chunk of buildResult.chunks) {
        if ('code' in chunk && typeof chunk.code === 'string') {
          const isDts = chunk.fileName.endsWith('.d.ts');
          const fileName =
            pinEntry && chunk.isEntry ? (isDts ? 'index.d.ts' : 'index.js') : chunk.fileName;
          const assetPath = posix.join(outputBase, fileName);
          compilation.emitAsset(
            assetPath,
            new compilation.compiler.webpack.sources.RawSource(chunk.code),
          );
        }
      }
    }
  }

  /**
   * Check whether a source string refers to a local path (relative, absolute, or glob)
   * as opposed to a bare npm package specifier.
   */
  private isLocalSource(source: string): boolean {
    return source.startsWith('.') || source.startsWith('/') || source.includes('*');
  }

  /**
   * Resolve the entry point for a dependency.
   *
   * - For npm package sources: creates a temporary `.ts` file that re-exports from the package
   * - For local sources: resolves from source pattern or explicit entry
   */
  private resolveEntryPoint(dep: ResolvedDependency): string | null {
    const source = dep.source!;

    if (!this.isLocalSource(source)) {
      // npm package — create a temporary re-export entry
      const tmpDir = mkdtempSync(resolve(this.configDir, 'node_modules', '.playground-'));
      const entryPath = resolve(tmpDir, 'entry.ts');
      writeFileSync(entryPath, `export * from '${source}';\n`);
      return entryPath;
    }

    // Local source — resolve from pattern or explicit entry
    if (dep.entry) {
      return resolve(this.configDir, dep.entry);
    }

    const isGlob = source.includes('*');
    const resolvedPattern = resolve(this.configDir, source);
    const sourceFiles = isGlob ? glob.globSync(resolvedPattern) : [resolvedPattern];

    if (sourceFiles.length === 0) {
      console.warn(
        `[playground] No files found for dependency "${dep.specifier}" with source "${source}"`,
      );
      return null;
    }

    return sourceFiles.find((f) => f.endsWith('/index.ts')) ?? sourceFiles[0];
  }
}
