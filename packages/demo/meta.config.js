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
      dependencies: [
        '@studiometa/js-toolkit',
        {
          specifier: 'demo-lib',
          source: './lib/**/*.ts',
          entry: './lib/index.ts',
        },
      ],
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
import { greet, isDefined } from 'demo-lib';

class App extends Base {
  static config = {
    name: 'App',
  };

  mounted() {
    if (isDefined(this.$el)) {
      this.$el.textContent = greet('World', { shout: true });
    }
  }
}

createApp(App);`,
      },
    }),
  ],
});
