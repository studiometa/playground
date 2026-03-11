/**
 * Resolve the effective public path from an explicit value or a webpack config.
 *
 * Priority:
 * 1. Explicit `publicPath` option (from the preset)
 * 2. Webpack's `output.publicPath` (set by the consumer's `webpack()` callback)
 * 3. Empty string (no prefix)
 *
 * The returned string never has a trailing slash.
 * Webpack's `output.publicPath` can be a string or a function — only string
 * values are used; function values are ignored.
 *
 * @param explicitPublicPath - The preset's `publicPath` option, if any
 * @param webpackConfig - The webpack configuration object (optional)
 */
export function resolvePublicPath(
  explicitPublicPath?: string,
  webpackConfig?: { output?: { publicPath?: string | ((...args: unknown[]) => string) } },
): string {
  if (explicitPublicPath) {
    return normalize(explicitPublicPath);
  }

  const wp = webpackConfig?.output?.publicPath;
  if (typeof wp === 'string' && wp !== 'auto' && wp !== '/') {
    return normalize(wp);
  }

  return '';
}

/**
 * Normalize a public path: ensure it starts with `/` and has no trailing slash.
 */
function normalize(publicPath: string): string {
  let normalized = publicPath;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized.replace(/\/+$/, '');
}
