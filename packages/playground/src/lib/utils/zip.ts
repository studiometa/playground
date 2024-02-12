// Thanks to @vue/repl for the zip and unzip functions
import { zlibSync, unzlibSync, strToU8, strFromU8 } from 'fflate';

/**
 * Zip a string.
 * @param   {string} data The string to compress.
 * @returns {string}      The compressed version of the given string.
 */
export function zip(data: string): string {
  const buffer = strToU8(data);
  const zipped = zlibSync(buffer, { level: 9 });
  const binary = strFromU8(zipped, true);
  return btoa(binary);
}

/**
 * Unzip a string.
 * @param   {string} data The string to decompress.
 * @returns {string}      The decompressed version of the given string.
 */
export function unzip(base64: string): string {
  const binary = atob(base64);

  // zlib header (x78), level 9 (xDA)
  if (binary.startsWith('\u0078\u00DA')) {
    const buffer = strToU8(binary, true);
    const unzipped = unzlibSync(buffer);
    return strFromU8(unzipped);
  }

  // old unicode hacks for backward compatibility
  // https://base64.guru/developers/javascript/examples/unicode-strings
  return decodeURIComponent(escape(binary));
}
