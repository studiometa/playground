import { describe, it, expect } from 'vitest';
import { resolveImportMapUrls } from './resolve-import-map-urls.js';

describe('resolveImportMapUrls', () => {
  const origin = 'https://example.com';

  it('resolves relative paths to absolute URLs', () => {
    const map = { foo: '/static/foo.js' };
    expect(resolveImportMapUrls(map, origin)).toEqual({
      foo: 'https://example.com/static/foo.js',
    });
  });

  it('leaves absolute URLs unchanged', () => {
    const map = { deepmerge: 'https://esm.sh/deepmerge' };
    expect(resolveImportMapUrls(map, origin)).toEqual({
      deepmerge: 'https://esm.sh/deepmerge',
    });
  });

  it('handles trailing-slash specifiers', () => {
    const map = { '@studiometa/': 'https://esm.sh/@studiometa/' };
    expect(resolveImportMapUrls(map, origin)).toEqual({
      '@studiometa/': 'https://esm.sh/@studiometa/',
    });
  });

  it('resolves mixed relative and absolute URLs', () => {
    const map = {
      '@studiometa/js-toolkit': '/static/js-toolkit/index.js',
      deepmerge: 'https://esm.sh/deepmerge',
    };
    expect(resolveImportMapUrls(map, origin)).toEqual({
      '@studiometa/js-toolkit': 'https://example.com/static/js-toolkit/index.js',
      deepmerge: 'https://esm.sh/deepmerge',
    });
  });

  it('returns empty object for empty input', () => {
    expect(resolveImportMapUrls({}, origin)).toEqual({});
  });

  it('uses provided origin over globalThis', () => {
    const map = { foo: '/bar.js' };
    expect(resolveImportMapUrls(map, 'https://custom.dev')).toEqual({
      foo: 'https://custom.dev/bar.js',
    });
  });
});
