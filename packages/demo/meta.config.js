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
        {
          // Pinned: js-toolkit v4 is published on the `next` dist-tag, so an
          // unversioned esm.sh URL would still serve v3.
          specifier: '@studiometa/js-toolkit',
          version: '4.0.0-alpha.1',
          esmSh: { bundle: false },
          subpaths: true,
        },
        {
          specifier: 'demo-lib',
          source: './lib/**/*.ts',
          subpaths: true,
        },
      ],
      loaders: {
        html: resolve('./html-loader.ts'),
      },
      defaults: {
        html: '<p class="m-10" data-component="App">hello world</p>',
        style: `html.dark {
  color: #fff;
  background-color: #222;
}`,
        script: `import { Base, registerComponent } from '@studiometa/js-toolkit';
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

registerComponent(App);`,
      },
    }),
  ],
});
