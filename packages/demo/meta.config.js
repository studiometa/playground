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
			defaults: {
				html: '<h1>hello world</h1>',
				style: `body {
  background: lightgreen;
}`,
				script: `import { Base, createApp } from '@studiometa/js-toolkit';

class App extends Base {
	static config = {
		name: 'App',
	};
}

createApp(App);`
			},
		}),
	],
});
