// Local dev server: static files + /api/yt. Zero dependencies.
// On Vercel, the static files and api/yt.js are served natively instead.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import yt from './api/yt.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const PUBLIC = ['index.html', `css${sep}`, `js${sep}`, `assets${sep}`];

http
  .createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return res.writeHead(400).end('Bad request');
    }
    if (pathname === '/api/yt') return yt(req, res);

    const file = resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    const rel = file.slice(ROOT.length);
    if (!file.startsWith(ROOT) || !TYPES[extname(file)] || !PUBLIC.some(p => rel === p || rel.startsWith(p))) {
      return res.writeHead(404).end('Not found');
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)], 'Cache-Control': 'no-cache' }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  })
  .listen(PORT, HOST, () => console.log(`RetroAmp is playing at http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`));
