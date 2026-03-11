import { describe, it, expect } from 'vitest';
import { PlaygroundDependenciesPlugin } from './PlaygroundDependenciesPlugin.js';

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
});
