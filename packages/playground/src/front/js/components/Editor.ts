import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { debounce } from '@studiometa/js-toolkit/utils';
// import type { IStandaloneCodeEditor  } from 'monaco-editor/esm/vs/editor/editor.api.js';
// import * as monaco from 'monaco-editor';
import { init, lazy } from 'modern-monaco';
import { type editor } from 'modern-monaco/editor-core';
import { emmetHTML, emmetCSS } from 'emmet-monaco-es';
import { themeIsDark, watchTheme } from '../store/index.js';

export type EditorProps = BaseProps;

/**
 * Editor class.
 */
export default class Editor extends Base<EditorProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'Editor',
    emits: ['content-change'],
  };

  /**
   * Editor.
   */
  editor: editor.IStandaloneCodeEditor;

  /**
   * Language of the editor.
   */
  get language() {
    return '';
  }

  async mounted() {
    const monaco = await lazy({
      theme: (await themeIsDark()) ? 'github-dark' : 'github-light',
      // langs: ['html', 'css', 'javascript'],
      lsp: {
        typescript: {
          importMap: {
            imports: {
              '@studiometa/': 'https://esm.sh/@studiometa/',
            },
            scopes: {},
          },
        },
      },
    });
    console.log(monaco);
    // const { addJsAutocompletion } = await import('../utils/js/index.js');
    // const value = await this.getInitialValue();

    // this.editor = monaco.editor.create(this.$el, {
    //   value,
    //   language: this.language,
    //   minimap: { enabled: false },
    //   automaticLayout: true,
    //   fontLigatures: true,
    //   fontFamily: 'JetBrains Mono',
    //   fontSize: 14,
    //   tabSize: 2,
    // });

    // console.log(this.editor, monaco);
    // @ ts-expect-error Foo.
    // const disposeHTML = emmetHTML(monaco, ['html']);
    // const disposeCSS = emmetCSS(monaco, ['css']);
    // addJsAutocompletion(monaco.languages);

    this.$on(
      'destroyed',
      () => {
        // disposeHTML();
        // disposeCSS();
      },
      { once: true },
    );

    watchTheme(async () => {
      this.editor.updateOptions({
        theme: (await themeIsDark()) ? 'github-dark' : 'github-light',
      });
    });

    this.editor.onDidChangeModelContent(
      debounce(() => {
        this.$emit('content-change', this.editor.getValue());
      }, 500),
    );
  }

  async getInitialValue() {
    return '';
  }
}
