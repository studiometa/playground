import { defineConfig } from '@studiometa/webpack-config';
import { playgroundPreset } from '@studiometa/playground';

export default defineConfig({
	presets: [playgroundPreset()],
	webpack(config) {
	}
});
