import { readFileSync } from 'node:fs';

/**
 * Options passed as query parameters to esm.sh URLs.
 *
 * @see https://esm.sh/#docs
 */
export interface EsmShOptions {
  /** Disable default bundling of sub-modules (`?bundle=false`) */
  bundle?: boolean;
  /** Bundle with all external deps into a single file (`?standalone`) */
  standalone?: boolean;
  /** Import raw source without transformation (`?raw`) */
  raw?: boolean;
  /** Development build with process.env.NODE_ENV="development" (`?dev`) */
  dev?: boolean;
  /** Disable X-TypeScript-Types header (`?no-dts`) */
  noDts?: boolean;
  /** Tree-shake: only export specific members (`?exports=foo,bar`) */
  exports?: string[];
  /** Pin dependency versions (`?deps=react@19,react-dom@19`) */
  deps?: string[];
  /** Alias dependencies (`?alias=react:preact/compat`) */
  alias?: Record<string, string>;
  /** Esbuild target (`?target=es2022`) */
  target?: string;
  /** Esbuild conditions (`?conditions=custom1,custom2`) */
  conditions?: string[];
  /** Keep original names (`?keep-names`) */
  keepNames?: boolean;
  /** Ignore side-effect annotations (`?ignore-annotations`) */
  ignoreAnnotations?: boolean;
  /** Mark all deps as external for import map resolution (`*` prefix) */
  external?: boolean;
}

/**
 * A single dependency for the playground script editor.
 *
 * - Plain string → resolved via esm.sh (zero-config)
 * - Object with `source` → self-hosted, bundled with tsdown into `.js` + `.d.ts`
 */
export type DependencyConfig =
  | string
  | {
      /** Bare specifier used in import statements */
      specifier: string;
      /** Optional pinned version for esm.sh resolution */
      version?: string;
      /**
       * Local file path or glob pattern to bundle into a single `.js` + `.d.ts`
       * with tsdown. Must start with `.`, `/`, or contain `*` (glob).
       *
       * Bare npm package names (e.g. `"morphdom"`) are **not supported** as
       * source values — npm packages should use esm.sh resolution instead
       * (omit the `source` field).
       *
       * @example './lib/**\/*.ts'
       * @example '../ui/index.ts'
       */
      source?: string;
      /** Explicit entry point (useful when source is a glob pattern) */
      entry?: string;
      /**
       * Multiple entry points for a single workspace package, keyed by their
       * export subpath (Node `exports`-style: `.`, `./manifest`, …). All entries
       * are built together in **one** tsdown build with code-splitting, so
       * modules shared between entries (e.g. component classes referenced by
       * both a barrel and a lazy manifest) are emitted **once** as a shared
       * chunk and referenced by every entry — a single runtime instance, no
       * singleton/identity hazard.
       *
       * Each key becomes an import-map specifier: `.` maps to `specifier`,
       * `./manifest` maps to `specifier/manifest`, etc. Each entry is emitted at
       * `static/deps/<specifier>/<name>.js` (the `.` entry keeps the
       * `index.js` name for backward compatibility), sharing chunks emitted in
       * the same base directory.
       *
       * Values are local file paths (relative to the consumer config, absolute,
       * or glob) — bare npm names are not supported here. Mutually exclusive
       * with `entry`; when set, `source` is only used for dev file-watching.
       *
       * @example
       * {
       *   specifier: '@studiometa/ui',
       *   source: '../ui/**\/*.ts',
       *   entries: { '.': '../ui/index.ts', './manifest': '../ui/manifest.ts' },
       * }
       */
      entries?: Record<string, string>;
      /**
       * Options passed as query parameters to the esm.sh URL.
       * Only applies to esm.sh-resolved dependencies (ignored when `source` is set).
       *
       * @example { bundle: false }
       * @example { dev: true, exports: ['foo', 'bar'] }
       */
      esmSh?: EsmShOptions;
    };

/**
 * A single resolved entry point of a multi-entry self-hosted dependency.
 * Every entry of a package is produced by one shared tsdown build.
 */
export interface ResolvedDependencyEntry {
  /** Export subpath as declared in the config (`.`, `./manifest`, …). */
  subpath: string;
  /** Full import-map specifier (`@studiometa/ui`, `@studiometa/ui/manifest`, …). */
  specifier: string;
  /**
   * tsdown/rolldown entry name. Drives the emitted filename `<name>.js`.
   * The `.` subpath uses `index` so it keeps the `index.js` contract.
   */
  name: string;
  /** Local entry source file (relative to the consumer config, or absolute). */
  source: string;
  /** Import-map value (`/static/deps/<specifier>/<name>.js`). */
  importMapValue: string;
}

export interface ResolvedDependency {
  specifier: string;
  importMapValue: string;
  type: 'esm-sh' | 'bundle';
  source?: string;
  entry?: string;
  /**
   * Present when the dependency declares multiple entry points. All entries
   * are built together (one tsdown build, code-split) under the base
   * `static/deps/<specifier>/` directory.
   */
  entries?: ResolvedDependencyEntry[];
}

export interface ResolvedDependencies {
  importMap: Record<string, string>;
  selfHosted: ResolvedDependency[];
}

/**
 * Clean version string by removing semver range prefixes.
 */
function cleanVersion(version: string): string {
  return version.replace(/^[^\d]*/, '');
}

/**
 * Extract the package name from a specifier that may include a subpath.
 *
 * @example
 * getPackageName('@studiometa/js-toolkit/utils') // → '@studiometa/js-toolkit'
 * getPackageName('deepmerge')                     // → 'deepmerge'
 * getPackageName('@motionone/easing')             // → '@motionone/easing'
 */
export function getPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
}

/**
 * Extract the subpath from a specifier, if any.
 * Returns `undefined` when the specifier has no subpath.
 *
 * @example
 * getSubpath('@studiometa/js-toolkit/utils')  // → '/utils'
 * getSubpath('@studiometa/js-toolkit')         // → undefined
 * getSubpath('lodash/merge')                   // → '/merge'
 * getSubpath('deepmerge')                      // → undefined
 */
export function getSubpath(specifier: string): string | undefined {
  const pkgName = getPackageName(specifier);
  const sub = specifier.slice(pkgName.length);
  return sub || undefined;
}

/**
 * Check whether a source string refers to a local path (relative, absolute, or glob)
 * as opposed to a bare npm package specifier.
 */
function isLocalSource(source: string): boolean {
  return source.startsWith('.') || source.startsWith('/') || source.includes('*');
}

/**
 * Serialize `EsmShOptions` into a query string (without leading `?`).
 * Returns an empty string when no options produce query params.
 * The `external` option is handled separately (via `*` URL prefix).
 */
export function serializeEsmShOptions(options: EsmShOptions): string {
  const params: string[] = [];

  if (options.bundle === false) params.push('bundle=false');
  if (options.standalone) params.push('standalone');
  if (options.raw) params.push('raw');
  if (options.dev) params.push('dev');
  if (options.noDts) params.push('no-dts');
  if (options.keepNames) params.push('keep-names');
  if (options.ignoreAnnotations) params.push('ignore-annotations');
  if (options.target) params.push(`target=${options.target}`);
  if (options.exports?.length) params.push(`exports=${options.exports.join(',')}`);
  if (options.deps?.length) params.push(`deps=${options.deps.join(',')}`);
  if (options.conditions?.length) params.push(`conditions=${options.conditions.join(',')}`);
  if (options.alias) {
    const aliasStr = Object.entries(options.alias)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    if (aliasStr) params.push(`alias=${aliasStr}`);
  }

  return params.join('&');
}

/**
 * Resolve a list of dependency configs into import map entries and
 * self-hosted dependency metadata.
 *
 * Self-hosted entries always get bare paths (e.g. `/static/deps/…`).
 * The public path prefix is applied later in the preset's `extendWebpack`
 * callback, where the effective webpack `output.publicPath` is available.
 *
 * @param dependencies - Array of dependency configurations
 * @param packageJsonPath - Optional path to consumer's package.json for version inference
 */
export function resolveDependencies(
  dependencies: DependencyConfig[],
  packageJsonPath?: string,
): ResolvedDependencies {
  const importMap: Record<string, string> = {};
  const selfHosted: ResolvedDependency[] = [];

  // Try to read versions from consumer's package.json
  let pkgVersions: Record<string, string> = {};
  if (packageJsonPath) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      pkgVersions = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {
      // ignore
    }
  }

  for (const dep of dependencies) {
    const config = typeof dep === 'string' ? { specifier: dep } : dep;
    const { specifier, version, source, entry } = config;
    const entries = 'entries' in config ? config.entries : undefined;

    const esmSh = 'esmSh' in config ? config.esmSh : undefined;

    if (entries && Object.keys(entries).length > 0) {
      // Multi-entry: one code-split build, shared chunks emitted once.
      const resolvedEntries: ResolvedDependencyEntry[] = [];

      for (const [subpath, entrySource] of Object.entries(entries)) {
        if (!isLocalSource(entrySource)) {
          console.warn(
            `[playground] Multi-entry dependency "${specifier}" subpath "${subpath}" has a ` +
              `non-local source ("${entrySource}"). Only local file paths are supported for ` +
              'entries — this entry is skipped.',
          );
          continue;
        }

        const fullSpecifier = subpath === '.' ? specifier : `${specifier}${subpath.slice(1)}`;
        // `.` keeps the historical `index` name (→ `index.js`); other subpaths
        // reuse their path as the rolldown entry name so shared-chunk relative
        // imports resolve against the emitted layout.
        const name = subpath === '.' ? 'index' : subpath.replace(/^\.\//, '');
        const importMapValue = `/static/deps/${specifier}/${name}.js`;

        importMap[fullSpecifier] = importMapValue;
        resolvedEntries.push({
          subpath,
          specifier: fullSpecifier,
          name,
          source: entrySource,
          importMapValue,
        });
      }

      if (resolvedEntries.length > 0) {
        const base = resolvedEntries.find((e) => e.subpath === '.') ?? resolvedEntries[0];
        selfHosted.push({
          specifier,
          importMapValue: base.importMapValue,
          type: 'bundle',
          source,
          entries: resolvedEntries,
        });
      }

      continue;
    }

    if (!source) {
      // esm.sh resolution — split specifier into package name + optional subpath
      const pkgName = getPackageName(specifier);
      const subpath = getSubpath(specifier);
      const inferredVersion = pkgVersions[pkgName];
      const resolvedVersion =
        version ?? (inferredVersion ? cleanVersion(inferredVersion) : undefined);
      const versionedPkg = resolvedVersion ? `${pkgName}@${resolvedVersion}` : pkgName;
      const prefix = esmSh?.external ? '*' : '';
      const query = esmSh ? serializeEsmShOptions(esmSh) : '';
      const esmUrl = `https://esm.sh/${prefix}${versionedPkg}${subpath ?? ''}${query ? `?${query}` : ''}`;
      importMap[specifier] = esmUrl;
    } else if (!isLocalSource(source)) {
      // Bare npm package name used as source — warn and fall back to esm.sh
      console.warn(
        `[playground] Dependency "${specifier}" has a bare npm package name as source ("${source}"). ` +
          'This is not supported — npm packages should use esm.sh resolution instead (omit the `source` field). ' +
          'Falling back to esm.sh.',
      );
      const pkgName = getPackageName(specifier);
      const subpath = getSubpath(specifier);
      const inferredVersion = pkgVersions[pkgName];
      const resolvedVersion =
        version ?? (inferredVersion ? cleanVersion(inferredVersion) : undefined);
      const versionedPkg = resolvedVersion ? `${pkgName}@${resolvedVersion}` : pkgName;
      const prefix = esmSh?.external ? '*' : '';
      const query = esmSh ? serializeEsmShOptions(esmSh) : '';
      const esmUrl = `https://esm.sh/${prefix}${versionedPkg}${subpath ?? ''}${query ? `?${query}` : ''}`;
      importMap[specifier] = esmUrl;
    } else {
      // Local source — bundle with tsdown → single .js + .d.ts
      const depPath = `/static/deps/${specifier}/index.js`;
      importMap[specifier] = depPath;
      selfHosted.push({ specifier, importMapValue: depPath, type: 'bundle', source, entry });
    }
  }

  return { importMap, selfHosted };
}
