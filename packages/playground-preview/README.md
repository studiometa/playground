# @studiometa/playground-preview

A lightweight web component to embed [`@studiometa/playground`](https://github.com/studiometa/playground) previews anywhere — framework-agnostic, zero configuration.

## Installation

```bash
npm install @studiometa/playground-preview
```

## Usage

### Auto-registration

Import the package to automatically register the `<playground-preview>` custom element:

```js
import '@studiometa/playground-preview';
```

### Manual registration

Import the class and register it yourself with a custom tag name:

```js
import { PlaygroundPreview } from '@studiometa/playground-preview/element';

customElements.define('my-playground', PlaygroundPreview);
```

### Short content via attributes

```html
<playground-preview
  html="<h1>Hello</h1>"
  script="console.log('hi')"
  css="h1 { color: red }"
></playground-preview>
```

### Long content via `<script>` children

For longer code snippets, use `<script>` elements with custom `type` attributes. The browser won't execute them, and the component reads their `textContent`:

```html
<playground-preview height="80vh" theme="dark">
  <script type="playground/html">
    <div class="flex items-center gap-4">
      <h1>Hello World</h1>
      <p>Some longer content here...</p>
    </div>
  </script>

  <script type="playground/script">
    import { Base, createApp } from '@studiometa/js-toolkit';

    class App extends Base {
      static config = { name: 'App' };
      mounted() { console.log('mounted!'); }
    }

    export default createApp(App);
  </script>

  <script type="playground/css">
    @import "tailwindcss";
    h1 { @apply text-4xl font-bold; }
  </script>
</playground-preview>
```

When both attributes and `<script>` children are provided for the same language, children take precedence.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `html` | `string` | `""` | HTML content |
| `script` | `string` | `""` | JavaScript content |
| `css` | `string` | `""` | CSS content |
| `base-url` | `string` | `https://studiometa-playground.pages.dev` | Playground instance URL |
| `height` | `string` | `60vh` | Container height |
| `zoom` | `number` | `0.9` | Initial iframe scale |
| `theme` | `string` | `auto` | `dark`, `light`, or `auto` (uses `prefers-color-scheme`) |
| `no-controls` | `boolean` | `false` | Hide zoom/reload/open controls |
| `header` | `string` | — | Passed through to the playground URL |

## Controls

When `no-controls` is not set, the component displays a toolbar with:

- **Zoom in / out / reset** — adjust the iframe scale
- **Reload** — re-creates the iframe
- **Open in new window** — opens the full playground with editors enabled

## Theming

The component uses Shadow DOM for style encapsulation. You can customize its appearance via CSS custom properties:

```css
playground-preview {
  --pg-bg: #f4f4f5;
  --pg-bg-dark: #27272a;
  --pg-controls-bg: rgba(0, 0, 0, 0.55);
  --pg-controls-bg-hover: rgba(0, 0, 0, 0.75);
  --pg-controls-color: #fff;
  --pg-border-color: #e4e4e7;
  --pg-border-color-dark: #3f3f46;
  --pg-border-radius: 8px;
  --pg-loader-color: #a1a1aa;
  --pg-transition-duration: 200ms;
}
```

## Lazy loading

The iframe is only created when the component scrolls into the viewport (using `IntersectionObserver` with a `100px` root margin). A spinner is displayed while the iframe loads.

## License

MIT
