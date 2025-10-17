import { AutoTypings, LocalStorageCache, JsDelivrSourceResolver } from 'monaco-editor-auto-typings';
import { getScript, setScript } from '../store/index.js';
import Editor from './Editor.js';

export default class ScriptEditor extends Editor {
  /**
   * Autotyping instance.
   */
  autoTypings: AutoTypings;

  get language(): string {
    return 'typescript';
  }

  async getInitialValue() {
    return getScript();
  }

  onContentChange({ args: [value] }) {
    setScript(value);
  }

  async mounted() {
    await super.mounted();

    this.autoTypings = await AutoTypings.create(this.editor, {
      sourceCache: new LocalStorageCache(),
      sourceResolver: new JsDelivrSourceResolver(),
      monaco: this.monaco,
    });
  }

  destroyed() {
    this.autoTypings.dispose();
  }
}
