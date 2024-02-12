import { resolve } from 'node:path';
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
			tailwindcss: true,
			syncColorScheme: true,
			importMap: {
				'@studiometa/': 'https://cdn.skypack.dev/@studiometa/',
			},
			loaders: {
				html: resolve('./html-loader.js'),
			},
			defaults: {
				html: '<h1>hello world</h1>\n<pre data-ref="performance">0</pre>',
				style: `body {
  min-height: 100vh;
  background: lightgreen;
  user-select: none;
}`,
				script: `import { Base, createApp } from '@studiometa/js-toolkit';

class App extends Base {
	static config = {
		name: 'App',
		refs: ['performance']
	};

	onClick() {
		this.$refs.performance.textContent = performance.now();
	}
}

createApp(App);`
			},
		}),
	],
});
