import { domScheduler } from '@studiometa/js-toolkit/utils';
import { fallbackStore as store } from '../utils/storage/index.js';

export type HeaderVisibility = 'visible' | 'hidden';

const key = 'header';
const headerVisibilities = new Set<HeaderVisibility>(['visible', 'hidden']);
const defaultHeaderVisibility = 'visible';

export async function getHeaderVisibility(): Promise<HeaderVisibility> {
  return ((await store.get(key)) || defaultHeaderVisibility) as HeaderVisibility;
}

export async function headerIs(position: HeaderVisibility) {
  return (await getHeaderVisibility()) === position;
}

export async function headerIsVisible() {
  return headerIs('visible');
}

export async function headerIsHidden() {
  return headerIs('hidden');
}

export async function headerUpdateDOM(value?: HeaderVisibility) {
  const header = value ?? (await getHeaderVisibility());
  domScheduler.write(() => {
    document.documentElement.classList.toggle('has-header', header === 'visible');
  });
}

export async function setHeaderVisibility(value?: HeaderVisibility) {
  let header = value ?? (await getHeaderVisibility());
  if (!headerVisibilities.has(header)) {
    console.warn(`The "${header}" header visibility is not valid.`);
    header = defaultHeaderVisibility;
  }
  await Promise.all([store.set(key, header), headerUpdateDOM(header)]);
}

export function watchHeaderVisibility(callback: (value: HeaderVisibility) => unknown) {
  return store.watch((k, newValue: HeaderVisibility) => k === key && callback(newValue));
}
