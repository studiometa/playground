import { Base, DRAG_MODES, withDrag } from '@studiometa/js-toolkit';
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
    // v3 raised and cleared `is-resizing` from `pointerdown`/`pointerup` bound
    // to this element. A mouse released anywhere else never delivered the
    // `pointerup`, so the class stayed and `is-resizing:pointer-events-none`
    // left the preview iframe unclickable. The drag service reports the end of
    // the gesture wherever the pointer is.
    if (props.mode === DRAG_MODES.START) {
      document.documentElement.classList.add('is-resizing');
    } else if (props.mode === DRAG_MODES.DROP || props.mode === DRAG_MODES.STOP) {
      document.documentElement.classList.remove('is-resizing');
    }

    this.$emit('dragged', props);
  }
}
