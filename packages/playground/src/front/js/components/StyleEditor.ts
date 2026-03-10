import { getStyle, setStyle } from '../store/index.js';
import Editor from './Editor.js';

export default class StyleEditor extends Editor {
  get language(): string {
    return 'css';
  }

  get filename(): string {
    return 'style.css';
  }

  async getInitialValue() {
    return getStyle();
  }

  onContentChange({ args: [value] }) {
    setStyle(value);
  }
}
