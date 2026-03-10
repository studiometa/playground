import { zlibSync, strToU8, strFromU8 } from 'fflate';

/**
 * Zip a string using zlib compression and base64 encoding.
 * Compatible with @studiometa/playground's URL format.
 */
export function zip(data: string): string {
  const buffer = strToU8(data);
  const zipped = zlibSync(buffer, { level: 9 });
  const binary = strFromU8(zipped, true);
  return btoa(binary);
}
