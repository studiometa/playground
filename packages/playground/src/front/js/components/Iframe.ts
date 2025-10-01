import { Base } from '@studiometa/js-toolkit';
import type { BaseProps } from '@studiometa/js-toolkit';
import { nextTick, isArray } from '@studiometa/js-toolkit/utils';
import * as esbuild from 'esbuild-wasm';
import {
  themeIsDark,
  watchTheme,
  getTransformedHtml as getHtml,
  getTransformedStyle as getStyle,
  getTransformedScript as getScript,
} from '../store/index.js';

export interface IframeProps extends BaseProps {
  $refs: {
    iframe: HTMLIFrameElement;
  };
  $options: {
    tailwindcss: boolean;
    importMap: Record<string, string>;
  };
}

/**
 * Iframe class.
 */
export default class Iframe extends Base<IframeProps> {
  /**
   * Config.
   */
  static config = {
    name: 'Iframe',
    refs: ['iframe'],
    options: {
      tailwindcss: Boolean,
      syncColorScheme: Boolean,
      importMap: Object,
    },
  };

  /**
   * The script element inside the iframe used to inject the script editor's content.
   */
  script: HTMLScriptElement;

  /**
   * Is the esbuild worker ready?
   */
  static isEsbuildInitialized = false;

  /**
   * Esbuild initializer promise.
   * @type {Promise}
   */
  static esbuildPromise;

  /**
   * The style element inside the iframe used to inject the style editor's content.
   */
  style: HTMLStyleElement;

  get window() {
    return this.$refs.iframe.contentWindow;
  }

  get doc() {
    return this.window?.document;
  }

  async mounted() {
    await this.initEsbuild();
    await this.initIframe();
  }

  async initIframe() {
    this.$refs.iframe.classList.add('opacity-0');
    // Enable dev mode in render
    // @ts-expect-error Enable dev mode.
    this.window.__DEV__ = true;

    this.doc.documentElement.innerHTML = `
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
</body>`;
    await this.initImportMaps();

    // Add Tailwind CDN
    if (this.$options.tailwindcss) {
      await this.initTailwind();
    }

    const html = await getHtml();
    if (html) {
      this.doc.body.innerHTML = html;
    }

    if (this.$options.syncColorScheme) {
      this.doc.documentElement.classList.toggle('dark', themeIsDark());
      watchTheme((theme) => {
        this.doc.documentElement.classList.toggle('dark', theme === 'dark');
      });
    }

    // Add custom style
    this.style = this.doc.createElement('style');
    this.style.id = 'style';
    if (this.$options.tailwindcss) {
      this.style.type = 'text/tailwindcss';
    }
    this.doc.head.append(this.style);

    // Add custom script
    this.script = this.doc.createElement('script');
    this.script.type = 'module';
    this.script.id = 'script';
    this.doc.head.append(this.script);

    await nextTick();
    await this.updateStyle();
    await this.updateScript(false);

    this.$refs.iframe.classList.remove('opacity-0');
  }

  async initEsbuild() {
    if (Iframe.isEsbuildInitialized) {
      return;
    }
    try {
      Iframe.esbuildPromise = esbuild.initialize({
        wasmURL: new URL('esbuild-wasm/esbuild.wasm', import.meta.url),
      });
      await Iframe.esbuildPromise;
      Iframe.isEsbuildInitialized = true;
    } catch {
      // Silence is golden.
    }
  }

  async initImportMaps() {
    const importMap = this.doc.createElement('script');
    importMap.type = 'importmap';
    importMap.textContent = JSON.stringify({
      imports: this.$options.importMap,
    });
    this.doc.head.append(importMap);
  }

  async initTailwind(): Promise<void> {
    return new Promise((resolve) => {
      // Add Tailwind CDN
      const tailwindScript = this.doc.createElement('script');
      tailwindScript.src = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
      tailwindScript.id = 'tw';
      tailwindScript.addEventListener('load', () => {
        // Add Tailwind config
        const tailwindConfig = this.doc.createElement('style');
        tailwindConfig.type = 'text/tailwindcss';
        tailwindConfig.textContent = '@custom-variant dark (&:where(.dark, .dark *));';
        this.doc.head.append(tailwindConfig);
        resolve();
      });
      this.doc.head.append(tailwindScript);
    });
  }

  async updateHtml() {
    console.log('updating html...');
    await nextTick();
    const html = await getHtml();
    if (html !== this.doc.body.innerHTML) {
      this.doc.body.innerHTML = html;
    }
    await nextTick();
    console.log('html updated!');
    await this.updateScript(false);
  }

  async updateStyle() {
    console.log('updating style...');
    await nextTick();
    const style = await getStyle();
    this.style.textContent = style;
    await nextTick();
    console.log('style updated!');
  }

  async updateScript(resetHtml = true): Promise<void> {
    console.log('updating script...');
    if (resetHtml) {
      this.doc.body.replaceWith(this.doc.body.cloneNode(true));
      await nextTick();
    }
    await nextTick();

    const newScriptContent = await getScript();
    const newScript = `${newScriptContent}\ndocument.dispatchEvent(new Event("readystatechange"))`;

    try {
      await Iframe.esbuildPromise;
      const results = await esbuild.transform(newScript, {
        target: 'es2020',
      });
      this.script.remove();
      this.script = this.doc.createElement('script');
      this.script.type = 'module';
      this.script.id = 'script';
      this.script.textContent = results.code;
      this.doc.head.append(this.script);
      console.log('script updated!');
    } catch (err) {
      console.log('script not updated due to some errors:');
      if (isArray(err.errors)) {
        for (const error of err.errors) {
          console.error(`${error.text} (${error.location.line}:${error.location.column})`);
        }
      } else {
        console.error(err);
      }
    }
  }
}
