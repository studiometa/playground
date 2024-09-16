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
    emits: ['iframe-ready'],
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
    /* eslint-disable no-underscore-dangle */
    // @ts-ignore
    this.window.__DEV__ = true;
    /* eslint-enable no-underscore-dangle */

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
    this.doc.head.append(this.style.cloneNode());

    // Add custom script
    this.script = this.doc.createElement('script');
    this.script.type = 'module';
    this.script.id = 'script';
    this.doc.head.append(this.script.cloneNode());

    await nextTick();
    await this.updateStyle();
    await this.updateScript(false);

    this.$refs.iframe.classList.remove('opacity-0');
    this.$emit('iframe-ready');
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

    this.$emit('esbuild-ready');
  }

  initImportMaps() {
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
      tailwindScript.src = 'https://cdn.tailwindcss.com';
      tailwindScript.id = 'tw';
      tailwindScript.addEventListener('load', () => {
        // Add Tailwind config
        const tailwindConfig = this.doc.createElement('script');
        tailwindConfig.textContent = "tailwind.config = { darkMode: 'class' };";
        this.doc.head.append(tailwindConfig);
        resolve();
      });
      this.doc.head.append(tailwindScript);
    });
  }

  async updateHtml() {
    this.$log('updating html...');
    await nextTick();
    const html = await getHtml();
    if (html !== this.doc.body.innerHTML) {
      this.doc.body.innerHTML = html;
    }
    await nextTick();
    this.$log('html updated!');
    this.$emit('html-updated');
    await this.updateScript(false);
  }

  async updateStyle() {
    this.$log('updating style...');
    await nextTick();
    const style = await getStyle();
    if (style) {
      const clone = this.style.cloneNode() as HTMLStyleElement;
      clone.textContent = style;
      // @ts-ignore
      this.window.style.replaceWith(clone);
    }
    await nextTick();
    this.$log('style updated!');
    this.$emit('style-updated');
  }

  async updateScript(resetHtml = true): Promise<void> {
    this.$log('updating script...');
    if (resetHtml) {
      this.doc.body.replaceWith(this.doc.body.cloneNode(true));
      await nextTick();
    }
    await nextTick();

    const clone = this.script.cloneNode() as HTMLScriptElement;
    const newScriptContent = await getScript();
    const newScript = `${newScriptContent}\ndocument.dispatchEvent(new Event("readystatechange"))`;
    try {
      await Iframe.esbuildPromise;
      const results = await esbuild.transform(newScript, {
        target: 'es2022',
        loader: 'ts',
      });
      clone.src = URL.createObjectURL(new Blob([results.code], { type: 'application/javascript' }));
      // clone.textContent = results.code;
      // @ts-ignore
      this.window.script.replaceWith(clone);
      this.$log('script updated!');
      this.$emit('script-updated');
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
