// Makes ONE self-contained HTML file from the built site (dist/), for testing
// on a computer without a web server: double-click the file to open it.
//
// A page opened from disk (file://) may not load module scripts or fetch
// data files, so this script puts everything inside the page: the script,
// the styles, the fonts, the logo, and the packed word data.
//
// Run `npm run build:local`. The output, phinder2-test.html, CONTAINS THE WORD
// DATA and is git-ignored. Do not commit it.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'pack.config.json'), 'utf8'));
const outFile = join(root, 'phinder2-test.html');

const MIME = { '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
const dataUri = (path) => `data:${MIME[extname(path)] ?? 'application/octet-stream'};base64,${readFileSync(path).toString('base64')}`;
const must = (found, what) => {
  if (!found) throw new Error(`make-local: could not find ${what} in dist/index.html. Run "npm run build" first.`);
  return found;
};

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// ---- styles, with fonts turned into data: addresses ----
const cssTag = must(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/.exec(html), 'the stylesheet link');
const cssPath = join(dist, cssTag[1]);
const css = readFileSync(cssPath, 'utf8').replace(/url\(([^)]+)\)/g, (whole, ref) => {
  const clean = ref.trim().replace(/^['"]|['"]$/g, '');
  if (/^(data:|https?:)/.test(clean)) return whole;
  return `url(${dataUri(resolve(dirname(cssPath), clean))})`;
});

// ---- script ----
const jsTag = must(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/.exec(html), 'the script tag');
const js = readFileSync(join(dist, jsTag[1]), 'utf8')
  .replace(/<\/script/gi, '<\\/script') // text that would end the script element early
  .replace(/<!--/g, '<\\!--');

// ---- data and logo, read by src/lib/dataset.ts (inlineAssets) ----
const inline = {
  data: readFileSync(join(dist, config.file)).toString('base64'),
  logo: dataUri(join(dist, 'logo.png')),
};

// Function replacements: the inserted text holds "$" characters, which a plain string replacement would misread.
html = html
  .replace(/<link rel="icon"[^>]*>/, () => `<link rel="icon" href="${dataUri(join(dist, 'logo.ico'))}" />`)
  .replace(cssTag[0], () => `<style>${css}</style>`)
  .replace(
    jsTag[0],
    () => `<script>window.__PHINDER_INLINE__=${JSON.stringify(inline)};</script>\n    <script type="module">${js}</script>`,
  );

writeFileSync(outFile, html);
console.log(`Wrote ${outFile} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB). Double-click it to open the site.`);
