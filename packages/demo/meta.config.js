import { defineConfig } from '@studiometa/webpack-config';
import { playgroundPreset } from '@studiometa/playground/preset';

export default defineConfig({
	// @todo add options for Twig context to the preset
	presets: [playgroundPreset()],
});
