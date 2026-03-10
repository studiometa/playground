import { resolve, dirname, posix } from 'node:path';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import type { Compiler } from 'webpack';
import glob from 'fast-glob';
import type { ResolvedDependency } from '../utils/resolve-dependencies.js';

/**
 * Webpack plugin that processes self-hosted playground dependencies.
 *
 * Every dependency with a `source` is bundled into a single `.js` + `.d.ts`
 * using tsdown (rolldown + rolldown-plugin-dts). Works with both npm packages
 * and local TypeScript sources.
 */
export class PlaygroundDependenciesPlugin {
  dependencies: ResolvedDependency[];
  configDir: string;
  publicPath: string;

  constructor(dependencies: ResolvedDependency[], configDir: string, publicPath?: string) {
    this.dependencies = dependencies;
    this.configDir = configDir;
    this.publicPath = publicPath ?? '';
  }

  /**
   * Resolve the effective public path.
   * Explicit `publicPath` takes precedence, then webpack's `output.publicPath`.
   */
  private resolvePublicPath(compiler: Compiler): string {
    if (this.publicPath) {
      return this.publicPath.replace(/\/+$/, '');
    }

    const webpackPublicPath = compiler.options.output?.publicPath;
    if (typeof webpackPublicPath === 'string' && webpackPublicPath !== 'auto' && webpackPublicPath !== '/') {
      return webpackPublicPath.replace(/\/+$/, '');
    }

    return '';
  }

  apply(compiler: Compiler) {
    const pluginName = 'PlaygroundDependenciesPlugin';
    const publicPath = this.resolvePublicPath(compiler);

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async (_assets, callback) => {
          try {
            const headerEntries: Array<{ jsPath: string; dtsPath: string }> = [];

            for (const dep of this.dependencies) {
              if (dep.type === 'bundle') {
                await this.processBundle(compilation, dep);

                headerEntries.push({
                  jsPath: `${publicPath}/static/deps/${dep.specifier}/index.js`,
                  dtsPath: `${publicPath}/static/deps/${dep.specifier}/index.d.ts`,
                });
              }
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
   * Bundle a dependency into a single `.js` + `.d.ts` using tsdown.
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
      });

      for (const buildResult of buildResults) {
        for (const chunk of buildResult.chunks) {
          if ('code' in chunk) {
            const fileName = chunk.fileName.endsWith('.d.ts') ? 'index.d.ts' : 'index.js';
            const assetPath = posix.join(outputBase, fileName);
            compilation.emitAsset(
              assetPath,
              new compilation.compiler.webpack.sources.RawSource(chunk.code),
            );
          }
        }
      }
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
