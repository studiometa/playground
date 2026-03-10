import { PlaygroundPreview } from './playground-preview.js';

export { PlaygroundPreview };

if (!customElements.get('playground-preview')) {
  customElements.define('playground-preview', PlaygroundPreview);
}
