import { describe, it, expect, afterEach } from 'vitest';
import { PlaygroundPreview } from './playground-preview.js';

// Register the custom element for tests
if (!customElements.get('playground-preview')) {
  customElements.define('playground-preview', PlaygroundPreview);
}

/**
 * Create a <playground-preview> element, append it to the DOM, and return it.
 */
function createElement(attrs: Record<string, string> = {}, innerHTML = ''): PlaygroundPreview {
  const el = document.createElement('playground-preview') as PlaygroundPreview;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  if (innerHTML) {
    el.innerHTML = innerHTML;
  }
  document.body.appendChild(el);
  return el;
}

/**
 * Wait for an iframe to appear inside the element's shadow DOM.
 */
function waitForIframe(el: PlaygroundPreview, timeout = 3000): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const shadow = el.shadowRoot!;

    // Already there?
    const existing = shadow.querySelector('iframe');
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const iframe = shadow.querySelector('iframe');
      if (iframe) {
        observer.disconnect();
        resolve(iframe);
      }
    });

    observer.observe(shadow.querySelector('.iframe-wrapper')!, { childList: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out waiting for iframe'));
    }, timeout);
  });
}

/**
 * Wait for the iframe inside the element to be replaced (new element).
 */
function waitForIframeChange(
  el: PlaygroundPreview,
  previousIframe: HTMLIFrameElement,
  timeout = 3000,
): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const shadow = el.shadowRoot!;

    const check = () => {
      const current = shadow.querySelector('iframe');
      if (current && current !== previousIframe) return resolve(current);
      return null;
    };

    // Already changed?
    const result = check();
    if (result) return;

    const observer = new MutationObserver(() => {
      check();
    });

    observer.observe(shadow.querySelector('.iframe-wrapper')!, { childList: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out waiting for iframe change'));
    }, timeout);
  });
}

/**
 * Wait a number of milliseconds.
 */
function wait(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('PlaygroundPreview', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // -------------------------------------------
  // Content resolution
  // -------------------------------------------

  describe('content resolution', () => {
    it('reads content from attributes', async () => {
      const el = createElement({
        html: '<h1>Hi</h1>',
        script: 'console.log(1)',
        css: 'h1 { color: red }',
      });

      const iframe = await waitForIframe(el);
      expect(iframe.src).toContain('html=');
      expect(iframe.src).toContain('script=');
      expect(iframe.src).toContain('style=');
    });

    it('reads content from <script type="playground/..."> children', async () => {
      const el = createElement(
        {},
        `
        <script type="playground/html"><h1>Child HTML</h1></script>
        <script type="playground/script">console.log('child')</script>
        <script type="playground/css">body { margin: 0 }</script>
      `,
      );

      const iframe = await waitForIframe(el);
      expect(iframe.src).toContain('html=');
      expect(iframe.src).toContain('script=');
      expect(iframe.src).toContain('style=');
    });

    it('children take precedence over attributes', async () => {
      const el = createElement(
        { html: '<p>From attr</p>' },
        `<script type="playground/html"><p>From child</p></script>`,
      );

      const iframe = await waitForIframe(el);
      // Both produce different zipped values — child content should win.
      // Build a reference element with only the attribute to compare.
      const refEl = createElement({ html: '<p>From attr</p>' });
      const refIframe = await waitForIframe(refEl);

      // The two iframes should have different src (different html content)
      expect(iframe.src).not.toBe(refIframe.src);
    });
  });

  // -------------------------------------------
  // Rendering
  // -------------------------------------------

  describe('rendering', () => {
    it('creates a shadow root with container, iframe-wrapper, and loader', () => {
      const el = createElement();
      const shadow = el.shadowRoot!;

      expect(shadow.querySelector('.container')).not.toBeNull();
      expect(shadow.querySelector('.iframe-wrapper')).not.toBeNull();
      expect(shadow.querySelector('.loader')).not.toBeNull();
    });

    it('renders controls by default', () => {
      const el = createElement();
      const shadow = el.shadowRoot!;

      expect(shadow.querySelector('.controls')).not.toBeNull();
      expect(shadow.querySelector('.zoom-in')).not.toBeNull();
      expect(shadow.querySelector('.zoom-out')).not.toBeNull();
      expect(shadow.querySelector('.zoom-reset')).not.toBeNull();
      expect(shadow.querySelector('.reload')).not.toBeNull();
      expect(shadow.querySelector('.open-link')).not.toBeNull();
    });

    it('hides controls when no-controls is set', () => {
      const el = createElement({ 'no-controls': '' });
      const shadow = el.shadowRoot!;

      expect(shadow.querySelector('.controls')).toBeNull();
    });

    it('uses default height of 60vh', () => {
      const el = createElement();
      const container = el.shadowRoot!.querySelector('.container') as HTMLDivElement;

      expect(container.style.height).toBe('60vh');
    });

    it('uses custom height attribute', () => {
      const el = createElement({ height: '80vh' });
      const container = el.shadowRoot!.querySelector('.container') as HTMLDivElement;

      expect(container.style.height).toBe('80vh');
    });

    it('includes styles in shadow DOM', () => {
      const el = createElement();
      const style = el.shadowRoot!.querySelector('style');

      expect(style).not.toBeNull();
      expect(style!.textContent).toContain(':host');
      expect(style!.textContent).toContain('--pg-bg');
    });

    it('includes sr-only labels for accessibility', () => {
      const el = createElement();
      const srOnlyElements = el.shadowRoot!.querySelectorAll('.sr-only');

      expect(srOnlyElements.length).toBeGreaterThanOrEqual(5);
    });
  });

  // -------------------------------------------
  // Attribute reactivity
  // -------------------------------------------

  describe('attribute reactivity', () => {
    it('updates container height when height attribute changes', () => {
      const el = createElement({ height: '60vh' });
      const container = el.shadowRoot!.querySelector('.container') as HTMLDivElement;

      expect(container.style.height).toBe('60vh');

      el.setAttribute('height', '100vh');
      expect(container.style.height).toBe('100vh');
    });

    it('toggles controls when no-controls is added/removed', () => {
      const el = createElement();
      const shadow = el.shadowRoot!;

      expect(shadow.querySelector('.controls')).not.toBeNull();

      el.setAttribute('no-controls', '');
      expect(shadow.querySelector('.controls')).toBeNull();

      el.removeAttribute('no-controls');
      expect(shadow.querySelector('.controls')).not.toBeNull();
    });

    it('rebuilds iframe when theme attribute changes on a visible element', async () => {
      const el = createElement({ theme: 'light' });
      const firstIframe = await waitForIframe(el);
      expect(firstIframe.src).toContain('theme=light');

      el.setAttribute('theme', 'dark');

      const secondIframe = await waitForIframeChange(el, firstIframe);
      expect(secondIframe.src).toContain('theme=dark');
      // Iframe was replaced (not the same element)
      expect(secondIframe).not.toBe(firstIframe);
    });

    it('rebuilds iframe when html attribute changes on a visible element', async () => {
      const el = createElement({ html: '<p>Initial</p>' });
      const firstIframe = await waitForIframe(el);

      el.setAttribute('html', '<p>Updated</p>');

      const secondIframe = await waitForIframeChange(el, firstIframe);
      expect(secondIframe).not.toBe(firstIframe);
      expect(secondIframe.src).not.toBe(firstIframe.src);
    });
  });

  // -------------------------------------------
  // Observed attributes
  // -------------------------------------------

  describe('observedAttributes', () => {
    it('observes all required attributes', () => {
      expect(PlaygroundPreview.observedAttributes).toEqual([
        'html',
        'script',
        'css',
        'base-url',
        'height',
        'zoom',
        'theme',
        'no-controls',
        'header',
      ]);
    });
  });

  // -------------------------------------------
  // Lazy loading
  // -------------------------------------------

  describe('lazy loading', () => {
    it('does not create an iframe immediately (element off-screen)', () => {
      // Position the element far off-screen so IntersectionObserver doesn't fire
      const el = createElement();
      el.style.position = 'absolute';
      el.style.top = '999999px';

      // Give it a tick — iframe should still not exist
      expect(el.shadowRoot!.querySelector('iframe')).toBeNull();
    });

    it('creates an iframe when element is in viewport', async () => {
      const el = createElement({ html: '<h1>Test</h1>' });
      const iframe = await waitForIframe(el);

      expect(iframe).not.toBeNull();
      expect(iframe.src).toContain('studiometa-playground.pages.dev');
    });
  });

  // -------------------------------------------
  // Dynamic child content (MutationObserver) — #64
  // -------------------------------------------

  describe('dynamic child content (#64)', () => {
    it('picks up dynamically added <script type="playground/..."> children', async () => {
      const el = createElement();
      const firstIframe = await waitForIframe(el);
      const srcBefore = firstIframe.src;

      // Dynamically add a script child
      const script = document.createElement('script');
      script.type = 'playground/html';
      script.textContent = '<h1>Dynamic</h1>';
      el.appendChild(script);

      // MutationObserver should trigger a reload
      const newIframe = await waitForIframeChange(el, firstIframe);
      expect(newIframe.src).not.toBe(srcBefore);
    });

    it('updates iframe when <script> children are replaced', async () => {
      const el = createElement({}, '<script type="playground/html"><h1>Initial</h1></script>');
      const firstIframe = await waitForIframe(el);
      const srcBefore = firstIframe.src;

      // Remove old script and add new one
      const oldScript = el.querySelector('script')!;
      el.removeChild(oldScript);

      const newScript = document.createElement('script');
      newScript.type = 'playground/html';
      newScript.textContent = '<h1>Replaced</h1>';
      el.appendChild(newScript);

      const newIframe = await waitForIframeChange(el, firstIframe);
      expect(newIframe.src).not.toBe(srcBefore);
    });

    it('uses dynamically added content when element becomes visible later', async () => {
      // Start off-screen
      const el = createElement();
      el.style.position = 'absolute';
      el.style.top = '999999px';

      await wait(50);
      expect(el.shadowRoot!.querySelector('iframe')).toBeNull();

      // Add content while off-screen
      const script = document.createElement('script');
      script.type = 'playground/html';
      script.textContent = '<h1>Added Before Visible</h1>';
      el.appendChild(script);

      await wait(50);

      // Scroll into view
      el.style.position = '';
      el.style.top = '';

      const iframe = await waitForIframe(el);
      expect(iframe).not.toBeNull();
      expect(iframe.src).toContain('html=');
    });

    it('cleans up MutationObserver on disconnect', async () => {
      const el = createElement();
      await waitForIframe(el);

      el.remove();

      // Adding a script after disconnect should not throw
      const script = document.createElement('script');
      script.type = 'playground/html';
      script.textContent = '<h1>After disconnect</h1>';
      el.appendChild(script);

      await wait(50);
      // No error thrown — observer was cleaned up
    });
  });

  // -------------------------------------------
  // Iframe reload on src change — #65
  // -------------------------------------------

  describe('iframe reload on src change (#65)', () => {
    it('destroys and recreates iframe instead of just setting src', async () => {
      const el = createElement({ theme: 'light' });
      const firstIframe = await waitForIframe(el);

      el.setAttribute('theme', 'dark');

      const secondIframe = await waitForIframeChange(el, firstIframe);
      // Must be a different DOM element (full reload)
      expect(secondIframe).not.toBe(firstIframe);
      // Old iframe removed from DOM
      expect(firstIframe.parentElement).toBeNull();
    });

    it('shows loader during iframe reload', async () => {
      const el = createElement({ theme: 'light' });
      const firstIframe = await waitForIframe(el);
      const loader = el.shadowRoot!.querySelector('.loader')!;

      // Simulate load completing
      firstIframe.dispatchEvent(new Event('load'));
      expect(loader.classList.contains('hidden')).toBe(true);

      // Trigger reload
      el.setAttribute('theme', 'dark');
      await waitForIframeChange(el, firstIframe);

      // Loader should be visible again (new iframe is loading)
      expect(loader.classList.contains('hidden')).toBe(false);
    });

    it('updates open link href after reload', async () => {
      const el = createElement({ theme: 'light' });
      const firstIframe = await waitForIframe(el);

      const openLink = el.shadowRoot!.querySelector('.open-link') as HTMLAnchorElement;
      expect(openLink.href).toContain('theme=light');

      el.setAttribute('theme', 'dark');
      await waitForIframeChange(el, firstIframe);

      expect(openLink.href).toContain('theme=dark');
    });

    it('hides loader once new iframe fires load event', async () => {
      const el = createElement({ theme: 'light' });
      const firstIframe = await waitForIframe(el);
      firstIframe.dispatchEvent(new Event('load'));

      el.setAttribute('theme', 'dark');
      const secondIframe = await waitForIframeChange(el, firstIframe);

      const loader = el.shadowRoot!.querySelector('.loader')!;
      expect(loader.classList.contains('hidden')).toBe(false);

      // Simulate load on the new iframe
      secondIframe.dispatchEvent(new Event('load'));
      expect(loader.classList.contains('hidden')).toBe(true);
    });
  });

  // -------------------------------------------
  // Cleanup
  // -------------------------------------------

  describe('disconnectedCallback', () => {
    it('cleans up when removed from DOM', () => {
      const el = createElement();
      expect(el.shadowRoot!.querySelector('.container')).not.toBeNull();

      el.remove();
      // Should not throw
    });
  });
});
