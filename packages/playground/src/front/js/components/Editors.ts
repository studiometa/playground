import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';

export type EditorsProps = BaseProps;

/**
 * Editors class.
 */
export default class Editors extends Base<EditorsProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'Editors',
  };

  hide() {
    this.$write(() => {
      this.$el.classList.add('hidden');
    });
  }

  show() {
    this.$write(() => {
      this.$el.classList.remove('hidden');
    });
  }
}
