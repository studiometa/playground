import { createApp } from '@studiometa/js-toolkit';
import { Playground } from './components/Playground.js';
import type { PartialPlaygroundConfig } from './store/config.js';
import { setConfig } from './store/config.js';

export function createPlayground(config?: PartialPlaygroundConfig) {
  setConfig(config);

  return createApp(Playground, {
    features: {
      asyncChildren: true,
    },
  });
}
