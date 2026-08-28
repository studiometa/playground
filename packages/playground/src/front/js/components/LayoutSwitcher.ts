import type { BaseConfig } from '@studiometa/js-toolkit';
import Switcher from './Switcher.js';
import { setLayout, getLayout } from '../store/index.js';
import type { Layouts } from '../store/index.js';

export default class LayoutSwitcher extends Switcher {
  static config: BaseConfig = {
    name: 'LayoutSwitcher',
  };

  async mounted() {
    const value = await getLayout();
    const input = this.$refs.inputs.find((i) => i.value === value);

    if (input) {
      this.$write(() => {
        input.checked = true;
      });
    }
  }

  switch(value: Layouts) {
    setLayout(value);
  }
}
