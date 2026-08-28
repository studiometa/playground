import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';

export type SwitcherProps = BaseProps & {
  $refs: {
    inputs: HTMLInputElement[];
  };
  $emits: {
    switch: { value: string };
  };
};

/**
 * Switcher class.
 */
export default class Switcher extends Base<SwitcherProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'Switcher',
    refs: ['inputs[]'],
  };

  get value() {
    return this.$refs.inputs.find((input) => input.checked)?.value;
  }

  onInputsInput() {
    const { value } = this;

    if (typeof value === 'undefined') {
      return;
    }

    this.switch(value);
    this.$emit('switch', { value });
  }

  switch(_value: string) {
    throw new Error('The `switch` method must be implemented.');
  }
}
