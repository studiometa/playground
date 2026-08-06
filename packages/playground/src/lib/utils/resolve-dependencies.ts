import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

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
       * Auto-detect export subpaths from the package's `exports` field so each
       * subpath does not have to be declared by hand.
       *
       * - `true` → detect **all** subpaths from the package's `exports` map.
       * - `string[]` (e.g. `['./utils']`) → an explicit subset; no
       *   `package.json` read is performed.
       *
       * Behaviour depends on how the dependency is resolved:
       *
       * - **esm.sh deps** (no `source`): each detected subpath is added to the
       *   import map as its own esm.sh URL (same version/query/prefix as the
       *   base specifier). When `true`, the `exports` map is read from disk
       *   (`node_modules`) when available, otherwise fetched from the npm
       *   registry.
       * - **Local self-hosted deps** (local `source`): each subpath becomes an
       *   entry of the multi-entry code-split build; its target `.ts`/`.js`
       *   file is taken from the `exports` map. Ignored when explicit `entries`
       *   are already set.
       *
       * @example true
       * @example ['./utils', './utils/css']
       */
      subpaths?: boolean | string[];
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
  /**
   * Extra import-map specifiers (e.g. `./Foo.js` aliases) that resolve to an
   * existing built entry's file. Used by the plugin to prefix them with
   * publicPath.
   */
  aliasSpecifiers?: string[];
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
 * Walk up directories from `fromDir` to locate a package's `package.json` in a
 * `node_modules` folder.
 *
 * `require.resolve('<pkg>/package.json')` is blocked by the package's `exports`
 * field in modern packages, so the file is resolved manually.
 *
 * @returns The first matching path, or `undefined` when none is found.
 */
export function findPackageJsonOnDisk(pkgName: string, fromDir: string): string | undefined {
  const parts = pkgName.split('/');
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', ...parts, 'package.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Read the raw `exports` value of a package — from disk (`node_modules`) when
 * available, otherwise from the npm registry.
 *
 * The returned value is the untouched `exports` field (string, array, or
 * object) or `undefined` when it cannot be read.
 */
export async function readPackageExports(
  pkgName: string,
  version: string | undefined,
  fromDir: string,
): Promise<unknown> {
  const diskPath = findPackageJsonOnDisk(pkgName, fromDir);
  if (diskPath) {
    try {
      const pkg = JSON.parse(readFileSync(diskPath, 'utf-8'));
      return pkg.exports;
    } catch {
      // Fall through to the registry.
    }
  }

  try {
    const response = await fetch(`https://registry.npmjs.org/${pkgName}`);
    if (!response.ok) {
      console.warn(
        `[playground] Failed to fetch package metadata for "${pkgName}" from the npm registry ` +
          `(status ${response.status}). No subpaths detected.`,
      );
      return undefined;
    }
    const data = await response.json();
    const ver = version && data.versions?.[version] ? version : data['dist-tags']?.latest;
    return data.versions?.[ver]?.exports;
  } catch (error) {
    console.warn(
      `[playground] Could not read exports for "${pkgName}" from the npm registry: ${String(error)}. ` +
        'No subpaths detected.',
    );
    return undefined;
  }
}

/**
 * Extract the list of export subpath keys from a raw `exports` value.
 *
 * When `exports` is an object whose keys are subpaths (start with `.`), returns
 * those keys, excluding `./package.json` and any wildcard (`*`) key. Otherwise
 * (string/array/conditions-only object) returns `['.']`. The result is unique.
 */
export function extractSubpathKeys(exports: unknown): string[] {
  if (exports && typeof exports === 'object' && !Array.isArray(exports)) {
    const keys = Object.keys(exports as Record<string, unknown>);
    const dotted = keys.filter((key) => key.startsWith('.'));
    if (dotted.length > 0) {
      const filtered = dotted.filter((key) => key !== './package.json' && !key.includes('*'));
      return [...new Set(filtered)];
    }
  }
  return ['.'];
}

/**
 * Resolve an `exports` entry value to a target file path.
 *
 * Strings are returned as-is. For conditions objects, `import`, `module`,
 * `browser`, then `default` are tried in order; a nested conditions object is
 * resolved one level deep with the same order.
 */
export function resolveExportTarget(value: unknown, depth = 0): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && depth < 2) {
    const obj = value as Record<string, unknown>;
    for (const key of ['import', 'module', 'browser', 'default']) {
      if (key in obj) {
        const resolved = resolveExportTarget(obj[key], depth + 1);
        if (resolved) return resolved;
      }
    }
  }
  return undefined;
}

/**
 * Derive multi-entry `entries` (and `.js`-suffix aliases) for a local
 * self-hosted dependency from its `package.json` `exports` field.
 *
 * Subpaths that resolve to the **same** target file are grouped: the group's
 * canonical key (the first non-`.js`-suffixed key) becomes the build entry;
 * every other key becomes an alias pointing at that entry's file. This avoids
 * duplicate entries (and filenames like `Foo.js.js`) for packages that expose
 * both `./Foo` and `./Foo.js` mapping to one source file.
 */
export function deriveLocalEntries(
  source: string,
  subpaths: boolean | string[],
  configDir: string,
): { entries: Record<string, string>; aliases: Record<string, string> } {
  const rootRel = source.includes('*') ? source.slice(0, source.indexOf('*')) : source;
  const pkgRoot = resolve(configDir, rootRel);
  const pkgJsonPath = join(pkgRoot, 'package.json');

  let pkg: { exports?: unknown };
  try {
    pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  } catch {
    console.warn(
      `[playground] Could not read "${pkgJsonPath}" to derive subpaths. No entries derived.`,
    );
    return { entries: {}, aliases: {} };
  }

  const exports = pkg.exports as Record<string, unknown> | undefined;
  const keys = Array.isArray(subpaths) ? subpaths : extractSubpathKeys(exports);

  const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx']);
  const byTarget = new Map<string, string[]>();

  for (const key of keys) {
    const target = resolveExportTarget(exports?.[key]);
    if (!target) {
      console.warn(
        `[playground] No resolvable export target for subpath "${key}" in "${pkgRoot}". Skipped.`,
      );
      continue;
    }
    const abs = resolve(pkgRoot, target);
    if (!allowedExtensions.has(extname(abs))) continue;
    const list = byTarget.get(abs) ?? [];
    list.push(key);
    byTarget.set(abs, list);
  }

  const entries: Record<string, string> = {};
  const aliases: Record<string, string> = {};
  for (const [abs, keyList] of byTarget) {
    const canonical = keyList.find((key) => !key.endsWith('.js')) ?? keyList[0];
    entries[canonical] = abs;
    for (const key of keyList) {
      if (key !== canonical) aliases[key] = canonical;
    }
  }

  return { entries, aliases };
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
export async function resolveDependencies(
  dependencies: DependencyConfig[],
  packageJsonPath?: string,
): Promise<ResolvedDependencies> {
  const importMap: Record<string, string> = {};
  const selfHosted: ResolvedDependency[] = [];

  const configDir = packageJsonPath ? dirname(packageJsonPath) : process.cwd();

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
    const esmSh = 'esmSh' in config ? config.esmSh : undefined;
    const subpaths = 'subpaths' in config ? config.subpaths : undefined;

    // `aliasSubpaths` maps a `.js`-suffix alias subpath to its canonical subpath.
    let entries = 'entries' in config ? config.entries : undefined;
    let aliasSubpaths: Record<string, string> = {};
    if (!entries && subpaths && source && isLocalSource(source)) {
      const derived = deriveLocalEntries(source, subpaths, configDir);
      entries = derived.entries;
      aliasSubpaths = derived.aliases;
    }

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

        // Emit `.js`-suffix alias specifiers that reuse an existing entry's file.
        const aliasSpecifiers: string[] = [];
        for (const [aliasSub, canonicalSub] of Object.entries(aliasSubpaths)) {
          const canonicalEntry = resolvedEntries.find((e) => e.subpath === canonicalSub);
          if (!canonicalEntry) continue;
          const aliasSpecifier = aliasSub === '.' ? specifier : `${specifier}${aliasSub.slice(1)}`;
          importMap[aliasSpecifier] = canonicalEntry.importMapValue;
          aliasSpecifiers.push(aliasSpecifier);
        }

        selfHosted.push({
          specifier,
          importMapValue: base.importMapValue,
          type: 'bundle',
          source,
          entries: resolvedEntries,
          ...(aliasSpecifiers.length ? { aliasSpecifiers } : {}),
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
      const buildEsmUrl = (suffix: string) =>
        `https://esm.sh/${prefix}${versionedPkg}${suffix}${query ? `?${query}` : ''}`;

      importMap[specifier] = buildEsmUrl(subpath ?? '');

      if (subpaths) {
        const subpathKeys =
          subpaths === true
            ? extractSubpathKeys(await readPackageExports(pkgName, resolvedVersion, configDir))
            : subpaths;
        for (const key of subpathKeys) {
          if (key === '.') continue;
          const suffix = key.slice(1);
          importMap[pkgName + suffix] = buildEsmUrl(suffix);
        }
      }
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
