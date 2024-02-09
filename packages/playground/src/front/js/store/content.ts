import { historyReplace } from '@studiometa/js-toolkit/utils';
import { zipUrlStore as store } from '../utils/storage/index.js';

export function getScript() {
  return store.get('script') ?? '';
}

export function setScript(value) {
  store.set('script', value);
}

export function getHtml() {
  return store.get('html') ?? '';
}

export function setHtml(value) {
  store.set('html', value);
}

export function getStyle() {
  return (
    store.get('style') ?? ''
  );
}

export function setStyle(value) {
  store.set('style', value);
}
