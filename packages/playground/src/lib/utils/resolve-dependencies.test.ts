import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveDependencies } from './resolve-dependencies.js';

describe('resolveDependencies', () => {
  it('resolves plain string to esm.sh URL', () => {
    const result = resolveDependencies(['deepmerge']);
    expect(result.importMap).toEqual({
      deepmerge: 'https://esm.sh/deepmerge',
    });
    expect(result.selfHosted).toEqual([]);
  });

  it('resolves scoped package to esm.sh URL', () => {
    const result = resolveDependencies(['@motionone/easing']);
    expect(result.importMap).toEqual({
      '@motionone/easing': 'https://esm.sh/@motionone/easing',
    });
  });

  it('uses explicit version', () => {
    const result = resolveDependencies([{ specifier: 'deepmerge', version: '5.1.0' }]);
    expect(result.importMap).toEqual({
      deepmerge: 'https://esm.sh/deepmerge@5.1.0',
    });
  });

  it('infers version from package.json', () => {
    const tmpDir = join('/tmp', 'test-resolve-deps-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
    const pkgPath = join(tmpDir, 'package.json');
    writeFileSync(
      pkgPath,
      JSON.stringify({
        dependencies: { deepmerge: '^5.1.0' },
      }),
    );

    try {
      const result = resolveDependencies(['deepmerge'], pkgPath);
      expect(result.importMap).toEqual({
        deepmerge: 'https://esm.sh/deepmerge@5.1.0',
      });
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });

  it('resolves bundle dependency for npm package', () => {
    const result = resolveDependencies([{ specifier: 'morphdom', source: 'morphdom' }]);
    expect(result.importMap).toEqual({
      morphdom: '/static/deps/morphdom/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0]).toMatchObject({
      specifier: 'morphdom',
      type: 'bundle',
      source: 'morphdom',
    });
  });

  it('resolves bundle dependency for local TypeScript source', () => {
    const result = resolveDependencies([{ specifier: '@studiometa/ui', source: '../ui/**/*.ts' }]);
    expect(result.importMap).toEqual({
      '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0]).toMatchObject({
      specifier: '@studiometa/ui',
      type: 'bundle',
      source: '../ui/**/*.ts',
    });
  });

  it('passes entry field for bundle dependencies', () => {
    const result = resolveDependencies([
      {
        specifier: '@studiometa/ui',
        source: '../ui/**/*.ts',
        entry: '../ui/index.ts',
      },
    ]);
    expect(result.selfHosted[0].entry).toBe('../ui/index.ts');
  });

  it('handles mixed dependencies', () => {
    const result = resolveDependencies([
      'deepmerge',
      { specifier: '@studiometa/js-toolkit', source: '@studiometa/js-toolkit' },
      { specifier: 'morphdom', source: 'morphdom' },
      { specifier: 'demo-lib', source: './lib/**/*.ts', entry: './lib/index.ts' },
    ]);
    expect(Object.keys(result.importMap)).toHaveLength(4);
    expect(result.selfHosted).toHaveLength(3);
    expect(result.selfHosted.map((d) => d.type)).toEqual(['bundle', 'bundle', 'bundle']);
  });

  it('returns empty results for empty input', () => {
    const result = resolveDependencies([]);
    expect(result.importMap).toEqual({});
    expect(result.selfHosted).toEqual([]);
  });

  describe('publicPath support', () => {
    it('prepends publicPath to self-hosted dependency paths', () => {
      const result = resolveDependencies(
        [{ specifier: 'morphdom', source: 'morphdom' }],
        undefined,
        '/play',
      );
      expect(result.importMap).toEqual({
        morphdom: '/play/static/deps/morphdom/index.js',
      });
      expect(result.selfHosted[0].importMapValue).toBe('/play/static/deps/morphdom/index.js');
    });

    it('normalizes publicPath with trailing slash', () => {
      const result = resolveDependencies(
        [{ specifier: 'morphdom', source: 'morphdom' }],
        undefined,
        '/play/',
      );
      expect(result.importMap.morphdom).toBe('/play/static/deps/morphdom/index.js');
    });

    it('normalizes publicPath without leading slash', () => {
      const result = resolveDependencies(
        [{ specifier: 'morphdom', source: 'morphdom' }],
        undefined,
        'play',
      );
      expect(result.importMap.morphdom).toBe('/play/static/deps/morphdom/index.js');
    });

    it('does not affect esm.sh URLs', () => {
      const result = resolveDependencies(['deepmerge'], undefined, '/play');
      expect(result.importMap.deepmerge).toBe('https://esm.sh/deepmerge');
    });

    it('treats "/" publicPath as no prefix', () => {
      const result = resolveDependencies(
        [{ specifier: 'morphdom', source: 'morphdom' }],
        undefined,
        '/',
      );
      expect(result.importMap.morphdom).toBe('/static/deps/morphdom/index.js');
    });

    it('treats empty publicPath as no prefix', () => {
      const result = resolveDependencies(
        [{ specifier: 'morphdom', source: 'morphdom' }],
        undefined,
        '',
      );
      expect(result.importMap.morphdom).toBe('/static/deps/morphdom/index.js');
    });
  });
});
