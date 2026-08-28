import { Base, getInstance } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { watchLayout, getLayout } from '../store/index.js';
import type { Layouts } from '../store/index.js';
import type Resizable from './Resizable.js';

export type LayoutReactiveProps = BaseProps & {
  $options: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
};

const layouts = ['top', 'right', 'bottom', 'left'];

/**
 * LayoutReactive class.
 */
export default class LayoutReactive extends Base<LayoutReactiveProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'LayoutReactive',
    options: {
      top: String,
      right: String,
      bottom: String,
      left: String,
    },
  };

  async mounted() {
    this.switch(await getLayout());

    return watchLayout((value: Layouts) => {
      this.switch(value);
    });
  }

  switch(value: Layouts) {
    this.$read(() => {
      let toAdd = '';
      let toRemove = '';

      layouts.forEach((layout) => {
        if (value === layout) {
          toAdd = this.$options[layout];
        } else if (this.$options[layout]) {
          toRemove += ` ${this.$options[layout]}`;
        }
      });

      toAdd = toAdd.trim();
      toRemove = toRemove.trim();

      if (toRemove.length) {
        this.$write(() => {
          this.$el.classList.remove(...toRemove.split(' '));
        });
      }

      if (toAdd.length) {
        this.$write(() => {
          this.$el.classList.add(...toAdd.split(' '));
        });
      }

      // `Resizable` is lazy, and it shares this element when it is there.
      // Resolving it by name keeps the class out of this module's import
      // graph, so the lazy chunk stays lazy.
      const maybeResizable = getInstance<Resizable>(this.$el, 'Resizable');
      if (maybeResizable?.$isMounted) {
        maybeResizable.reset();
      }
    });
  }
}
