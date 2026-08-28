import { Base, getInstance } from '@studiometa/js-toolkit';
import type { BaseProps, BaseConfig, DelegatedEvent, DragProps } from '@studiometa/js-toolkit';
import { clamp } from '@studiometa/js-toolkit/utils';
import { layoutIsVertical, layoutIs } from '../store/index.js';
import ResizableCursor from './ResizableCursor.js';
import ResizableSync from './ResizableSync.js';

export type ResizableProps = BaseProps & {
  $emits: {
    dragged: DragProps;
  };
};

export default class Resizable extends Base<ResizableProps> {
  static config: BaseConfig = {
    name: 'Resizable',
    components: {
      ResizableCursor,
      ResizableSync,
    },
  };

  previousSize = 0;

  /**
   * Live, DOM-ordered views over the children.
   *
   * v3 read `$children`, which was a snapshot the parent owned and which only
   * existed once the parent had mounted. These are watched from the field
   * initializer, so a child that mounts first — v4 guarantees no ordering —
   * joins the collection when it arrives instead of being missed.
   */
  #syncs = this.$watchChildren(ResizableSync);

  get visibleResizeSync() {
    return this.#syncs.items.filter((resizableSync) => resizableSync.$el.offsetParent !== null);
  }

  async onResizableCursorDragged({ target, payload }: DelegatedEvent<ResizableCursor, 'dragged'>) {
    const axis = target.$options.axis;
    const isVertical = await layoutIsVertical();
    const distance = axis === 'x' ? payload.distanceX : payload.distanceY;

    if ((isVertical && axis === 'y') || (!isVertical && axis === 'x')) {
      this.resizeSync(payload.mode, axis, distance, target);
    } else {
      await this.resize(payload.mode, axis, distance);
    }

    this.$emit('dragged', payload);
  }

  async resize(mode: DragProps['mode'], axis: 'x' | 'y', distance: number) {
    let value = distance;

    if ((await layoutIs('right')) || (await layoutIs('bottom'))) {
      value *= -1;
    }

    if (mode === 'start') {
      this.$read(() => {
        const size = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
        this.previousSize = this.$el[size];
      });
    } else if (mode === 'drag') {
      this.$write(() => {
        const size = axis === 'x' ? 'width' : 'height';
        const minSize = 8;
        const maxSize = axis === 'x' ? window.innerWidth : window.innerHeight - 48;
        const newSize = clamp(value + this.previousSize, minSize, maxSize);
        this.$el.style[size] = `${newSize}px`;
      });
    }
  }

  resizeSync(
    mode: DragProps['mode'],
    axis: 'x' | 'y',
    distance: number,
    resizableCursor: ResizableCursor,
  ) {
    const { visibleResizeSync } = this;

    if (visibleResizeSync.length === 2) {
      visibleResizeSync[0]?.sync(mode, axis, distance);
      visibleResizeSync[1]?.sync(mode, axis, distance * -1);
      return;
    }

    // `$closest()` walks the DOM for a mounted ancestor, which is what
    // `getClosestParent(instance, Class)` did over the v3 parent/child graph.
    const parent = resizableCursor.$closest<ResizableSync>('ResizableSync');
    const next = parent
      ? getInstance<ResizableSync>(parent.$el.nextElementSibling, 'ResizableSync')
      : undefined;

    if (!next) {
      return;
    }

    parent.sync(mode, axis, distance);
    next.sync(mode, axis, distance * -1);

    for (const resizableSync of this.#syncs) {
      if (resizableSync !== next && resizableSync !== parent) {
        resizableSync.set(axis);
      }
    }
  }

  reset() {
    this.$write(() => {
      this.$el.style.width = '';
      this.$el.style.height = '';
    });

    for (const resizableSync of this.#syncs) {
      resizableSync.reset();
    }
  }
}
