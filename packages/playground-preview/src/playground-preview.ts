import { zip } from './zip.js';
import { styles } from './styles.js';
import {
  zoomInIcon,
  zoomOutIcon,
  resetIcon,
  externalLinkIcon,
  reloadIcon,
  loaderIcon,
} from './icons.js';

const DEFAULT_BASE_URL = 'https://studiometa-playground.pages.dev';
const DEFAULT_HEIGHT = '60vh';
const DEFAULT_ZOOM = 0.9;
const ZOOM_STEP = 1.1;

/**
 * Resolve the current theme value to 'dark' or 'light'.
 */
function resolveTheme(theme: string | null): 'dark' | 'light' {
  if (theme === 'dark' || theme === 'light') {
    return theme;
  }

  // 'auto' or unset — use system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * A web component to embed @studiometa/playground previews anywhere.
 *
 * @example
 * ```html
 * <playground-preview height="80vh" theme="dark">
 *   <script type="playground/html">
 *     <div><h1>Hello World</h1></div>
 *   </script>
 *   <script type="playground/script">
 *     console.log('hello');
 *   </script>
 *   <script type="playground/css">
 *     h1 { color: red; }
 *   </script>
 * </playground-preview>
 * ```
 */
export class PlaygroundPreview extends HTMLElement {
  static observedAttributes = [
    'html',
    'script',
    'css',
    'base-url',
    'height',
    'zoom',
    'theme',
    'no-controls',
    'header',
  ];

  #shadow: ShadowRoot;
  #scale: number = DEFAULT_ZOOM;
  #iframe: HTMLIFrameElement | null = null;
  #observer: IntersectionObserver | null = null;
  #mediaQuery: MediaQueryList | null = null;
  #mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;
  #isVisible = false;
  #isConnected = false;

  // Cached content from <script type="playground/..."> children, read once
  #childHtml: string | null = null;
  #childScript: string | null = null;
  #childCss: string | null = null;

  // DOM references
  #container: HTMLDivElement | null = null;
  #iframeWrapper: HTMLDivElement | null = null;
  #loader: HTMLDivElement | null = null;
  #controls: HTMLDivElement | null = null;
  #openLink: HTMLAnchorElement | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#isConnected = true;
    this.#readChildContent();
    this.#render();
    this.#setupIntersectionObserver();
    this.#setupMediaQuery();
  }

  disconnectedCallback() {
    this.#isConnected = false;
    this.#observer?.disconnect();
    this.#observer = null;

    if (this.#mediaQuery && this.#mediaQueryHandler) {
      this.#mediaQuery.removeEventListener('change', this.#mediaQueryHandler);
      this.#mediaQuery = null;
      this.#mediaQueryHandler = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.#isConnected || oldValue === newValue) return;

    switch (name) {
      case 'height':
        this.#updateContainerHeight();
        break;
      case 'zoom':
        this.#scale = Number(newValue) || DEFAULT_ZOOM;
        this.#updateIframeScale();
        break;
      case 'no-controls':
        this.#updateControlsVisibility();
        break;
      case 'html':
      case 'script':
      case 'css':
      case 'base-url':
      case 'theme':
      case 'header':
        if (this.#isVisible) {
          this.#updateIframeSrc();
        }
        break;
    }
  }

  // -------------------------------------------------------
  // Content resolution
  // -------------------------------------------------------

  /**
   * Read content from <script type="playground/..."> children.
   * Done once at connectedCallback.
   */
  #readChildContent() {
    for (const script of this.querySelectorAll('script')) {
      switch (script.type) {
        case 'playground/html':
          this.#childHtml = script.textContent;
          break;
        case 'playground/script':
          this.#childScript = script.textContent;
          break;
        case 'playground/css':
          this.#childCss = script.textContent;
          break;
      }
    }
  }

  /**
   * Get content for a given type, preferring child content over attributes.
   */
  #getContent(type: 'html' | 'script' | 'css'): string {
    const childContent =
      type === 'html'
        ? this.#childHtml
        : type === 'script'
          ? this.#childScript
          : this.#childCss;

    if (childContent != null) {
      return childContent.trim();
    }

    return this.getAttribute(type)?.trim() ?? '';
  }

  // -------------------------------------------------------
  // URL building
  // -------------------------------------------------------

  /**
   * Build the playground iframe URL with editors hidden.
   */
  #buildSrc(): string {
    const baseUrl = this.getAttribute('base-url') || DEFAULT_BASE_URL;
    const theme = resolveTheme(this.getAttribute('theme'));
    const header = this.getAttribute('header');

    const html = this.#getContent('html');
    const script = this.#getContent('script');
    const css = this.#getContent('css');

    const params = new URLSearchParams();
    params.set('html', zip(html));
    params.set('script', zip(script));

    if (css) {
      params.set('style', zip(css));
    }

    params.set('html-editor', 'false');
    params.set('script-editor', 'false');
    params.set('style-editor', 'false');
    params.set('theme', theme);

    if (header) {
      params.set('header', header);
    }

    // Use hash instead of query string to avoid server-side URL length issues
    return `${baseUrl}/#${params.toString()}`;
  }

  /**
   * Build URL for "open in new window" — same as src but with editors enabled.
   */
  #buildOpenUrl(): string {
    const baseUrl = this.getAttribute('base-url') || DEFAULT_BASE_URL;
    const theme = resolveTheme(this.getAttribute('theme'));

    const html = this.#getContent('html');
    const script = this.#getContent('script');
    const css = this.#getContent('css');

    const params = new URLSearchParams();
    params.set('html', zip(html));
    params.set('script', zip(script));

    if (css) {
      params.set('style', zip(css));
    }

    params.set('theme', theme);

    return `${baseUrl}/#${params.toString()}`;
  }

  // -------------------------------------------------------
  // Rendering
  // -------------------------------------------------------

  #render() {
    const height = this.getAttribute('height') || DEFAULT_HEIGHT;
    const hasControls = !this.hasAttribute('no-controls');

    this.#shadow.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="container" style="height: ${height}">
        <div class="iframe-wrapper"></div>
        <div class="loader">${loaderIcon}</div>
        ${hasControls ? this.#renderControls() : ''}
      </div>
    `;

    this.#container = this.#shadow.querySelector('.container');
    this.#iframeWrapper = this.#shadow.querySelector('.iframe-wrapper');
    this.#loader = this.#shadow.querySelector('.loader');
    this.#controls = this.#shadow.querySelector('.controls');
    this.#openLink = this.#shadow.querySelector('.open-link');

    this.#bindControlEvents();
  }

  #renderControls(): string {
    return /* html */ `
      <div class="controls">
        <button type="button" class="zoom-in" title="Zoom in">
          <span class="sr-only">Zoom in</span>
          ${zoomInIcon}
        </button>
        <button type="button" class="zoom-out" title="Zoom out">
          <span class="sr-only">Zoom out</span>
          ${zoomOutIcon}
        </button>
        <button type="button" class="zoom-reset" title="Reset zoom">
          <span class="sr-only">Reset zoom</span>
          ${resetIcon}
        </button>
        <a class="open-link" target="_blank" rel="noopener" title="Open in a new window">
          <span class="sr-only">Open in a new window</span>
          ${externalLinkIcon}
        </a>
        <button type="button" class="reload" title="Reload">
          <span class="sr-only">Reload</span>
          ${reloadIcon}
        </button>
      </div>
    `;
  }

  #bindControlEvents() {
    const controls = this.#controls;
    if (!controls) return;

    controls.querySelector('.zoom-in')?.addEventListener('click', () => {
      this.#scale *= ZOOM_STEP;
      this.#updateIframeScale();
    });

    controls.querySelector('.zoom-out')?.addEventListener('click', () => {
      this.#scale /= ZOOM_STEP;
      this.#updateIframeScale();
    });

    controls.querySelector('.zoom-reset')?.addEventListener('click', () => {
      this.#scale = Number(this.getAttribute('zoom')) || DEFAULT_ZOOM;
      this.#updateIframeScale();
    });

    controls.querySelector('.reload')?.addEventListener('click', () => {
      this.#reloadIframe();
    });
  }

  // -------------------------------------------------------
  // Iframe lifecycle
  // -------------------------------------------------------

  #createIframe() {
    if (this.#iframe || !this.#iframeWrapper) return;

    const src = this.#buildSrc();

    this.#iframe = document.createElement('iframe');
    this.#iframe.src = src;
    this.#iframe.setAttribute('frameborder', '0');
    this.#iframe.classList.add('loading');

    this.#iframe.addEventListener('load', () => {
      this.#iframe?.classList.remove('loading');
      this.#loader?.classList.add('hidden');
    });

    this.#updateIframeScale();
    this.#updateOpenLink();

    this.#iframeWrapper.appendChild(this.#iframe);
  }

  #reloadIframe() {
    if (!this.#iframeWrapper) return;

    this.#iframe?.remove();
    this.#iframe = null;
    this.#loader?.classList.remove('hidden');
    this.#createIframe();
  }

  #updateIframeSrc() {
    if (!this.#iframe) return;

    const src = this.#buildSrc();
    this.#iframe.classList.add('loading');
    this.#loader?.classList.remove('hidden');
    this.#iframe.src = src;
    this.#updateOpenLink();
  }

  #updateIframeScale() {
    if (!this.#iframe) return;

    const height = this.getAttribute('height') || DEFAULT_HEIGHT;
    const scale = this.#scale;

    Object.assign(this.#iframe.style, {
      width: `${(1 / scale) * 100}%`,
      height: `calc(${1 / scale} * ${height})`,
      transform: `scale(${scale})`,
    });
  }

  #updateOpenLink() {
    if (!this.#openLink) return;
    this.#openLink.href = this.#buildOpenUrl();
  }

  // -------------------------------------------------------
  // Attribute-driven updates
  // -------------------------------------------------------

  #updateContainerHeight() {
    if (!this.#container) return;
    const height = this.getAttribute('height') || DEFAULT_HEIGHT;
    this.#container.style.height = height;
    this.#updateIframeScale();
  }

  #updateControlsVisibility() {
    if (this.hasAttribute('no-controls')) {
      this.#controls?.remove();
      this.#controls = null;
      this.#openLink = null;
    } else if (!this.#controls && this.#container) {
      this.#container.insertAdjacentHTML('beforeend', this.#renderControls());
      this.#controls = this.#shadow.querySelector('.controls');
      this.#openLink = this.#shadow.querySelector('.open-link');
      this.#bindControlEvents();
      this.#updateOpenLink();
    }
  }

  // -------------------------------------------------------
  // Lazy loading
  // -------------------------------------------------------

  #setupIntersectionObserver() {
    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.#isVisible) {
            this.#isVisible = true;
            this.#createIframe();
            // Keep observing in case the element leaves and re-enters the viewport
          }
        }
      },
      { rootMargin: '100px' },
    );

    this.#observer.observe(this);
  }

  // -------------------------------------------------------
  // Media query (auto theme)
  // -------------------------------------------------------

  #setupMediaQuery() {
    const theme = this.getAttribute('theme');
    if (theme && theme !== 'auto') return;

    this.#mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.#mediaQueryHandler = () => {
      if (this.#isVisible) {
        this.#updateIframeSrc();
      }
    };
    this.#mediaQuery.addEventListener('change', this.#mediaQueryHandler);
  }
}
