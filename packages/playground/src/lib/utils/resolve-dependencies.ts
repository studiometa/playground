import { readFileSync } from 'node:fs';

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
    };

export interface ResolvedDependency {
  specifier: string;
  importMapValue: string;
  type: 'esm-sh' | 'bundle';
  source?: string;
  entry?: string;
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
 * Normalize a public path: ensure it starts with `/` and has no trailing slash.
 * Empty or `/` returns empty string.
 */
function normalizePublicPath(publicPath?: string): string {
  if (!publicPath || publicPath === '/') return '';
  let normalized = publicPath;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized.replace(/\/+$/, '');
}

/**
 * Resolve a list of dependency configs into import map entries and
 * self-hosted dependency metadata.
 *
 * @param dependencies - Array of dependency configurations
 * @param packageJsonPath - Optional path to consumer's package.json for version inference
 * @param publicPath - Optional public path prefix for self-hosted dependency URLs
 */
export function resolveDependencies(
  dependencies: DependencyConfig[],
  packageJsonPath?: string,
  publicPath?: string,
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

    if (!source) {
      // esm.sh resolution — split specifier into package name + optional subpath
      const pkgName = getPackageName(specifier);
      const subpath = getSubpath(specifier);
      const inferredVersion = pkgVersions[pkgName];
      const resolvedVersion =
        version ?? (inferredVersion ? cleanVersion(inferredVersion) : undefined);
      const versionedPkg = resolvedVersion ? `${pkgName}@${resolvedVersion}` : pkgName;
      const esmUrl = `https://esm.sh/${versionedPkg}${subpath ?? ''}`;
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
      const esmUrl = `https://esm.sh/${versionedPkg}${subpath ?? ''}`;
      importMap[specifier] = esmUrl;
    } else {
      // Local source — bundle with tsdown → single .js + .d.ts
      const prefix = normalizePublicPath(publicPath);
      const depPath = `${prefix}/static/deps/${specifier}/index.js`;
      importMap[specifier] = depPath;
      selfHosted.push({ specifier, importMapValue: depPath, type: 'bundle', source, entry });
    }
  }

  return { importMap, selfHosted };
}
