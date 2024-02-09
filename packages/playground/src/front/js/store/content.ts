import { historyReplace } from '@studiometa/js-toolkit/utils';
import { zipUrlStore as store } from '../utils/storage/index.js';

export function getScript() {
  return (
    store.get('script') ??
    `import { Base, createApp } from '@unistra/design-system';

createApp({
  components: [Base],
});
`
  );
}

export function setScript(value) {
  store.set('script', value);
}

export function getHtml() {
  return (
    store.get('html') ??
    `<unistra-base>
  Hello world
</unistra-base>`
  );
}

export function setHtml(value) {
  store.set('html', value);
}

export function getStyle() {
  return (
    store.get('style') ??
    `body {
  padding: 1rem;
}`
  );
}

export function setStyle(value) {
  store.set('style', value);
}
