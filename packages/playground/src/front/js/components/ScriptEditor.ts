import type { BaseConfig } from '@studiometa/js-toolkit';
import type { InitOptions } from 'modern-monaco';
import { getScript, setScript } from '../store/index.js';
import { resolveImportMapUrls } from '../utils/resolve-import-map-urls.js';
import Editor from './Editor.js';

export default class ScriptEditor extends Editor {
  /**
   * Config.
   *
   * An `Object` option default must be a factory in v4, so each instance gets
   * its own value.
   */
  static config: BaseConfig = {
    name: 'ScriptEditor',
    options: {
      importMap: { type: Object, default: () => ({}) },
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

  onContentChange(event: CustomEvent<{ value: string }>) {
    setScript(event.detail.value);
  }
}
