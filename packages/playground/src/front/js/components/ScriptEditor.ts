import { getScript, setScript } from '../store/index.js';
import Editor from './Editor.js';

export default class ScriptEditor extends Editor {
  get language(): string {
    return 'javascript';
  }

  async getInitialValue() {
    return getScript();
  }

  onContentChange({ args: [value]}) {
    setScript(value);
  }
}
