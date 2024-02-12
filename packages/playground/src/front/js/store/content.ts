import { historyReplace } from '@studiometa/js-toolkit/utils';
import { zipUrlStore as store } from '../utils/storage/index.js';
import { getDefaultHtml, getDefaultScript, getDefaultStyle } from './config.js';

export async function getScript() {
  return store.get('script') ?? await getDefaultScript();
}

export function setScript(value: string) {
  store.set('script', value);
}

export async function getHtml() {
  return store.get('html') ?? await getDefaultHtml();
}

export function setHtml(value: string) {
  store.set('html', value);
}

export async function getStyle() {
  return store.get('style') ?? await getDefaultStyle();
}

export function setStyle(value: string) {
  store.set('style', value);
}
