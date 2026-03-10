import { readFileSync } from 'node:fs';

/**
 * A single dependency for the playground script editor.
 *
 * - Plain string → resolved via esm.sh (zero-config)
 * - Object with `source` → self-hosted (copy, bundle, or transpile)
 */
export type DependencyConfig =
  | string
  | {
      /** Bare specifier used in import statements */
      specifier: string;
      /** Optional pinned version for esm.sh resolution */
      version?: string;
      /**
       * Source to copy/bundle/transpile.
       * - npm package name → copy pre-built .js + .d.ts from node_modules
       * - glob pattern → transpile matching files
       * Omit for esm.sh resolution.
       */
      source?: string;
      /** Bundle the source into a single ESM file with esbuild */
      bundle?: boolean;
      /** Transpile TypeScript source → .js + generate .d.ts with tsgo */
      typescript?: boolean;
      /** Explicit entry point for .d.ts generation (for glob sources) */
      entry?: string;
    };

export interface ResolvedDependency {
  specifier: string;
  importMapValue: string;
  type: 'esm-sh' | 'copy' | 'bundle' | 'typescript';
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
 * Resolve a list of dependency configs into import map entries and
 * self-hosted dependency metadata.
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
    const { specifier, version, source, bundle, typescript, entry } = config;

    if (!source) {
      // esm.sh resolution
      const inferredVersion = pkgVersions[specifier];
      const resolvedVersion =
        version ?? (inferredVersion ? cleanVersion(inferredVersion) : undefined);
      const esmUrl = resolvedVersion
        ? `https://esm.sh/${specifier}@${resolvedVersion}`
        : `https://esm.sh/${specifier}`;
      importMap[specifier] = esmUrl;
    } else if (typescript) {
      const depPath = `/static/deps/${specifier}/index.js`;
      importMap[specifier] = depPath;
      selfHosted.push({ specifier, importMapValue: depPath, type: 'typescript', source, entry });
    } else if (bundle) {
      const depPath = `/static/deps/${specifier}.js`;
      importMap[specifier] = depPath;
      selfHosted.push({ specifier, importMapValue: depPath, type: 'bundle', source });
    } else {
      const depPath = `/static/deps/${specifier}/index.js`;
      importMap[specifier] = depPath;
      selfHosted.push({ specifier, importMapValue: depPath, type: 'copy', source });
    }
  }

  return { importMap, selfHosted };
}
