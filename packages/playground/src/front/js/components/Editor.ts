import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { debounce } from '@studiometa/js-toolkit/utils';
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
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
   * @type {editor.IStandaloneCodeEditor}
   */
  editor: editor.IStandaloneCodeEditor;

  /**
   * Monaco.
   */
  get monaco() {
    return monaco;
  }

  /**
   * Language of the editor.
   */
  get language() {
    return '';
  }

  async mounted() {
    const { addJsAutocompletion } = await import('../utils/js/index.js');
    const value = await this.getInitialValue();

    this.editor = this.monaco.editor.create(this.$el, {
      value,
      language: this.language,
      minimap: { enabled: false },
      automaticLayout: true,
      fontLigatures: true,
      fontFamily: 'JetBrains Mono',
      fontSize: 14,
      tabSize: 2,
      theme: (await themeIsDark()) ? 'vs-dark' : 'vs',
    });

    const disposeHTML = emmetHTML(this.monaco, ['html']);
    const disposeCSS = emmetCSS(this.monaco, ['css']);
    addJsAutocompletion(this.monaco.languages);

    this.$on(
      'destroyed',
      () => {
        disposeHTML();
        disposeCSS();
      },
      { once: true },
    );

    watchTheme(async () => {
      this.editor.updateOptions({
        theme: (await themeIsDark()) ? 'vs-dark' : 'vs',
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
