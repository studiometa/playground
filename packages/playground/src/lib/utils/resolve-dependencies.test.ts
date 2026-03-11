import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { resolveDependencies, getPackageName, getSubpath } from './resolve-dependencies.js';

describe('getPackageName', () => {
  it('returns unscoped package name', () => {
    expect(getPackageName('deepmerge')).toBe('deepmerge');
  });

  it('returns scoped package name', () => {
    expect(getPackageName('@motionone/easing')).toBe('@motionone/easing');
  });

  it('strips subpath from unscoped package', () => {
    expect(getPackageName('lodash/merge')).toBe('lodash');
  });

  it('strips subpath from scoped package', () => {
    expect(getPackageName('@studiometa/js-toolkit/utils')).toBe('@studiometa/js-toolkit');
  });

  it('strips deep subpath from scoped package', () => {
    expect(getPackageName('@studiometa/js-toolkit/utils/css')).toBe('@studiometa/js-toolkit');
  });
});

describe('getSubpath', () => {
  it('returns undefined for plain package', () => {
    expect(getSubpath('deepmerge')).toBeUndefined();
  });

  it('returns undefined for scoped package without subpath', () => {
    expect(getSubpath('@motionone/easing')).toBeUndefined();
  });

  it('returns subpath for unscoped package', () => {
    expect(getSubpath('lodash/merge')).toBe('/merge');
  });

  it('returns subpath for scoped package', () => {
    expect(getSubpath('@studiometa/js-toolkit/utils')).toBe('/utils');
  });

  it('returns deep subpath for scoped package', () => {
    expect(getSubpath('@studiometa/js-toolkit/utils/css')).toBe('/utils/css');
  });
});

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

  describe('subpath imports', () => {
    it('resolves scoped package with subpath to correct esm.sh URL', () => {
      const result = resolveDependencies(['@studiometa/js-toolkit/utils']);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit/utils': 'https://esm.sh/@studiometa/js-toolkit/utils',
      });
    });

    it('resolves scoped package with subpath and version', () => {
      const result = resolveDependencies([
        { specifier: '@studiometa/js-toolkit/utils', version: '3.4.3' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit/utils': 'https://esm.sh/@studiometa/js-toolkit@3.4.3/utils',
      });
    });

    it('infers version from package.json for subpath imports', () => {
      const tmpDir = join('/tmp', 'test-resolve-deps-subpath-' + Date.now());
      mkdirSync(tmpDir, { recursive: true });
      const pkgPath = join(tmpDir, 'package.json');
      writeFileSync(
        pkgPath,
        JSON.stringify({
          dependencies: { '@studiometa/js-toolkit': '^3.4.3' },
        }),
      );

      try {
        const result = resolveDependencies(['@studiometa/js-toolkit/utils'], pkgPath);
        expect(result.importMap).toEqual({
          '@studiometa/js-toolkit/utils': 'https://esm.sh/@studiometa/js-toolkit@3.4.3/utils',
        });
      } finally {
        rmSync(tmpDir, { recursive: true });
      }
    });

    it('resolves unscoped package with subpath', () => {
      const result = resolveDependencies([{ specifier: 'lodash/merge', version: '4.17.21' }]);
      expect(result.importMap).toEqual({
        'lodash/merge': 'https://esm.sh/lodash@4.17.21/merge',
      });
    });

    it('resolves deep subpath correctly', () => {
      const result = resolveDependencies([
        { specifier: '@studiometa/js-toolkit/utils/css', version: '3.4.3' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit/utils/css': 'https://esm.sh/@studiometa/js-toolkit@3.4.3/utils/css',
      });
    });
  });

  describe('bare npm source rejection', () => {
    it('warns and falls back to esm.sh for bare npm source', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = resolveDependencies([{ specifier: 'morphdom', source: 'morphdom' }]);
      expect(result.importMap).toEqual({
        morphdom: 'https://esm.sh/morphdom',
      });
      expect(result.selfHosted).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('bare npm package name as source'));

      warn.mockRestore();
    });

    it('warns and falls back for scoped npm source', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = resolveDependencies([
        { specifier: '@studiometa/js-toolkit', source: '@studiometa/js-toolkit' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit': 'https://esm.sh/@studiometa/js-toolkit',
      });
      expect(result.selfHosted).toEqual([]);

      warn.mockRestore();
    });

    it('uses inferred version when falling back from bare npm source', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const tmpDir = join('/tmp', 'test-resolve-deps-npm-' + Date.now());
      mkdirSync(tmpDir, { recursive: true });
      const pkgPath = join(tmpDir, 'package.json');
      writeFileSync(
        pkgPath,
        JSON.stringify({
          dependencies: { morphdom: '^2.7.0' },
        }),
      );

      try {
        const result = resolveDependencies(
          [{ specifier: 'morphdom', source: 'morphdom' }],
          pkgPath,
        );
        expect(result.importMap).toEqual({
          morphdom: 'https://esm.sh/morphdom@2.7.0',
        });
        expect(result.selfHosted).toEqual([]);
      } finally {
        rmSync(tmpDir, { recursive: true });
        warn.mockRestore();
      }
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

  it('resolves bundle dependency for relative path source', () => {
    const result = resolveDependencies([{ specifier: 'demo-lib', source: './lib/index.ts' }]);
    expect(result.importMap).toEqual({
      'demo-lib': '/static/deps/demo-lib/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0]).toMatchObject({
      specifier: 'demo-lib',
      type: 'bundle',
      source: './lib/index.ts',
    });
  });

  it('resolves bundle dependency for absolute path source', () => {
    const result = resolveDependencies([
      { specifier: 'demo-lib', source: '/home/user/lib/index.ts' },
    ]);
    expect(result.importMap).toEqual({
      'demo-lib': '/static/deps/demo-lib/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = resolveDependencies([
      'deepmerge',
      '@studiometa/js-toolkit/utils',
      { specifier: 'morphdom', source: 'morphdom' }, // bare npm → falls back to esm.sh
      { specifier: 'demo-lib', source: './lib/**/*.ts', entry: './lib/index.ts' },
    ]);
    expect(Object.keys(result.importMap)).toHaveLength(4);
    // Only local source becomes self-hosted; morphdom falls back to esm.sh
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0].specifier).toBe('demo-lib');

    warn.mockRestore();
  });

  it('returns empty results for empty input', () => {
    const result = resolveDependencies([]);
    expect(result.importMap).toEqual({});
    expect(result.selfHosted).toEqual([]);
  });

  describe('publicPath support', () => {
    it('prepends publicPath to self-hosted dependency paths', () => {
      const result = resolveDependencies(
        [{ specifier: '@studiometa/ui', source: '../ui/**/*.ts' }],
        undefined,
        '/play',
      );
      expect(result.importMap).toEqual({
        '@studiometa/ui': '/play/static/deps/@studiometa/ui/index.js',
      });
      expect(result.selfHosted[0].importMapValue).toBe('/play/static/deps/@studiometa/ui/index.js');
    });

    it('normalizes publicPath with trailing slash', () => {
      const result = resolveDependencies(
        [{ specifier: '@studiometa/ui', source: '../ui/**/*.ts' }],
        undefined,
        '/play/',
      );
      expect(result.importMap['@studiometa/ui']).toBe('/play/static/deps/@studiometa/ui/index.js');
    });

    it('normalizes publicPath without leading slash', () => {
      const result = resolveDependencies(
        [{ specifier: '@studiometa/ui', source: '../ui/**/*.ts' }],
        undefined,
        'play',
      );
      expect(result.importMap['@studiometa/ui']).toBe('/play/static/deps/@studiometa/ui/index.js');
    });

    it('does not affect esm.sh URLs', () => {
      const result = resolveDependencies(['deepmerge'], undefined, '/play');
      expect(result.importMap.deepmerge).toBe('https://esm.sh/deepmerge');
    });

    it('treats "/" publicPath as no prefix', () => {
      const result = resolveDependencies(
        [{ specifier: '@studiometa/ui', source: '../ui/**/*.ts' }],
        undefined,
        '/',
      );
      expect(result.importMap['@studiometa/ui']).toBe('/static/deps/@studiometa/ui/index.js');
    });

    it('treats empty publicPath as no prefix', () => {
      const result = resolveDependencies(
        [{ specifier: '@studiometa/ui', source: '../ui/**/*.ts' }],
        undefined,
        '',
      );
      expect(result.importMap['@studiometa/ui']).toBe('/static/deps/@studiometa/ui/index.js');
    });
  });
});
