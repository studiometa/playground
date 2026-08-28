import type { BaseConfig } from '@studiometa/js-toolkit';
import { getStyle, setStyle } from '../store/index.js';
import Editor from './Editor.js';

export default class StyleEditor extends Editor {
  /**
   * Config.
   *
   * v3 let this class inherit `Editor`'s config, name included. In v4 the name
   * is the registry key, so a subclass that mounts on its own
   * `data-component` token has to declare it.
   */
  static config: BaseConfig = {
    name: 'StyleEditor',
  };

  get language(): string {
    return 'css';
  }

  get filename(): string {
    return 'style.css';
  }

  async getInitialValue() {
    return getStyle();
  }

  onContentChange(event: CustomEvent<{ value: string }>) {
    setStyle(event.detail.value);
  }
}
