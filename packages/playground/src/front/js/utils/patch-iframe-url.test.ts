import { describe, it, expect } from 'vitest';
import { createPatchedUrl } from './patch-iframe-url.js';

describe('createPatchedUrl', () => {
  const PatchedURL = createPatchedUrl(URL);

  it('rewrites an about:srcdoc base to the fallback base', () => {
    expect(new PatchedURL('/some-path', 'about:srcdoc').href).toBe('http://localhost/some-path');
  });

  it('rewrites an about:blank base to the fallback base', () => {
    expect(new PatchedURL('/some-path', 'about:blank').href).toBe('http://localhost/some-path');
  });

  it('normalizes a location-like object base via String()', () => {
    const location = { toString: () => 'about:srcdoc' };
    expect(new PatchedURL('/some-path', location as unknown as string).href).toBe(
      'http://localhost/some-path',
    );
  });

  it('uses a custom fallback base when provided', () => {
    const Custom = createPatchedUrl(URL, 'https://example.dev/');
    expect(new Custom('/foo', 'about:srcdoc').href).toBe('https://example.dev/foo');
  });

  it('leaves a real absolute base untouched', () => {
    expect(new PatchedURL('/foo', 'https://studiometa.fr').href).toBe('https://studiometa.fr/foo');
  });

  it('leaves an absolute url without base untouched', () => {
    expect(new PatchedURL('https://studiometa.fr/foo').href).toBe('https://studiometa.fr/foo');
  });

  it('still throws for a truly invalid url', () => {
    expect(() => new PatchedURL('/foo')).toThrow();
  });

  it('is an instance of the native URL', () => {
    expect(new PatchedURL('/foo', 'about:srcdoc')).toBeInstanceOf(URL);
  });

  describe('static parse', () => {
    it('rewrites an about:srcdoc base', () => {
      expect(PatchedURL.parse('/some-path', 'about:srcdoc')?.href).toBe(
        'http://localhost/some-path',
      );
    });

    it('returns null for an invalid url instead of throwing', () => {
      expect(PatchedURL.parse('/foo')).toBeNull();
    });
  });

  describe('static canParse', () => {
    it('returns true for an about:srcdoc base', () => {
      expect(PatchedURL.canParse('/some-path', 'about:srcdoc')).toBe(true);
    });

    it('returns false for an invalid url', () => {
      expect(PatchedURL.canParse('/foo')).toBe(false);
    });
  });
});
