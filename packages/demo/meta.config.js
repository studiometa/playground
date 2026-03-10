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
          specifier: '@studiometa/playground-preview',
          source: '../playground-preview/src/**/*.ts',
          entry: '../playground-preview/src/index.ts',
        },
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
        html: `<div class="p-10 space-y-8">
  <h1 class="text-2xl font-bold">Playground Preview Demo</h1>

  <playground-preview height="300px">
    <script type="playground/html">
      <p class="m-10 text-lg">Hello from an embedded playground!</p>
    </script>
    <script type="playground/script">
      document.querySelector('p').addEventListener('click', () => {
        alert('clicked!');
      });
    </script>
    <script type="playground/css">
      p { cursor: pointer; color: royalblue; }
      p:hover { text-decoration: underline; }
    </script>
  </playground-preview>

  <playground-preview
    height="200px"
    html="<h2 class='m-10'>Inline attributes work too</h2>"
    css="h2 { color: tomato; }"
    no-controls
  ></playground-preview>
</div>`,
        style: `html.dark {
  color: #fff;
  background-color: #222;
}`,
        script: `import '@studiometa/playground-preview';`,
      },
    }),
  ],
});
