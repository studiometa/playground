import { describe, it, expect } from 'vitest';
import { PlaygroundDependenciesPlugin } from '../PlaygroundDependenciesPlugin.js';

/**
 * Test the `.d.ts` import rewriting logic directly.
 * The full webpack integration requires a compiler instance,
 * so we test the rewriting method in isolation.
 */
describe('PlaygroundDependenciesPlugin', () => {
  // Access the private method via prototype for testing
  const plugin = new PlaygroundDependenciesPlugin([], '/tmp');
  const rewrite = (content: string) => (plugin as any).rewriteDtsImports(content);

  describe('rewriteDtsImports', () => {
    it('rewrites relative .js imports to .d.ts', () => {
      const input = `import { Base } from './base.js';`;
      expect(rewrite(input)).toBe(`import { Base } from './base.d.ts';`);
    });

    it('rewrites parent directory .js imports', () => {
      const input = `import { utils } from '../utils/index.js';`;
      expect(rewrite(input)).toBe(`import { utils } from '../utils/index.d.ts';`);
    });

    it('rewrites export-from .js references', () => {
      const input = `export { Base } from './base.js';`;
      expect(rewrite(input)).toBe(`export { Base } from './base.d.ts';`);
    });

    it('handles double-quoted imports', () => {
      const input = `import { Foo } from "./foo.js";`;
      expect(rewrite(input)).toBe(`import { Foo } from "./foo.d.ts";`);
    });

    it('does not rewrite bare specifiers', () => {
      const input = `import { something } from 'some-package';`;
      expect(rewrite(input)).toBe(input);
    });

    it('does not rewrite absolute URLs', () => {
      const input = `import { something } from 'https://esm.sh/foo';`;
      expect(rewrite(input)).toBe(input);
    });

    it('does not rewrite non-.js relative imports', () => {
      const input = `import { something } from './foo.css';`;
      expect(rewrite(input)).toBe(input);
    });

    it('handles multiple imports in one file', () => {
      const input = [
        `import { Base } from './base.js';`,
        `import { utils } from '../utils/index.js';`,
        `import { external } from 'external-package';`,
        `export { Component } from './components/Button.js';`,
      ].join('\n');
      const expected = [
        `import { Base } from './base.d.ts';`,
        `import { utils } from '../utils/index.d.ts';`,
        `import { external } from 'external-package';`,
        `export { Component } from './components/Button.d.ts';`,
      ].join('\n');
      expect(rewrite(input)).toBe(expected);
    });

    it('handles deeply nested relative paths', () => {
      const input = `import { Foo } from '../../deeply/nested/module.js';`;
      expect(rewrite(input)).toBe(`import { Foo } from '../../deeply/nested/module.d.ts';`);
    });
  });

  describe('findCommonRoot', () => {
    const findCommonRoot = (files: string[]) => (plugin as any).findCommonRoot(files);

    it('returns dirname for single file', () => {
      expect(findCommonRoot(['/home/user/src/index.ts'])).toBe('/home/user/src');
    });

    it('finds common root for sibling files', () => {
      expect(findCommonRoot(['/home/user/src/index.ts', '/home/user/src/utils.ts'])).toBe(
        '/home/user/src',
      );
    });

    it('finds common root for nested files', () => {
      expect(
        findCommonRoot([
          '/home/user/src/index.ts',
          '/home/user/src/components/Button.ts',
          '/home/user/src/utils/helpers.ts',
        ]),
      ).toBe('/home/user/src');
    });

    it('returns root for divergent paths', () => {
      expect(findCommonRoot(['/a/b/c.ts', '/a/d/e.ts'])).toBe('/a');
    });

    it('returns empty string for empty input', () => {
      expect(findCommonRoot([])).toBe('');
    });
  });
});
