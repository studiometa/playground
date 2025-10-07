import { domScheduler } from '@studiometa/js-toolkit/utils';
import { fallbackStore as store } from '../utils/storage/index.js';

export type Themes = 'dark' | 'light';

const key = 'theme' as const;
const themes = new Set<Themes>(['dark', 'light']);
const defaultTheme = 'light';

export async function getTheme(): Promise<Themes> {
  return ((await store.get(key)) || defaultTheme) as Themes;
}

export async function themeIsDark() {
  return (await getTheme()) === 'dark';
}

export async function themeIsLight() {
  return (await getTheme()) === 'light';
}

export async function themeUpdateDOM(value?: Themes) {
  const theme = value ?? (await getTheme());
  domScheduler.write(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  });
}

export async function setTheme(value?: Themes) {
  let theme = value ?? (await getTheme());

  if (!themes.has(theme)) {
    console.warn(`The "${theme}" theme is not valid.`);

    theme = defaultTheme;
  }

  store.set(key, theme);
  themeUpdateDOM(theme);
}

export function watchTheme(callback: (value: Themes) => unknown) {
  return store.watch((k, newValue: Themes) => k === key && callback(newValue));
}
