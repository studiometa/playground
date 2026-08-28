import { registerComponent } from '@studiometa/js-toolkit';
import { Playground } from './components/Playground.js';
import type { PartialPlaygroundConfig } from './store/config.js';
import { setConfig } from './store/config.js';

/**
 * Configure the playground and register its root component.
 *
 * There is no application object in js-toolkit v4: an instance exists because
 * its element declares `data-component="Playground"` and its class is
 * registered. The `<body>` element carries that declaration.
 */
export function createPlayground(config?: PartialPlaygroundConfig): void {
  setConfig(config);

  registerComponent(Playground);
}
