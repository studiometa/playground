import { defineConfig } from '@studiometa/webpack-config';
import { playgroundPreset } from '@studiometa/playground/preset';

export default defineConfig({
	presets: [
		playgroundPreset({
			head: {
				title: 'Playground demo',
			},
			header: {
				title: '<span class="font-bold">Playground demo</span>',
			},
			defaults: {
				html: 'hello world',
				style: 'body {\n\tbackground: #eee;\n}',
			},
		}),
	],
});
