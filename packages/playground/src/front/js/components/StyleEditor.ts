import { getStyle, setStyle } from '../store/index.js';
import Editor from './Editor.js';

export default class StyleEditor extends Editor {
  get language(): string {
    return 'css';
  }

  get initialValue(): string {
    return getStyle();
  }

  onContentChange(value) {
    setStyle(value);
  }
}
