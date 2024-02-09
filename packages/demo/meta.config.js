import { defineConfig } from '@studiometa/webpack-config';
import { playgroundPreset } from '@studiometa/playground/preset';

export default defineConfig({
	presets: [playgroundPreset()],
});
