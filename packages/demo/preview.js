/**
 * Static file server that applies custom headers from a Cloudflare Pages
 * `_headers` file. Used for local preview of the built playground.
 *
 * Usage: node preview.js [--port=8080] [--dir=dist]
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const args = process.argv.slice(2);
const port = Number(args.find((a) => a.startsWith('--port='))?.split('=')[1] ?? 8080);
const dir = resolve(args.find((a) => a.startsWith('--dir='))?.split('=')[1] ?? 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ts': 'text/plain; charset=utf-8',
};

/**
 * Parse a Cloudflare Pages `_headers` file into a map of
 * URL path → Record<headerName, headerValue>.
 *
 * Format:
 *   /path/to/file.js
 *     header-name: header-value
 *     another-header: value
 */
function parseHeadersFile(filePath) {
  if (!existsSync(filePath)) return new Map();

  const content = readFileSync(filePath, 'utf-8');
  /** @type {Map<string, Record<string, string>>} */
  const headers = new Map();
  let currentPath = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      // Path line
      currentPath = trimmed;
      if (!headers.has(currentPath)) {
        headers.set(currentPath, {});
      }
    } else if (currentPath) {
      // Header line
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const name = trimmed.slice(0, colonIdx).trim().toLowerCase();
        const value = trimmed.slice(colonIdx + 1).trim();
        headers.get(currentPath)[name] = value;
      }
    }
  }

  return headers;
}

const customHeaders = parseHeadersFile(join(dir, '_headers'));

const server = createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  // Default to index.html
  let filePath = join(dir, urlPath);
  if (urlPath.endsWith('/')) {
    filePath = join(filePath, 'index.html');
    urlPath += 'index.html';
  } else if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
    urlPath += '/index.html';
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] ?? 'application/octet-stream';

  const responseHeaders = { 'content-type': mime };

  // Apply custom headers from _headers file
  const pathHeaders = customHeaders.get(urlPath);
  if (pathHeaders) {
    Object.assign(responseHeaders, pathHeaders);
  }

  res.writeHead(200, responseHeaders);
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  const headersCount = customHeaders.size;
  console.log(`Serving ${dir} at http://localhost:${port}`);
  if (headersCount > 0) {
    console.log(`Loaded ${headersCount} custom header rule(s) from _headers`);
  }
});
