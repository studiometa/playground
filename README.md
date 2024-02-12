# @studiometa/playground

> An online small code editor for shareable demo.

## Usage

Install the package:

```sh
npm install @studiometa/playground
```

Create the following files:

**src/templates/pages/index.twig**

```twig
{% include '@playground/pages/index.twig' %}
```

**meta.config.js**

```js
import { playgroundPreset, defineWebpackConfig } from '@studiometa/playground/preset';

export default defineWebpackConfig({
  presets: [playgroundPreset()],
});
```

**tailwind.config.js**

```js
import { tailwindConfig } from '@studiometa/playground/tailwind';

export default tailwindConfig();
```

And then run `npx meta dev` and open `http://localhost:3000`.

![Screenshot of the playground](https://raw.githubusercontent.com/studiometa/playground/main/static/screenshot.png)

You can configure the playground by passing a configuration object to the `playgroundPreset` function. Have a look at [the demo](https://github.com/studiometa/playground/blob/main/packages/demo/meta.config.js) for all available options.

When you are ready, run `npx meta build` and you can deploy the generated `dist/` folder to any static hosting of your choice.
