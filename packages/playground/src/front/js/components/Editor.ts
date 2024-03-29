import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { debounce, domScheduler } from '@studiometa/js-toolkit/utils';
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as monaco from 'monaco-editor';
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
   * Language of the editor.
   */
  get language() {
    return '';
  }

  async mounted() {
    const { addJsAutocompletion } = await import('../utils/js/index.js');
    const value = await this.getInitialValue();

    this.editor = monaco.editor.create(this.$el, {
      value,
      language: this.language,
      minimap: { enabled: false },
      automaticLayout: true,
      fontLigatures: true,
      fontFamily: 'JetBrains Mono',
      fontSize: 14,
      tabSize: 2,
      theme: themeIsDark() ? 'vs-dark' : 'vs',
    });

    const disposeHTML = emmetHTML(monaco, ['html']);
    const disposeCSS = emmetCSS(monaco, ['css']);
    addJsAutocompletion(monaco.languages);

    this.$on(
      'destroyed',
      () => {
        disposeHTML();
        disposeCSS();
      },
      { once: true },
    );

    watchTheme(() => {
      this.editor.updateOptions({
        theme: themeIsDark() ? 'vs-dark' : 'vs',
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

  show() {
    domScheduler.write(() => {
      this.$el.style.display = '';
    });
  }

  hide() {
    domScheduler.write(() => {
      this.$el.style.display = 'none';
    });
  }

  toggle(force) {
    if (force === true) {
      this.show();
      return;
    }

    if (force === false) {
      this.hide();
      return;
    }

    domScheduler.read(() => {
      if (this.$el.style.display === 'none') {
        this.show();
      } else {
        this.hide();
      }
    });
  }
}
