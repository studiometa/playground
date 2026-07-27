/**
 * The base URLs that resolve to no valid origin inside the preview iframe.
 * A `srcdoc`/`about:blank` document reports one of these as `window.location.href`,
 * which makes `new URL('/some-path', window.location.href)` throw an `Invalid URL`.
 */
const OPAQUE_BASES = new Set(['about:srcdoc', 'about:blank']);

/**
 * Rewrite an opaque iframe base (`about:srcdoc`, `about:blank`) to a real fallback base.
 * Any other base is passed through untouched.
 */
function resolveBase(base: string | URL | undefined, fallback: string): string | URL | undefined {
  if (base === undefined || base === null) {
    return base;
  }
  return OPAQUE_BASES.has(String(base)) ? fallback : base;
}

/**
 * Create a `URL` subclass that resolves opaque iframe bases against a real origin.
 *
 * `window.location` is `[LegacyUnforgeable]` and cannot be reassigned, so we cannot
 * mock it directly. Instead we patch the iframe's `URL` global: whenever code passes
 * the iframe's `about:srcdoc`/`about:blank` location as a base, it is transparently
 * rewritten to `fallback` so `new URL('/some-path', window.location.href)` resolves
 * as if the document were served from a real origin.
 *
 * @param NativeURL The iframe realm's native `URL` constructor.
 * @param fallback  The base to substitute for opaque bases (defaults to `http://localhost/`).
 */
export function createPatchedUrl(
  NativeURL: typeof URL,
  fallback = 'http://localhost/',
): typeof URL {
  return class PatchedURL extends NativeURL {
    constructor(url: string | URL, base?: string | URL) {
      super(url, resolveBase(base, fallback));
    }

    static parse(url: string | URL, base?: string | URL): URL | null {
      return NativeURL.parse(url, resolveBase(base, fallback));
    }

    static canParse(url: string | URL, base?: string | URL): boolean {
      return NativeURL.canParse(url, resolveBase(base, fallback));
    }
  };
}
