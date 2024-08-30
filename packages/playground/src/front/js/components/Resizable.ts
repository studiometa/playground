import { Base, getClosestParent, getInstanceFromElement } from '@studiometa/js-toolkit';
import type { BaseProps, BaseConfig, DragServiceProps } from '@studiometa/js-toolkit';
import { domScheduler, clamp } from '@studiometa/js-toolkit/utils';
import { layoutIsVertical, layoutIs } from '../store/index.js';
import ResizableCursor from './ResizableCursor.js';
import ResizableSync from './ResizableSync.js';

export interface ResizableProps extends BaseProps {
  $children: {
    ResizableCursor: ResizableCursor[];
    ResizableSync: ResizableSync[];
  };
  $options: {
    reverse: boolean;
  }
}

export default class Resizable extends Base<ResizableProps> {
  static config: BaseConfig = {
    name: 'Resizable',
    components: {
      ResizableCursor,
      ResizableSync,
    },
    options: {
      reverse: Boolean,
    },
    emits: ['dragged'],
  };

  previousSize = 0;

  get visibleResizeSync() {
    return this.$children.ResizableSync.filter(
      (resizableSync) => resizableSync.$el.offsetParent !== null,
    );
  }

  onResizableCursorDragged({
    target,
    args: [props],
  }: {
    target: ResizableCursor;
    args: [DragServiceProps];
  }) {
    const { axis } = target.$options;
    let method = 'resize';

    if ((layoutIsVertical() && axis === 'y') || (!layoutIsVertical() && axis === 'x')) {
      method = 'resizeSync';
    }

    this[method](props.mode, target.$options.axis, props.distance, target);
    this.$emit('dragged', props);
  }

  resize(mode: DragServiceProps['mode'], axis: 'x' | 'y', distance: DragServiceProps['distance']) {
    if (layoutIs('right') || layoutIs('bottom') || this.$options.reverse) {
      distance.x *= -1;
      distance.y *= -1;
    }

    if (mode === 'start') {
      domScheduler.read(() => {
        const size = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
        this.previousSize = this.$el[size];
      });
    } else if (mode === 'drag') {
      domScheduler.write(() => {
        const size = axis === 'x' ? 'width' : 'height';
        const minSize = 8;
        const maxSize = axis === 'x' ? window.innerWidth : window.innerHeight - 48;
        const newSize = clamp(distance[axis] + this.previousSize, minSize, maxSize);
        this.$el.style[size] = `${newSize}px`;
      });
    }
  }

  resizeSync(
    mode: DragServiceProps['mode'],
    axis: 'x' | 'y',
    distance: DragServiceProps['distance'],
    resizableCursor: ResizableCursor,
  ) {
    const { visibleResizeSync } = this;

    if (visibleResizeSync.length === 2) {
      visibleResizeSync[0]?.sync(mode, axis, distance[axis]);
      visibleResizeSync[1]?.sync(mode, axis, distance[axis] * -1);
      return;
    }

    const parent = getClosestParent(resizableCursor, ResizableSync);
    const next = parent
      ? getInstanceFromElement(parent.$el.nextElementSibling as HTMLElement, ResizableSync)
      : null;

    if (!next) {
      return;
    }

    parent.sync(mode, axis, distance[axis]);
    next.sync(mode, axis, distance[axis] * -1);

    for (const resizableSync of this.$children.ResizableSync) {
      if (resizableSync !== next && resizableSync !== parent) {
        resizableSync.set(axis);
      }
    }
  }

  reset() {
    domScheduler.write(() => {
      this.$el.style.width = '';
      this.$el.style.height = '';
    });
    this.$children.ResizableSync.forEach((resizable) => resizable.reset());
  }
}
