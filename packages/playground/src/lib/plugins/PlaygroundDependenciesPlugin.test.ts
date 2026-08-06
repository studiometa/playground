import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
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
        fileDependencies: new Set(),
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

    it('prefixes every subpath of a multi-entry dependency', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: '@studiometa/ui',
          importMapValue: '/static/deps/@studiometa/ui/index.js',
          type: 'bundle',
          entries: [
            {
              subpath: '.',
              specifier: '@studiometa/ui',
              name: 'index',
              source: '../ui/index.ts',
              importMapValue: '/static/deps/@studiometa/ui/index.js',
            },
            {
              subpath: './manifest',
              specifier: '@studiometa/ui/manifest',
              name: 'manifest',
              source: '../ui/manifest.ts',
              importMapValue: '/static/deps/@studiometa/ui/manifest.js',
            },
          ],
        },
      ];
      const importMap = {
        '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
        '@studiometa/ui/manifest': '/static/deps/@studiometa/ui/manifest.js',
      };

      applyAndGetImportMap(deps, importMap, '/play');

      expect(importMap['@studiometa/ui']).toBe('/play/static/deps/@studiometa/ui/index.js');
      expect(importMap['@studiometa/ui/manifest']).toBe(
        '/play/static/deps/@studiometa/ui/manifest.js',
      );
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
        fileDependencies: new Set(),
        hooks: {
          processAssets: { tapAsync() {} },
        },
      });

      expect(p.importMap).toBeUndefined();
    });
  });

  describe('file watching for local sources', () => {
    function applyAndGetFileDependencies(
      deps: ResolvedDependency[],
      configDir: string,
    ): Set<string> {
      const p = new PlaygroundDependenciesPlugin(deps, configDir);
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

      const fileDependencies = new Set<string>();
      compilationCallback?.({
        fileDependencies,
        hooks: {
          processAssets: { tapAsync() {} },
        },
      });

      return fileDependencies;
    }

    it('adds local source files to compilation fileDependencies', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'my-lib',
          importMapValue: '/static/deps/my-lib/index.js',
          type: 'bundle',
          source: './src/index.ts',
        },
      ];

      const fileDeps = applyAndGetFileDependencies(deps, '/project');
      expect(fileDeps.size).toBe(1);
      expect([...fileDeps][0]).toContain('src/index.ts');
    });

    it('does not add esm-sh dependencies to fileDependencies', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'deepmerge',
          importMapValue: 'https://esm.sh/deepmerge',
          type: 'esm-sh',
        },
      ];

      const fileDeps = applyAndGetFileDependencies(deps, '/project');
      expect(fileDeps.size).toBe(0);
    });

    it('does not add bundle deps without source to fileDependencies', () => {
      const deps: ResolvedDependency[] = [
        {
          specifier: 'my-lib',
          importMapValue: '/static/deps/my-lib/index.js',
          type: 'bundle',
        },
      ];

      const fileDeps = applyAndGetFileDependencies(deps, '/project');
      expect(fileDeps.size).toBe(0);
    });
  });

  describe('emitBundleChunks', () => {
    interface FakeChunk {
      fileName: string;
      code?: string;
      isEntry?: boolean;
    }

    /**
     * Call the private `emitBundleChunks` method with a fake compilation that
     * records every emitted asset, mirroring how `processBundle` feeds tsdown
     * build results into webpack. Returns a `path -> code` map of emitted
     * assets, throwing if the same path is emitted twice (the regression the
     * multi-chunk fix guards against).
     */
    function emitAndCollect(chunks: FakeChunk[], outputBase: string): Map<string, string> {
      const emitted = new Map<string, string>();
      const fakeCompilation = {
        compiler: {
          webpack: {
            sources: {
              RawSource: class {
                value: string;
                constructor(value: string) {
                  this.value = value;
                }
              },
            },
          },
        },
        emitAsset(assetPath: string, source: { value: string }) {
          if (emitted.has(assetPath)) {
            throw new Error(`Conflict: multiple assets emit to the same filename ${assetPath}`);
          }
          emitted.set(assetPath, source.value);
        },
      };

      (plugin as any).emitBundleChunks(fakeCompilation, [{ chunks }], outputBase);

      return emitted;
    }

    it('emits a single-chunk build as index.js + index.d.ts (back-compat)', () => {
      const emitted = emitAndCollect(
        [
          { fileName: 'entry.js', code: 'export const a = 1;', isEntry: true },
          { fileName: 'entry.d.ts', code: 'export declare const a: number;', isEntry: true },
        ],
        'static/deps/demo-lib',
      );

      expect([...emitted.keys()].sort()).toEqual([
        'static/deps/demo-lib/index.d.ts',
        'static/deps/demo-lib/index.js',
      ]);
      expect(emitted.get('static/deps/demo-lib/index.js')).toBe('export const a = 1;');
      expect(emitted.get('static/deps/demo-lib/index.d.ts')).toBe(
        'export declare const a: number;',
      );
    });

    it('pins the entry to index.js/index.d.ts and keeps sibling chunk names on a code-split build', () => {
      const emitted = emitAndCollect(
        [
          {
            fileName: 'entry.js',
            code: "await import('./child-CGcNIa1l.js');",
            isEntry: true,
          },
          { fileName: 'entry.d.ts', code: 'export declare const root: string;', isEntry: true },
          { fileName: 'child-CGcNIa1l.js', code: 'export const child = 1;', isEntry: false },
        ],
        'static/deps/@studiometa/ui-mapbox',
      );

      const paths = [...emitted.keys()].sort();

      // Exactly one entry index.js and one entry index.d.ts.
      expect(paths.filter((p) => p.endsWith('/index.js'))).toEqual([
        'static/deps/@studiometa/ui-mapbox/index.js',
      ]);
      expect(paths.filter((p) => p.endsWith('/index.d.ts'))).toEqual([
        'static/deps/@studiometa/ui-mapbox/index.d.ts',
      ]);

      // The non-entry chunk keeps its own hashed filename, emitted as a sibling.
      expect(emitted.has('static/deps/@studiometa/ui-mapbox/child-CGcNIa1l.js')).toBe(true);

      // Three distinct paths — no two chunks collapse onto the same filename.
      expect(paths.length).toBe(3);
    });

    it('does not collide when multiple non-entry chunks are emitted', () => {
      // The previous implementation renamed every chunk to index.js, so a
      // second non-entry chunk threw the webpack seal-time "Conflict" error.
      expect(() =>
        emitAndCollect(
          [
            { fileName: 'entry.js', code: 'entry', isEntry: true },
            { fileName: 'entry.d.ts', code: 'entry types', isEntry: true },
            { fileName: 'child-aaaaaaaa.js', code: 'child a', isEntry: false },
            { fileName: 'child-bbbbbbbb.js', code: 'child b', isEntry: false },
          ],
          'static/deps/multi',
        ),
      ).not.toThrow();
    });

    it('emits non-entry .d.ts chunks under their own name', () => {
      const emitted = emitAndCollect(
        [
          { fileName: 'entry.js', code: 'entry', isEntry: true },
          { fileName: 'entry.d.ts', code: 'entry types', isEntry: true },
          { fileName: 'child-aaaaaaaa.js', code: 'child', isEntry: false },
          { fileName: 'child-aaaaaaaa.d.ts', code: 'child types', isEntry: false },
        ],
        'static/deps/multi',
      );

      expect(emitted.has('static/deps/multi/child-aaaaaaaa.d.ts')).toBe(true);
      // The single entry dts is still pinned to index.d.ts.
      expect(emitted.get('static/deps/multi/index.d.ts')).toBe('entry types');
    });

    it('keeps the import map / _headers pointing at .../index.js and .../index.d.ts', () => {
      // The import map value and the _headers x-typescript-types entry are both
      // derived from the specifier as `.../index.js` and `.../index.d.ts`. The
      // emit path must keep those exact entry filenames stable even when the
      // dependency code-splits.
      const specifier = '@studiometa/ui-mapbox';
      const outputBase = `static/deps/${specifier}`;
      const emitted = emitAndCollect(
        [
          { fileName: 'entry.js', code: 'entry', isEntry: true },
          { fileName: 'entry.d.ts', code: 'types', isEntry: true },
          { fileName: 'child-CGcNIa1l.js', code: 'child', isEntry: false },
        ],
        outputBase,
      );

      const importMapValue = `/static/deps/${specifier}/index.js`;
      const headersJsPath = `/static/deps/${specifier}/index.js`;
      const headersDtsPath = `/static/deps/${specifier}/index.d.ts`;

      expect(emitted.has(importMapValue.replace(/^\//, ''))).toBe(true);
      expect(emitted.has(headersJsPath.replace(/^\//, ''))).toBe(true);
      expect(emitted.has(headersDtsPath.replace(/^\//, ''))).toBe(true);
    });
  });

  describe('multi-entry singleton (real tsdown build)', () => {
    /**
     * Build a fake compilation that records every emitted asset into a
     * `path -> code` map, throwing on a duplicate path (mirrors webpack's
     * seal-time conflict guard).
     */
    function makeFakeCompilation(emitted: Map<string, string>) {
      return {
        compiler: {
          webpack: {
            sources: {
              RawSource: class {
                value: string;
                constructor(value: string) {
                  this.value = value;
                }
                source() {
                  return this.value;
                }
              },
            },
          },
        },
        emitAsset(assetPath: string, source: { value: string }) {
          if (emitted.has(assetPath)) {
            throw new Error(`Conflict: multiple assets emit to the same filename ${assetPath}`);
          }
          emitted.set(assetPath, source.value);
        },
      };
    }

    it('emits shared modules ONCE and references the same chunk from every entry', async () => {
      // A workspace package with a barrel (static import) and a manifest
      // (dynamic import) that both use the same shared module — the exact
      // singleton hazard multi-entry builds are meant to eliminate.
      const dir = mkdtempSync(join(tmpdir(), 'playground-multi-entry-'));
      try {
        mkdirSync(join(dir, 'src'), { recursive: true });
        writeFileSync(
          join(dir, 'src/shared.ts'),
          // A distinctive marker proves where the class body actually lives.
          'export class Shared {\n  greet() {\n    return "SINGLETON_MARKER";\n  }\n}\n',
        );
        writeFileSync(
          join(dir, 'src/index.ts'),
          "import { Shared } from './shared.js';\nexport { Shared };\nexport const fromBarrel = new Shared();\n",
        );
        writeFileSync(
          join(dir, 'src/manifest.ts'),
          "export async function load() {\n  const { Shared } = await import('./shared.js');\n  return new Shared();\n}\n",
        );

        const dep: ResolvedDependency = {
          specifier: '@test/pkg',
          importMapValue: '/static/deps/@test/pkg/index.js',
          type: 'bundle',
          entries: [
            {
              subpath: '.',
              specifier: '@test/pkg',
              name: 'index',
              source: './src/index.ts',
              importMapValue: '/static/deps/@test/pkg/index.js',
            },
            {
              subpath: './manifest',
              specifier: '@test/pkg/manifest',
              name: 'manifest',
              source: './src/manifest.ts',
              importMapValue: '/static/deps/@test/pkg/manifest.js',
            },
          ],
        };

        const p = new PlaygroundDependenciesPlugin([dep], dir);
        const emitted = new Map<string, string>();
        await (p as any).processMultiEntryBundle(makeFakeCompilation(emitted), dep);

        const base = 'static/deps/@test/pkg';
        const indexPath = posix.join(base, 'index.js');
        const manifestPath = posix.join(base, 'manifest.js');

        // Both named entries are emitted at their subpath filenames.
        expect(emitted.has(indexPath)).toBe(true);
        expect(emitted.has(manifestPath)).toBe(true);

        // Exactly ONE shared JS chunk (not a per-entry duplicate).
        const sharedJsChunks = [...emitted.keys()].filter(
          (path) =>
            path.startsWith(base) &&
            path.endsWith('.js') &&
            path !== indexPath &&
            path !== manifestPath,
        );
        expect(sharedJsChunks).toHaveLength(1);
        const sharedChunkPath = sharedJsChunks[0];
        const sharedChunkName = sharedChunkPath.slice(base.length + 1);

        // The class body lives in the shared chunk, NOT inlined in either entry.
        expect(emitted.get(sharedChunkPath)).toContain('SINGLETON_MARKER');
        expect(emitted.get(indexPath)).not.toContain('SINGLETON_MARKER');
        expect(emitted.get(manifestPath)).not.toContain('SINGLETON_MARKER');

        // Both entries import that same shared chunk as a relative sibling, so
        // every consumer resolves the one-and-only module instance.
        expect(emitted.get(indexPath)).toContain(`./${sharedChunkName}`);
        expect(emitted.get(manifestPath)).toContain(`./${sharedChunkName}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }, 60_000);
  });
});
