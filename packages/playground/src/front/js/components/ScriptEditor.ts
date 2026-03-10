import type { InitOptions } from 'modern-monaco';
import { getScript, setScript } from '../store/index.js';
import { resolveImportMapUrls } from '../utils/resolve-import-map-urls.js';
import Editor from './Editor.js';

export default class ScriptEditor extends Editor {
  /**
   * Config.
   */
  static config = {
    ...Editor.config,
    options: {
      importMap: Object,
    },
  };

  get language(): string {
    return 'typescript';
  }

  get filename(): string {
    return 'script.ts';
  }

  /**
   * Forward the import map to modern-monaco's TypeScript LSP
   * so that it can resolve bare specifier imports and fetch .d.ts files.
   */
  protected getLspOptions(): InitOptions['lsp'] {
    const importMap = this.$options.importMap as Record<string, string> | undefined;

    if (!importMap || Object.keys(importMap).length === 0) {
      return {};
    }

    return {
      typescript: {
        importMap: {
          imports: resolveImportMapUrls(importMap),
          scopes: {},
        },
      },
    };
  }

  async getInitialValue() {
    return getScript();
  }

  onContentChange({ args: [value] }) {
    setScript(value);
  }
}
