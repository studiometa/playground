import { Base, withDrag } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps, DragProps } from '@studiometa/js-toolkit';

export type ResizableCursorProps = BaseProps & {
  $options: {
    axis: 'x' | 'y';
  };
  $emits: {
    dragged: DragProps;
  };
};

/**
 * ResizableCursor class.
 */
export default class ResizableCursor extends withDrag(Base)<ResizableCursorProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'ResizableCursor',
    options: {
      axis: {
        type: String,
        default: 'x',
      },
    },
  };

  /**
   * Republish the drag service props as a component event.
   *
   * v3 emitted every hook call for free; v4 does not, so a parent that watches
   * `dragged` needs the child to say so explicitly.
   */
  dragged(props: DragProps) {
    this.$emit('dragged', props);
  }

  onPointerdown() {
    document.documentElement.classList.add('is-resizing');
  }

  onPointerup() {
    document.documentElement.classList.remove('is-resizing');
  }
}
