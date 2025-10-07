import { resolve } from 'node:path';
import { playgroundPreset, defineWebpackConfig } from '@studiometa/playground/preset';

export default defineWebpackConfig({
  presets: [
    playgroundPreset({
      head: {
        title: 'Playground',
      },
      header: {
        title: '<span class="font-bold">Playground</span>',
      },
      tailwindcss: true,
      syncColorScheme: true,
      importMap: {
        '@studiometa/': 'https://esm.sh/@studiometa/',
      },
      loaders: {
        html: resolve('./html-loader.ts'),
      },
      defaults: {
        html: '<p class="m-10">hello world</p>',
        style: `html.dark {
  color: #fff;
  background-color: #222;
}`,
        script: `import { Base, createApp } from '@studiometa/js-toolkit';

class App extends Base {
  static config = {
    name: 'App',
  };
}

createApp(App);`,
      },
    }),
  ],
});
