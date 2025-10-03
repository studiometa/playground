import { domScheduler } from '@studiometa/js-toolkit/utils';
import type { BaseConfig } from '@studiometa/js-toolkit';
import Switcher from './Switcher.js';
import { setTheme, getTheme } from '../store/index.js';
import type { Themes } from '../store/index.js';

export default class ThemeSwitcher extends Switcher {
  static config: BaseConfig = {
    name: 'ThemeSwitcher',
  };

  mounted() {
    domScheduler.read(async () => {
      const value = await getTheme();
      const input = this.$refs.inputs.find((i) => i.value === value);

      domScheduler.write(() => {
        if (input) {
          input.checked = true;
        }
      });
    });
  }

  switch(value: Themes) {
    setTheme(value);
  }

  async onWindowHashchange({ event }) {
    const url = new URL(event.newURL);
    const params = new URLSearchParams(url.hash.replace('#', ''));
    const theme = params.get('theme') as Themes;
    if (theme !== (await getTheme())) {
      setTheme(theme);
    }
  }
}
