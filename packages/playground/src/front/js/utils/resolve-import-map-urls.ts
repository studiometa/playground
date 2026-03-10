/**
 * Resolve relative import map URLs to absolute using the current origin.
 * modern-monaco's TypeScript worker uses `file:///` as its base URL,
 * so relative paths must be resolved to absolute `https://` URLs.
 */
export function resolveImportMapUrls(
  importMap: Record<string, string>,
  origin?: string,
): Record<string, string> {
  const base = origin ?? globalThis.location?.origin ?? '';
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(importMap)) {
    resolved[key] = value.startsWith('/') ? base + value : value;
  }
  return resolved;
}
