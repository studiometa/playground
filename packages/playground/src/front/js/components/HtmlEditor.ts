import { getHtml, setHtml } from '../store/index.js';
import Editor from './Editor.js';

export default class HtmlEditor extends Editor {
  get language(): string {
    return 'html';
  }

  get initialValue(): string {
    return getHtml();
  }

  onContentChange(value) {
    setHtml(value);
  }
}
