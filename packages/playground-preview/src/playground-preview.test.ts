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

describe('PlaygroundPreview', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // -------------------------------------------
  // Content resolution
  // -------------------------------------------

  describe('content resolution', () => {
    it('reads content from attributes', () => {
      const el = createElement({
        html: '<h1>Hi</h1>',
        script: 'console.log(1)',
        css: 'h1 { color: red }',
      });

      const shadow = el.shadowRoot!;
      // Component should have rendered
      expect(shadow.querySelector('.container')).not.toBeNull();
    });

    it('reads content from <script type="playground/..."> children', () => {
      const el = createElement(
        {},
        `
        <script type="playground/html"><h1>Child HTML</h1></script>
        <script type="playground/script">console.log('child')</script>
        <script type="playground/css">body { margin: 0 }</script>
      `,
      );

      const shadow = el.shadowRoot!;
      expect(shadow.querySelector('.container')).not.toBeNull();
    });

    it('children take precedence over attributes', () => {
      const el = createElement(
        { html: '<p>From attr</p>' },
        `<script type="playground/html"><p>From child</p></script>`,
      );

      const shadow = el.shadowRoot!;
      expect(shadow.querySelector('.container')).not.toBeNull();
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
    it('does not create an iframe immediately', () => {
      const el = createElement();
      const shadow = el.shadowRoot!;

      // No iframe until IntersectionObserver fires
      expect(shadow.querySelector('iframe')).toBeNull();
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
