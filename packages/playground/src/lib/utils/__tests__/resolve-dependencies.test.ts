import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveDependencies } from '../resolve-dependencies.js';

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

  it('resolves self-hosted copy dependency', () => {
    const result = resolveDependencies([
      { specifier: '@studiometa/js-toolkit', source: '@studiometa/js-toolkit' },
    ]);
    expect(result.importMap).toEqual({
      '@studiometa/js-toolkit': '/static/deps/@studiometa/js-toolkit/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0]).toMatchObject({
      specifier: '@studiometa/js-toolkit',
      type: 'copy',
      source: '@studiometa/js-toolkit',
    });
  });

  it('resolves self-hosted bundle dependency', () => {
    const result = resolveDependencies([
      { specifier: 'morphdom', source: 'morphdom', bundle: true },
    ]);
    expect(result.importMap).toEqual({
      morphdom: '/static/deps/morphdom.js',
    });
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0]).toMatchObject({
      specifier: 'morphdom',
      type: 'bundle',
      source: 'morphdom',
    });
  });

  it('resolves self-hosted typescript dependency', () => {
    const result = resolveDependencies([
      { specifier: '@studiometa/ui', source: '../ui/**/*.ts', typescript: true },
    ]);
    expect(result.importMap).toEqual({
      '@studiometa/ui': '/static/deps/@studiometa/ui/index.js',
    });
    expect(result.selfHosted).toHaveLength(1);
    expect(result.selfHosted[0]).toMatchObject({
      specifier: '@studiometa/ui',
      type: 'typescript',
      source: '../ui/**/*.ts',
    });
  });

  it('passes entry field for typescript dependencies', () => {
    const result = resolveDependencies([
      {
        specifier: '@studiometa/ui',
        source: '../ui/**/*.ts',
        typescript: true,
        entry: '../ui/index.ts',
      },
    ]);
    expect(result.selfHosted[0].entry).toBe('../ui/index.ts');
  });

  it('handles mixed dependencies', () => {
    const result = resolveDependencies([
      'deepmerge',
      { specifier: '@studiometa/js-toolkit', source: '@studiometa/js-toolkit' },
      { specifier: 'morphdom', source: 'morphdom', bundle: true },
    ]);
    expect(Object.keys(result.importMap)).toHaveLength(3);
    expect(result.selfHosted).toHaveLength(2);
    expect(result.selfHosted.map((d) => d.type)).toEqual(['copy', 'bundle']);
  });

  it('returns empty results for empty input', () => {
    const result = resolveDependencies([]);
    expect(result.importMap).toEqual({});
    expect(result.selfHosted).toEqual([]);
  });
});
