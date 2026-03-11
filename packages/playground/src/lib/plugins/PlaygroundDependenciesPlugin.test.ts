import { describe, it, expect } from 'vitest';
import { PlaygroundDependenciesPlugin } from './PlaygroundDependenciesPlugin.js';
import type { ResolvedDependency } from '../utils/resolve-dependencies.js';

describe('PlaygroundDependenciesPlugin', () => {
  const plugin = new PlaygroundDependenciesPlugin([], '/tmp');
  const isLocalSource = (source: string) => (plugin as any).isLocalSource(source);

  describe('isLocalSource', () => {
    it('detects relative paths', () => {
      expect(isLocalSource('./lib/index.ts')).toBe(true);
      expect(isLocalSource('../ui/index.ts')).toBe(true);
    });

    it('detects absolute paths', () => {
      expect(isLocalSource('/home/user/src/index.ts')).toBe(true);
    });

    it('detects glob patterns', () => {
      expect(isLocalSource('./lib/**/*.ts')).toBe(true);
      expect(isLocalSource('../ui/*.ts')).toBe(true);
    });

    it('detects npm package names as non-local', () => {
      expect(isLocalSource('morphdom')).toBe(false);
      expect(isLocalSource('@studiometa/js-toolkit')).toBe(false);
      expect(isLocalSource('fflate')).toBe(false);
    });

    it('detects scoped packages with subpaths as non-local', () => {
      expect(isLocalSource('@studiometa/js-toolkit/utils')).toBe(false);
    });
  });

  describe('importMapKeys', () => {
    it('defaults to empty array when not provided', () => {
      const p = new PlaygroundDependenciesPlugin([], '/tmp');
      expect(p.importMapKeys).toEqual([]);
    });

    it('stores import map keys from constructor', () => {
      const keys = ['@studiometa/js-toolkit', 'deepmerge', 'morphdom', '@studiometa/ui'];
      const p = new PlaygroundDependenciesPlugin([], '/tmp', undefined, keys);
      expect(p.importMapKeys).toEqual(keys);
    });

    it('accepts empty importMapKeys', () => {
      const p = new PlaygroundDependenciesPlugin([], '/tmp', undefined, []);
      expect(p.importMapKeys).toEqual([]);
    });

    it('preserves publicPath when importMapKeys are provided', () => {
      const p = new PlaygroundDependenciesPlugin([], '/tmp', '/play', ['deepmerge']);
      expect(p.publicPath).toBe('/play');
      expect(p.importMapKeys).toEqual(['deepmerge']);
    });
  });

  describe('importMap', () => {
    it('defaults to undefined when not provided', () => {
      const p = new PlaygroundDependenciesPlugin([], '/tmp');
      expect(p.importMap).toBeUndefined();
    });

    it('stores import map reference from constructor', () => {
      const importMap = { deepmerge: 'https://esm.sh/deepmerge' };
      const p = new PlaygroundDependenciesPlugin([], '/tmp', undefined, [], importMap);
      expect(p.importMap).toBe(importMap);
    });
  });

  describe('import map publicPath prefixing', () => {
    /**
     * Helper that simulates the plugin's `apply()` import map mutation
     * by calling the `thisCompilation` hook callback directly.
     */
    function applyAndGetImportMap(
      deps: ResolvedDependency[],
      importMap: Record<string, string>,
      publicPath?: string,
      webpackPublicPath?: string,
    ): Record<string, string> {
      const p = new PlaygroundDependenciesPlugin(deps, '/tmp', publicPath, [], importMap);

      // Minimal fake compiler that captures the thisCompilation tap callback
      let compilationCallback: ((compilation: unknown) => void) | undefined;
      const fakeCompiler = {
        options: { output: { publicPath: webpackPublicPath ?? 'auto' } },
        webpack: { Compilation: { PROCESS_ASSETS_STAGE_ADDITIONAL: 0 } },
        hooks: {
          thisCompilation: {
            tap(_name: string, cb: (compilation: unknown) => void) {
              compilationCallback = cb;
            },
          },
        },
      };

      p.apply(fakeCompiler as any);

      // Trigger the compilation hook with a minimal fake compilation
      compilationCallback?.({
        hooks: {
          processAssets: { tapAsync() {} },
        },
      });

      return importMap;
    }

    it('prefixes self-hosted entries with explicit publicPath', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: '@studiometa/ui',
          importMapValue: '/static/deps/@studiometa/ui/index.js',
          type: 'bundle',
          source: '../ui/**/*.ts',
        },
      ];
      const importMap = {
        '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
        deepmerge: 'https://esm.sh/deepmerge',
      };

      applyAndGetImportMap(deps, importMap, '/play');

      expect(importMap['@studiometa/ui']).toBe('/play/static/deps/@studiometa/ui/index.js');
      expect(importMap.deepmerge).toBe('https://esm.sh/deepmerge');
    });

    it('infers publicPath from webpack output.publicPath', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'demo-lib',
          importMapValue: '/static/deps/demo-lib/index.js',
          type: 'bundle',
          source: './lib/index.ts',
        },
      ];
      const importMap = { 'demo-lib': '/static/deps/demo-lib/index.js' };

      applyAndGetImportMap(deps, importMap, undefined, '/app/');

      expect(importMap['demo-lib']).toBe('/app/static/deps/demo-lib/index.js');
    });

    it('does not prefix when no publicPath is resolved', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'demo-lib',
          importMapValue: '/static/deps/demo-lib/index.js',
          type: 'bundle',
          source: './lib/index.ts',
        },
      ];
      const importMap = { 'demo-lib': '/static/deps/demo-lib/index.js' };

      applyAndGetImportMap(deps, importMap);

      expect(importMap['demo-lib']).toBe('/static/deps/demo-lib/index.js');
    });

    it('does not prefix http URLs', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'deepmerge',
          importMapValue: 'https://esm.sh/deepmerge',
          type: 'esm-sh',
        },
      ];
      const importMap = { deepmerge: 'https://esm.sh/deepmerge' };

      applyAndGetImportMap(deps, importMap, '/play');

      expect(importMap.deepmerge).toBe('https://esm.sh/deepmerge');
    });

    it('does nothing when no importMap reference is provided', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'demo-lib',
          importMapValue: '/static/deps/demo-lib/index.js',
          type: 'bundle',
          source: './lib/index.ts',
        },
      ];
      const p = new PlaygroundDependenciesPlugin(deps, '/tmp', '/play');

      let compilationCallback: ((compilation: unknown) => void) | undefined;
      const fakeCompiler = {
        options: { output: { publicPath: 'auto' } },
        webpack: { Compilation: { PROCESS_ASSETS_STAGE_ADDITIONAL: 0 } },
        hooks: {
          thisCompilation: {
            tap(_name: string, cb: (compilation: unknown) => void) {
              compilationCallback = cb;
            },
          },
        },
      };

      p.apply(fakeCompiler as any);

      // Should not throw
      compilationCallback?.({
        hooks: {
          processAssets: { tapAsync() {} },
        },
      });

      expect(p.importMap).toBeUndefined();
    });
  });
});
