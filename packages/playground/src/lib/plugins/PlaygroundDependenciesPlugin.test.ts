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

  describe('resolveBasePath', () => {
    const resolveBasePath = (basePath: string | undefined, publicPath?: string) => {
      const p = new PlaygroundDependenciesPlugin([], '/tmp', basePath);
      const fakeCompiler = {
        options: { output: { publicPath: publicPath ?? 'auto' } },
      };
      return (p as any).resolveBasePath(fakeCompiler);
    };

    it('uses explicit basePath when provided', () => {
      expect(resolveBasePath('/play')).toBe('/play');
    });

    it('strips trailing slash from explicit basePath', () => {
      expect(resolveBasePath('/play/')).toBe('/play');
    });

    it('infers from webpack publicPath when no basePath', () => {
      expect(resolveBasePath(undefined, '/play/')).toBe('/play');
    });

    it('returns empty string when publicPath is "auto"', () => {
      expect(resolveBasePath(undefined, 'auto')).toBe('');
    });

    it('returns empty string when publicPath is "/"', () => {
      expect(resolveBasePath(undefined, '/')).toBe('');
    });

    it('returns empty string when no basePath and no publicPath', () => {
      expect(resolveBasePath(undefined)).toBe('');
    });

    it('prefers explicit basePath over publicPath', () => {
      expect(resolveBasePath('/custom', '/play/')).toBe('/custom');
    });
  });
});
