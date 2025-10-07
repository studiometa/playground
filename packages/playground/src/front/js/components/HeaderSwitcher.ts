import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { domScheduler } from '@studiometa/js-toolkit/utils';
import { setHeaderVisibility, headerIsVisible } from '../store/header.js';

export interface HeaderSwitcherProps extends BaseProps {
  $refs: {
    show: HTMLButtonElement;
    hide: HTMLButtonElement;
  };
}

/**
 * HeaderSwitcher class.
 */
export default class HeaderSwitcher extends Base<HeaderSwitcherProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'HeaderSwitcher',
    refs: ['show', 'hide'],
  };

  async mounted() {
    this.update(await headerIsVisible());
  }

  onShowClick() {
    this.show();
  }

  onHideClick() {
    this.hide();
  }

  async show() {
    await setHeaderVisibility('visible');
    this.update(await headerIsVisible());
    this.$refs.hide.focus();
  }

  async hide() {
    await setHeaderVisibility('hidden');
    this.update(await headerIsVisible());
    this.$refs.show.focus();
  }

  update(isVisible) {
    domScheduler.write(() => {
      this.$refs.hide.classList.toggle('flex', isVisible);
      this.$refs.show.classList.toggle('flex', !isVisible);
      this.$refs.hide.classList.toggle('hidden', !isVisible);
      this.$refs.show.classList.toggle('hidden', isVisible);
    });
  }
}
