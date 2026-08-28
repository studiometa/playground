import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';

export type EditorVisibilityProps = BaseProps;

/**
 * EditorVisibility class.
 */
export default class EditorVisibility extends Base<EditorVisibilityProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'EditorVisibility',
  };

  /**
   * The content type this editor edits, read from the markup.
   *
   * The coordinator uses it to tell the three editors apart. It is a DOM fact,
   * so it answers before anything mounts.
   */
  get lang(): string {
    return this.$el.dataset.lang ?? '';
  }

  show() {
    this.$write(() => {
      this.$el.style.display = '';
    });
  }

  hide() {
    this.$write(() => {
      this.$el.style.display = 'none';
    });
  }

  toggle(force?: boolean) {
    if (force === true) {
      this.show();
      return;
    }

    if (force === false) {
      this.hide();
      return;
    }

    this.$read(() => {
      if (this.$el.style.display === 'none') {
        this.show();
      } else {
        this.hide();
      }
    });
  }
}
