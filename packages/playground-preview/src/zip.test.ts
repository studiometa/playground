import { describe, it, expect } from 'vitest';
import { unzlibSync, strToU8, strFromU8 } from 'fflate';
import { zip } from './zip.js';

/**
 * Decompress a zip() result back to string for test assertions.
 */
function unzip(data: string): string {
  const binary = atob(data);
  const bytes = strToU8(binary, true);
  const inflated = unzlibSync(bytes);
  return strFromU8(inflated);
}

describe('zip', () => {
  it('compresses and base64-encodes a string', () => {
    const input = '<h1>Hello World</h1>';
    const result = zip(input);

    // Result should be a valid base64 string
    expect(() => atob(result)).not.toThrow();

    // Should roundtrip correctly
    expect(unzip(result)).toBe(input);
  });

  it('handles empty string', () => {
    const result = zip('');
    expect(unzip(result)).toBe('');
  });

  it('handles multiline content', () => {
    const input = `import { Base } from '@studiometa/js-toolkit';

class App extends Base {
  static config = { name: 'App' };
}`;
    const result = zip(input);
    expect(unzip(result)).toBe(input);
  });

  it('handles unicode characters', () => {
    const input = '<p>Héllo wörld 🌍</p>';
    const result = zip(input);
    expect(unzip(result)).toBe(input);
  });
});
