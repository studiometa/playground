import { describe, it, expect } from 'vitest';
import { resolvePublicPath } from './resolve-public-path.js';

describe('resolvePublicPath', () => {
  it('uses explicit publicPath when provided', () => {
    expect(resolvePublicPath('/play')).toBe('/play');
  });

  it('strips trailing slash from explicit publicPath', () => {
    expect(resolvePublicPath('/play/')).toBe('/play');
  });

  it('adds leading slash to explicit publicPath', () => {
    expect(resolvePublicPath('play')).toBe('/play');
  });

  it('infers from webpack output.publicPath when no explicit publicPath', () => {
    expect(resolvePublicPath(undefined, { output: { publicPath: '/play/' } })).toBe('/play');
  });

  it('returns empty string when webpack publicPath is "auto"', () => {
    expect(resolvePublicPath(undefined, { output: { publicPath: 'auto' } })).toBe('');
  });

  it('returns empty string when webpack publicPath is "/"', () => {
    expect(resolvePublicPath(undefined, { output: { publicPath: '/' } })).toBe('');
  });

  it('returns empty string when no publicPath at all', () => {
    expect(resolvePublicPath()).toBe('');
  });

  it('returns empty string when webpackConfig has no output', () => {
    expect(resolvePublicPath(undefined, {})).toBe('');
  });

  it('prefers explicit publicPath over webpack publicPath', () => {
    expect(resolvePublicPath('/custom', { output: { publicPath: '/play/' } })).toBe('/custom');
  });

  it('handles multiple trailing slashes', () => {
    expect(resolvePublicPath('/play///')).toBe('/play');
  });

  it('handles webpack publicPath without trailing slash', () => {
    expect(resolvePublicPath(undefined, { output: { publicPath: '/app' } })).toBe('/app');
  });
});
