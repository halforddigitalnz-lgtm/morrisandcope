import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);

    // Path-based scroll preview: /scroll/900[/page.html] → page with CSS offset
    const scrollMatch = path.match(/^\/scroll\/(\d+)(?:\/([\w-]+\.html))?$/);
    if (scrollMatch) {
      const scrollY = parseInt(scrollMatch[1]);
      let html = (await readFile(join(__dirname, scrollMatch[2] || 'index.html'))).toString();
      const css = `<style>
        html { overflow: hidden !important; height: 900px !important; }
        body { margin-top: -${scrollY}px !important; }
        .hero-rule, .hero-location,
        .hero-text-panel h1, .hero-sub, .hero-actions,
        .reveal { opacity: 1 !important; transform: none !important; animation-delay: 0s !important; animation-duration: 0.001s !important; }
      </style>`;
      html = html.replace('<head>', '<head><base href="/">');
      html = html.replace('</head>', css + '</head>');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    // Full-page preview: /full[/page.html] → every scroll reveal forced visible,
    // so a fullPage screenshot isn't blank below the fold.
    const fullMatch = path.match(/^\/full(?:\/([\w-]+\.html))?$/);
    if (fullMatch) {
      let html = (await readFile(join(__dirname, fullMatch[1] || 'index.html'))).toString();
      const css = `<style>
        .reveal, .stage > *, .readout, .horizon, .instrument {
          opacity: 1 !important; transform: none !important;
          animation-delay: 0s !important; animation-duration: .001s !important;
        }
        .more.is-open .more__panel, .acc__item.is-open .acc__panel { grid-template-rows: 1fr !important; }
      </style>`;
      html = html.replace('<head>', '<head><base href="/">').replace('</head>', css + '</head>');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    if (path === '/') path = '/index.html';
    const filePath = join(__dirname, path);
    const ext = extname(filePath).toLowerCase();
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Serving at http://localhost:${PORT}`));
