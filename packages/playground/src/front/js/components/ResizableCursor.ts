import { Base, withDrag } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';

export interface ResizableCursorProps extends BaseProps {
  $options: {
    axis: 'x' | 'y';
    targets: string[];
  };
}

/**
 * ResizableCursorX class.
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

  onPointerdown() {
    document.documentElement.classList.add('is-resizing');
  }

  onPointerup() {
    document.documentElement.classList.remove('is-resizing');
  }
}
