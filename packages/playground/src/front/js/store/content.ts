import { zipUrlStore as store } from '../utils/storage/index.js';
import {
  getDefaultHtml,
  getDefaultScript,
  getDefaultStyle,
  getHtmlLoader,
  getScriptLoader,
  getStyleLoader,
} from './config.js';

export async function getScript() {
  return store.get('script') ?? (await getDefaultScript());
}

export function setScript(value: string) {
  store.set('script', value);
}

export async function getTransformedScript() {
  const loader = getScriptLoader();
  const script = await getScript();
  return loader(script);
}

export async function getHtml() {
  return store.get('html') ?? (await getDefaultHtml());
}

export async function getTransformedHtml() {
  const loader = getHtmlLoader();
  const html = await getHtml();
  return loader(html);
}

export function setHtml(value: string) {
  store.set('html', value);
}

export async function getStyle() {
  return store.get('style') ?? (await getDefaultStyle());
}

export function setStyle(value: string) {
  store.set('style', value);
}

export async function getTransformedStyle() {
  const loader = getStyleLoader();
  const style = await getStyle();
  return loader(style);
}
