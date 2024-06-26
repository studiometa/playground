# @studiometa/playground

[![NPM Version](https://img.shields.io/npm/v/@studiometa/playground.svg?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@studiometa/playground/)
[![Downloads](https://img.shields.io/npm/dm/@studiometa/playground?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@studiometa/playground/)
[![Size](https://img.shields.io/bundlephobia/minzip/@studiometa/playground?style=flat&colorB=3e63dd&colorA=414853&label=size)](https://bundlephobia.com/package/@studiometa/playground)
[![Dependency Status](https://img.shields.io/librariesio/release/npm/@studiometa/playground?style=flat&colorB=3e63dd&colorA=414853)](https://david-dm.org/studiometa/js-toolkit)

A packaged small code editor for shareable demo, deploy it in seconds.

![Screenshots of the playground in light and dark mode](https://raw.githubusercontent.com/studiometa/playground/main/static/screenshots.png)

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

You can configure the playground by passing a configuration object to the `playgroundPreset` function. Have a look at [the demo](https://github.com/studiometa/playground/blob/main/packages/demo/meta.config.js) for all available options.

When you are ready, run `npx meta build` and you can deploy the generated `dist/` folder to any static hosting of your choice.
