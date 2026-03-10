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
       * Source to bundle into a single `.js` + `.d.ts` with tsdown.
       * Can be an npm package name or a local file path / glob pattern.
       * Omit for esm.sh resolution.
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
      // esm.sh resolution
      const inferredVersion = pkgVersions[specifier];
      const resolvedVersion =
        version ?? (inferredVersion ? cleanVersion(inferredVersion) : undefined);
      const esmUrl = resolvedVersion
        ? `https://esm.sh/${specifier}@${resolvedVersion}`
        : `https://esm.sh/${specifier}`;
      importMap[specifier] = esmUrl;
    } else {
      // Bundle with tsdown → single .js + .d.ts
      const prefix = normalizePublicPath(publicPath);
      const depPath = `${prefix}/static/deps/${specifier}/index.js`;
      importMap[specifier] = depPath;
      selfHosted.push({ specifier, importMapValue: depPath, type: 'bundle', source, entry });
    }
  }

  return { importMap, selfHosted };
}
