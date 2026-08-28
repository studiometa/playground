import { Base } from '@studiometa/js-toolkit';
import type { BaseProps, BaseConfig, DragProps } from '@studiometa/js-toolkit';
import { clamp } from '@studiometa/js-toolkit/utils';

export type ResizableSyncProps = BaseProps;

/**
 * ResizableSync class.
 */
export default class ResizableSync extends Base<ResizableSyncProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'ResizableSync',
  };

  previousSize = 0;

  sync(mode: DragProps['mode'], axis: 'x' | 'y', distance: number) {
    if (mode === 'start') {
      this.$read(() => {
        const size = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
        this.previousSize = this.$el[size];
      });
    } else if (mode === 'drag') {
      this.$read(() => {
        const minSize = 0;
        const maxSize = axis === 'x' ? window.innerWidth : window.innerHeight;
        this.$write(() => {
          const size = axis === 'x' ? 'width' : 'height';
          const newSize = clamp(distance + this.previousSize, minSize, maxSize);
          this.$el.style[size] = `${newSize}px`;
        });
      });
    }
  }

  set(axis: 'x' | 'y') {
    this.$read(() => {
      const size = axis === 'x' ? this.$el.offsetWidth : this.$el.offsetHeight;

      this.$write(() => {
        const prop = axis === 'x' ? 'width' : 'height';
        this.$el.style[prop] = `${size}px`;
      });
    });
  }

  reset() {
    this.$write(() => {
      this.$el.style.width = '';
      this.$el.style.height = '';
    });
  }
}
