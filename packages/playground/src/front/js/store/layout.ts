import { domScheduler } from '@studiometa/js-toolkit/utils';
import { fallbackStore as store } from '../utils/storage/index.js';

export type Layouts = 'top' | 'right' | 'bottom' | 'left';

const key = 'layout';
const layouts = new Set<Layouts>(['top', 'right', 'bottom', 'left']);
const defaultLayout = 'top';

export async function getLayout(): Promise<Layouts> {
  return ((await store.get(key)) || defaultLayout) as Layouts;
}

export async function layoutIs(position: Layouts) {
  return (await getLayout()) === position;
}

export async function layoutIsVertical() {
  const layout = await getLayout();
  return layout === 'left' || layout === 'right';
}

export async function layoutIsHoritontal() {
  const layout = await getLayout();
  return layout === 'top' || layout === 'bottom';
}

export async function layoutUpdateDOM(value?: Layouts) {
  const layout = value ?? (await getLayout());
  domScheduler.write(() => {
    document.documentElement.classList.toggle('is-top', layout === 'top');
    document.documentElement.classList.toggle('is-right', layout === 'right');
    document.documentElement.classList.toggle('is-bottom', layout === 'bottom');
    document.documentElement.classList.toggle('is-left', layout === 'left');
  });
}

export async function setLayout(value?: Layouts) {
  let layout = value ?? (await getLayout());

  if (!layouts.has(layout)) {
    console.log(`The "${layout}" layout is not valid.`);

    layout = defaultLayout;
  }
  await Promise.all([store.set(key, layout), layoutUpdateDOM(layout)]);
}

export function watchLayout(callback: (newValue: Layouts) => unknown) {
  return store.watch((k, newValue: Layouts) => k === key && callback(newValue));
}
