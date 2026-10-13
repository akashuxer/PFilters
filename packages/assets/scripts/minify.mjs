/**
 * Lightweight CSS minifier for @arvo/assets.
 * Strips comments, collapses whitespace, and writes .min.css files to dist/.
 * No external dependencies required.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');

const sources = [
  { src: 'fonts/fonts.css',       out: 'fonts.min.css' },
  { src: 'o9con/css/o9con.css',   out: 'o9con.min.css' },
  { src: 'o9illus/o9illus.css',   out: 'o9illus.min.css' },
];

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')   // strip block comments
    .replace(/\s+/g, ' ')               // collapse whitespace
    .replace(/\s*([{}:;,>~])\s*/g, '$1') // remove space around syntax chars
    .replace(/;}/g, '}')                // drop trailing semicolons
    .trim();
}

mkdirSync(distDir, { recursive: true });

for (const { src, out } of sources) {
  const srcPath = join(root, src);
  const outPath = join(distDir, out);
  const css = readFileSync(srcPath, 'utf8');
  const minified = minifyCss(css);
  writeFileSync(outPath, minified, 'utf8');

  const ratio = ((1 - minified.length / css.length) * 100).toFixed(1);
  console.log(`  ${src} -> dist/${out}  (${ratio}% smaller)`);
}

console.log('Done.');
