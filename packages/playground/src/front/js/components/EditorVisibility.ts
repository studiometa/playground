import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { domScheduler } from '@studiometa/js-toolkit/utils';

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

  toggle(force?: boolean) {
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
