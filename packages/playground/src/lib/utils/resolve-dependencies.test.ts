import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, vi } from 'vitest';
import {
  resolveDependencies,
  getPackageName,
  getSubpath,
  serializeEsmShOptions,
  extractSubpathKeys,
  resolveExportTarget,
} from './resolve-dependencies.js';

describe('serializeEsmShOptions', () => {
  it('returns empty string for empty options', () => {
    expect(serializeEsmShOptions({})).toBe('');
  });

  it('serializes bundle=false', () => {
    expect(serializeEsmShOptions({ bundle: false })).toBe('bundle=false');
  });

  it('does not serialize bundle=true', () => {
    expect(serializeEsmShOptions({ bundle: true })).toBe('');
  });

  it('serializes boolean flags', () => {
    expect(serializeEsmShOptions({ standalone: true })).toBe('standalone');
    expect(serializeEsmShOptions({ raw: true })).toBe('raw');
    expect(serializeEsmShOptions({ dev: true })).toBe('dev');
    expect(serializeEsmShOptions({ noDts: true })).toBe('no-dts');
    expect(serializeEsmShOptions({ keepNames: true })).toBe('keep-names');
    expect(serializeEsmShOptions({ ignoreAnnotations: true })).toBe('ignore-annotations');
  });

  it('serializes target', () => {
    expect(serializeEsmShOptions({ target: 'es2022' })).toBe('target=es2022');
  });

  it('serializes array options', () => {
    expect(serializeEsmShOptions({ exports: ['foo', 'bar'] })).toBe('exports=foo,bar');
    expect(serializeEsmShOptions({ deps: ['react@19', 'react-dom@19'] })).toBe(
      'deps=react@19,react-dom@19',
    );
    expect(serializeEsmShOptions({ conditions: ['custom1', 'custom2'] })).toBe(
      'conditions=custom1,custom2',
    );
  });

  it('serializes alias', () => {
    expect(serializeEsmShOptions({ alias: { react: 'preact/compat' } })).toBe(
      'alias=react:preact/compat',
    );
  });

  it('combines multiple options', () => {
    expect(serializeEsmShOptions({ dev: true, bundle: false, target: 'es2022' })).toBe(
      'bundle=false&dev&target=es2022',
    );
  });

  it('ignores external (handled separately)', () => {
    expect(serializeEsmShOptions({ external: true })).toBe('');
  });

  it('skips empty alias object', () => {
    expect(serializeEsmShOptions({ alias: {} })).toBe('');
  });
});

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

describe('extractSubpathKeys', () => {
  it('returns ["."] for a string exports value', () => {
    expect(extractSubpathKeys('./index.js')).toEqual(['.']);
  });

  it('returns ["."] for an array exports value', () => {
    expect(extractSubpathKeys(['./index.js'])).toEqual(['.']);
  });

  it('returns ["."] for a conditions-only object (no dotted keys)', () => {
    expect(extractSubpathKeys({ import: './index.js', default: './index.js' })).toEqual(['.']);
  });

  it('returns dotted keys from a subpath exports object', () => {
    expect(extractSubpathKeys({ '.': './index.js', './utils': './utils/index.js' })).toEqual([
      '.',
      './utils',
    ]);
  });

  it('excludes ./package.json and wildcard keys', () => {
    expect(
      extractSubpathKeys({
        '.': './index.js',
        './utils': './utils/index.js',
        './package.json': './package.json',
        './*': './*.js',
      }),
    ).toEqual(['.', './utils']);
  });

  it('returns ["."] for undefined exports', () => {
    expect(extractSubpathKeys(undefined)).toEqual(['.']);
  });
});

describe('resolveExportTarget', () => {
  it('returns a string value directly', () => {
    expect(resolveExportTarget('./index.js')).toBe('./index.js');
  });

  it('resolves import over default', () => {
    expect(resolveExportTarget({ import: './a.js', default: './b.js' })).toBe('./a.js');
  });

  it('falls back to default when import is missing', () => {
    expect(resolveExportTarget({ default: './b.js' })).toBe('./b.js');
  });

  it('resolves a nested conditions object one level deep', () => {
    expect(resolveExportTarget({ import: { default: './nested.js' } })).toBe('./nested.js');
  });

  it('returns undefined for a non-resolvable value', () => {
    expect(resolveExportTarget(undefined)).toBeUndefined();
    expect(resolveExportTarget(42)).toBeUndefined();
  });
});

describe('resolveDependencies', () => {
  it('resolves plain string to esm.sh URL', async () => {
    const result = await resolveDependencies(['deepmerge']);
    expect(result.importMap).toEqual({
      deepmerge: 'https://esm.sh/deepmerge',
    });
    expect(result.selfHosted).toEqual([]);
  });

  it('resolves scoped package to esm.sh URL', async () => {
    const result = await resolveDependencies(['@motionone/easing']);
    expect(result.importMap).toEqual({
      '@motionone/easing': 'https://esm.sh/@motionone/easing',
    });
  });

  it('uses explicit version', async () => {
    const result = await resolveDependencies([{ specifier: 'deepmerge', version: '5.1.0' }]);
    expect(result.importMap).toEqual({
      deepmerge: 'https://esm.sh/deepmerge@5.1.0',
    });
  });

  it('infers version from package.json', async () => {
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
      const result = await resolveDependencies(['deepmerge'], pkgPath);
      expect(result.importMap).toEqual({
        deepmerge: 'https://esm.sh/deepmerge@5.1.0',
      });
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });

  describe('subpath imports', () => {
    it('resolves scoped package with subpath to correct esm.sh URL', async () => {
      const result = await resolveDependencies(['@studiometa/js-toolkit/utils']);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit/utils': 'https://esm.sh/@studiometa/js-toolkit/utils',
      });
    });

    it('resolves scoped package with subpath and version', async () => {
      const result = await resolveDependencies([
        { specifier: '@studiometa/js-toolkit/utils', version: '3.4.3' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit/utils': 'https://esm.sh/@studiometa/js-toolkit@3.4.3/utils',
      });
    });

    it('infers version from package.json for subpath imports', async () => {
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
        const result = await resolveDependencies(['@studiometa/js-toolkit/utils'], pkgPath);
        expect(result.importMap).toEqual({
          '@studiometa/js-toolkit/utils': 'https://esm.sh/@studiometa/js-toolkit@3.4.3/utils',
        });
      } finally {
        rmSync(tmpDir, { recursive: true });
      }
    });

    it('resolves unscoped package with subpath', async () => {
      const result = await resolveDependencies([{ specifier: 'lodash/merge', version: '4.17.21' }]);
      expect(result.importMap).toEqual({
        'lodash/merge': 'https://esm.sh/lodash@4.17.21/merge',
      });
    });

    it('resolves deep subpath correctly', async () => {
      const result = await resolveDependencies([
        { specifier: '@studiometa/js-toolkit/utils/css', version: '3.4.3' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit/utils/css': 'https://esm.sh/@studiometa/js-toolkit@3.4.3/utils/css',
      });
    });
  });

  describe('esm.sh subpath auto-detection', () => {
    it('adds each subpath from an explicit list without reading disk/network', async () => {
      const result = await resolveDependencies([
        { specifier: '@studiometa/js-toolkit', subpaths: ['./utils'] },
      ]);
      expect(result.importMap['@studiometa/js-toolkit']).toBe(
        'https://esm.sh/@studiometa/js-toolkit',
      );
      expect(result.importMap['@studiometa/js-toolkit/utils']).toBe(
        'https://esm.sh/@studiometa/js-toolkit/utils',
      );
    });

    it('detects all subpaths from node_modules exports when subpaths is true', async () => {
      // @studiometa/js-toolkit is installed with exports { ".", "./utils" }.
      const result = await resolveDependencies([
        { specifier: '@studiometa/js-toolkit', subpaths: true },
      ]);
      expect(result.importMap['@studiometa/js-toolkit']).toBe(
        'https://esm.sh/@studiometa/js-toolkit',
      );
      expect(result.importMap['@studiometa/js-toolkit/utils']).toBe(
        'https://esm.sh/@studiometa/js-toolkit/utils',
      );
    });

    it('falls back to the npm registry when the package is not on disk', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          json: async () => ({
            'dist-tags': { latest: '1.0.0' },
            versions: { '1.0.0': { exports: { '.': {}, './sub': {} } } },
          }),
        })),
      );

      try {
        const result = await resolveDependencies([
          { specifier: 'not-installed-pkg', subpaths: true },
        ]);
        expect(result.importMap['not-installed-pkg']).toBe('https://esm.sh/not-installed-pkg');
        expect(result.importMap['not-installed-pkg/sub']).toBe(
          'https://esm.sh/not-installed-pkg/sub',
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('bare npm source rejection', () => {
    it('warns and falls back to esm.sh for bare npm source', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await resolveDependencies([{ specifier: 'morphdom', source: 'morphdom' }]);
      expect(result.importMap).toEqual({
        morphdom: 'https://esm.sh/morphdom',
      });
      expect(result.selfHosted).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('bare npm package name as source'));

      warn.mockRestore();
    });

    it('warns and falls back for scoped npm source', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await resolveDependencies([
        { specifier: '@studiometa/js-toolkit', source: '@studiometa/js-toolkit' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit': 'https://esm.sh/@studiometa/js-toolkit',
      });
      expect(result.selfHosted).toEqual([]);

      warn.mockRestore();
    });

    it('uses inferred version when falling back from bare npm source', async () => {
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
        const result = await resolveDependencies(
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

  it('resolves bundle dependency for local TypeScript source', async () => {
    const result = await resolveDependencies([
      { specifier: '@studiometa/ui', source: '../ui/**/*.ts' },
    ]);
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

  it('resolves bundle dependency for relative path source', async () => {
    const result = await resolveDependencies([{ specifier: 'demo-lib', source: './lib/index.ts' }]);
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

  it('resolves bundle dependency for absolute path source', async () => {
    const result = await resolveDependencies([
      { specifier: 'demo-lib', source: '/home/user/lib/index.ts' },
    ]);
    expect(result.importMap).toEqual({
      'demo-lib': '/static/deps/demo-lib/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
  });

  it('passes entry field for bundle dependencies', async () => {
    const result = await resolveDependencies([
      {
        specifier: '@studiometa/ui',
        source: '../ui/**/*.ts',
        entry: '../ui/index.ts',
      },
    ]);
    expect(result.selfHosted[0].entry).toBe('../ui/index.ts');
  });

  it('handles mixed dependencies', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await resolveDependencies([
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

  it('returns empty results for empty input', async () => {
    const result = await resolveDependencies([]);
    expect(result.importMap).toEqual({});
    expect(result.selfHosted).toEqual([]);
  });

  describe('esmSh options', () => {
    it('appends ?bundle=false when bundle is false', async () => {
      const result = await resolveDependencies([
        { specifier: '@studiometa/js-toolkit', esmSh: { bundle: false } },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/js-toolkit': 'https://esm.sh/@studiometa/js-toolkit?bundle=false',
      });
    });

    it('uses * prefix for external option', async () => {
      const result = await resolveDependencies([
        { specifier: 'preact-render-to-string', version: '5.2.0', esmSh: { external: true } },
      ]);
      expect(result.importMap).toEqual({
        'preact-render-to-string': 'https://esm.sh/*preact-render-to-string@5.2.0',
      });
    });

    it('combines multiple options', async () => {
      const result = await resolveDependencies([
        {
          specifier: 'swr',
          version: '2.0.0',
          esmSh: { dev: true, deps: ['react@19'], target: 'es2022' },
        },
      ]);
      expect(result.importMap['swr']).toBe(
        'https://esm.sh/swr@2.0.0?dev&target=es2022&deps=react@19',
      );
    });

    it('infers version from package.json with esmSh options', async () => {
      const tmpDir = join('/tmp', 'test-resolve-deps-esmsh-' + Date.now());
      mkdirSync(tmpDir, { recursive: true });
      const pkgPath = join(tmpDir, 'package.json');
      writeFileSync(
        pkgPath,
        JSON.stringify({
          dependencies: { '@studiometa/js-toolkit': '^3.4.0' },
        }),
      );

      try {
        const result = await resolveDependencies(
          [{ specifier: '@studiometa/js-toolkit', esmSh: { bundle: false } }],
          pkgPath,
        );
        expect(result.importMap).toEqual({
          '@studiometa/js-toolkit': 'https://esm.sh/@studiometa/js-toolkit@3.4.0?bundle=false',
        });
      } finally {
        rmSync(tmpDir, { recursive: true });
      }
    });

    it('applies esmSh options on bare npm source fallback', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await resolveDependencies([
        { specifier: 'morphdom', source: 'morphdom', esmSh: { bundle: false } },
      ]);
      expect(result.importMap).toEqual({
        morphdom: 'https://esm.sh/morphdom?bundle=false',
      });

      warn.mockRestore();
    });

    it('applies external prefix on bare npm source fallback', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await resolveDependencies([
        { specifier: 'morphdom', source: 'morphdom', esmSh: { external: true } },
      ]);
      expect(result.importMap).toEqual({
        morphdom: 'https://esm.sh/*morphdom',
      });

      warn.mockRestore();
    });

    it('ignores esmSh options for self-hosted dependencies', async () => {
      const result = await resolveDependencies([
        { specifier: 'demo-lib', source: './lib/index.ts', esmSh: { bundle: false } as any },
      ]);
      expect(result.importMap).toEqual({
        'demo-lib': '/static/deps/demo-lib/index.js',
      });
    });
  });

  describe('multi-entry dependencies', () => {
    it('resolves one import-map entry per subpath and a single self-hosted build', async () => {
      const result = await resolveDependencies([
        {
          specifier: '@studiometa/ui',
          source: '../ui/**/*.ts',
          entries: {
            '.': '../ui/index.ts',
            './manifest': '../ui/manifest.ts',
          },
        },
      ]);

      // The barrel keeps the historical index.js filename.
      expect(result.importMap).toEqual({
        '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
        '@studiometa/ui/manifest': '/static/deps/@studiometa/ui/manifest.js',
      });

      // One self-hosted entry → one shared tsdown build.
      expect(result.selfHosted).toHaveLength(1);
      const dep = result.selfHosted[0];
      expect(dep).toMatchObject({
        specifier: '@studiometa/ui',
        type: 'bundle',
        source: '../ui/**/*.ts',
        importMapValue: '/static/deps/@studiometa/ui/index.js',
      });
      expect(dep.entries).toEqual([
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
      ]);
    });

    it('supports side-effect subpaths (e.g. autoload) alongside a barrel', async () => {
      const result = await resolveDependencies([
        {
          specifier: '@studiometa/ui-autoload',
          entries: {
            '.': '../ui-autoload/index.ts',
            './ui': '../ui-autoload/ui.ts',
            './ui-mapbox': '../ui-autoload/ui-mapbox.ts',
          },
        },
      ]);

      expect(result.importMap).toEqual({
        '@studiometa/ui-autoload': '/static/deps/@studiometa/ui-autoload/index.js',
        '@studiometa/ui-autoload/ui': '/static/deps/@studiometa/ui-autoload/ui.js',
        '@studiometa/ui-autoload/ui-mapbox': '/static/deps/@studiometa/ui-autoload/ui-mapbox.js',
      });
      expect(result.selfHosted).toHaveLength(1);
      expect(result.selfHosted[0].entries).toHaveLength(3);
    });

    it('skips non-local entry sources with a warning', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await resolveDependencies([
        {
          specifier: '@studiometa/ui',
          entries: {
            '.': '../ui/index.ts',
            './manifest': '@studiometa/ui/manifest', // bare npm — unsupported
          },
        },
      ]);

      expect(result.importMap).toEqual({
        '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
      });
      expect(result.selfHosted[0].entries).toHaveLength(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('non-local source'));

      warn.mockRestore();
    });

    it('produces no self-hosted build when every entry is skipped', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await resolveDependencies([
        {
          specifier: '@studiometa/ui',
          entries: { '.': 'bare-npm-name' },
        },
      ]);

      expect(result.importMap).toEqual({});
      expect(result.selfHosted).toEqual([]);

      warn.mockRestore();
    });
  });

  describe('local self-hosted subpath auto-detection', () => {
    it('derives entries from exports and aliases `.js`-suffix keys to one build', async () => {
      const fixtureDir = mkdtempSync(join(tmpdir(), 'playground-subpaths-'));
      writeFileSync(
        join(fixtureDir, 'package.json'),
        JSON.stringify({
          name: 'demo',
          exports: {
            '.': './index.ts',
            './Foo': './Foo.ts',
            './Foo.js': './Foo.ts',
          },
        }),
      );

      try {
        // configDir derives from packageJsonPath's directory (the fixture dir),
        // so a source root of './' lands on the fixture package.
        const result = await resolveDependencies(
          [{ specifier: 'demo', source: './**/*.ts', subpaths: true }],
          join(fixtureDir, 'package.json'),
        );

        expect(result.selfHosted).toHaveLength(1);
        const dep = result.selfHosted[0];

        // `.` → index entry, `./Foo` → Foo entry; `./Foo.js` is NOT a separate entry.
        expect(dep.entries).toEqual([
          {
            subpath: '.',
            specifier: 'demo',
            name: 'index',
            source: join(fixtureDir, 'index.ts'),
            importMapValue: '/static/deps/demo/index.js',
          },
          {
            subpath: './Foo',
            specifier: 'demo/Foo',
            name: 'Foo',
            source: join(fixtureDir, 'Foo.ts'),
            importMapValue: '/static/deps/demo/Foo.js',
          },
        ]);

        // `demo/Foo` and `demo/Foo.js` both resolve to the same built file.
        expect(result.importMap['demo/Foo']).toBe('/static/deps/demo/Foo.js');
        expect(result.importMap['demo/Foo.js']).toBe('/static/deps/demo/Foo.js');
        expect(result.importMap['demo/Foo']).toBe(result.importMap['demo/Foo.js']);

        expect(dep.aliasSpecifiers).toContain('demo/Foo.js');
      } finally {
        rmSync(fixtureDir, { recursive: true, force: true });
      }
    });

    it('lets explicit entries win over subpaths (no derivation)', async () => {
      const fixtureDir = mkdtempSync(join(tmpdir(), 'playground-subpaths-explicit-'));
      writeFileSync(
        join(fixtureDir, 'package.json'),
        JSON.stringify({
          name: 'demo',
          exports: {
            '.': './index.ts',
            './Foo': './Foo.ts',
          },
        }),
      );

      try {
        const result = await resolveDependencies(
          [
            {
              specifier: 'demo',
              source: './**/*.ts',
              subpaths: true,
              entries: { '.': './index.ts' },
            },
          ],
          join(fixtureDir, 'package.json'),
        );

        // Only the explicit entry is used; `./Foo` from exports is ignored.
        expect(result.importMap).toEqual({
          demo: '/static/deps/demo/index.js',
        });
        expect(result.selfHosted[0].entries).toHaveLength(1);
        expect(result.selfHosted[0].aliasSpecifiers).toBeUndefined();
      } finally {
        rmSync(fixtureDir, { recursive: true, force: true });
      }
    });
  });

  describe('self-hosted paths have no publicPath prefix', () => {
    it('self-hosted entries always get bare paths without prefix', async () => {
      const result = await resolveDependencies([
        { specifier: '@studiometa/ui', source: '../ui/**/*.ts' },
      ]);
      expect(result.importMap).toEqual({
        '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
      });
      expect(result.selfHosted[0].importMapValue).toBe('/static/deps/@studiometa/ui/index.js');
    });
  });
});
