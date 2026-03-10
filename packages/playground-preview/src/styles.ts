export const styles = /* css */ `
  :host {
    --pg-bg: #f4f4f5;
    --pg-bg-dark: #27272a;
    --pg-controls-bg: rgba(0, 0, 0, 0.55);
    --pg-controls-bg-hover: rgba(0, 0, 0, 0.75);
    --pg-controls-color: #fff;
    --pg-border-color: #e4e4e7;
    --pg-border-color-dark: #3f3f46;
    --pg-border-radius: 8px;
    --pg-loader-color: #a1a1aa;
    --pg-transition-duration: 200ms;

    display: block;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .container {
    position: relative;
    overflow: hidden;
    border-radius: var(--pg-border-radius);
    border: 1px solid var(--pg-border-color);
    background: var(--pg-bg);
    resize: horizontal;
  }

  :host([theme="dark"]) .container {
    background: var(--pg-bg-dark);
    border-color: var(--pg-border-color-dark);
  }

  @media (prefers-color-scheme: dark) {
    :host([theme="auto"]) .container,
    :host(:not([theme])) .container {
      background: var(--pg-bg-dark);
      border-color: var(--pg-border-color-dark);
    }
  }

  .iframe-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  iframe {
    display: block;
    border: 0;
    background: #fff;
    transform-origin: top left;
    transition: opacity var(--pg-transition-duration) ease;
  }

  :host([theme="dark"]) iframe {
    background: #18181b;
  }

  @media (prefers-color-scheme: dark) {
    :host([theme="auto"]) iframe,
    :host(:not([theme])) iframe {
      background: #18181b;
    }
  }

  iframe.loading {
    opacity: 0;
  }

  .controls {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    gap: 4px;
    padding: 8px;
    z-index: 10;
  }

  .controls button,
  .controls a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: var(--pg-controls-bg);
    color: var(--pg-controls-color);
    cursor: pointer;
    transition: background-color var(--pg-transition-duration) ease;
    text-decoration: none;
  }

  .controls button:hover,
  .controls a:hover {
    background: var(--pg-controls-bg-hover);
  }

  .controls svg {
    width: 14px;
    height: 14px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .loader {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--pg-loader-color);
    pointer-events: none;
    transition: opacity var(--pg-transition-duration) ease;
  }

  .loader.hidden {
    opacity: 0;
  }

  .loader svg {
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--pg-loader-color);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
  }
`;
