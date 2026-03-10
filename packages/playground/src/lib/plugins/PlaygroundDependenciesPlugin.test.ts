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
});
