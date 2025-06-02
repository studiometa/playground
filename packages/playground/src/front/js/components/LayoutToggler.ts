import { domScheduler } from '@studiometa/js-toolkit/utils';
import type { BaseConfig } from '@studiometa/js-toolkit';
import Switcher from './Switcher.js';
import { setLayout, getLayout, defaultLayout } from '../store/index.js';
import type { Layouts } from '../store/index.js';

export default class LayoutToggler extends Switcher {
  static config: BaseConfig = {
    name: 'LayoutToggler',
  };

  previousLayout: Layouts = defaultLayout;

  mounted() {
    domScheduler.read(() => {
      if (getLayout() === 'none') {
        domScheduler.write(() => {
          this.$refs.inputs[0].checked = true;
        });
      }
    });
  }

  switch(value: Layouts) {
    if (value === 'none') {
      this.previousLayout = getLayout();
      setLayout(value);
    } else {
      setLayout(this.previousLayout);
    }
  }
}
