/**
 * Build script for @arvo/styles.
 * Compiles _index.scss -> dist/arvo.css + dist/arvo.min.css
 *
 * The output includes tokens (:root CSS custom properties), base resets,
 * and all component styles -- a single file the platform can link.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const entry = join(root, 'src', '_index.scss');

mkdirSync(distDir, { recursive: true });

const outExpanded = join(distDir, 'arvo.css');
const outMinified = join(distDir, 'arvo.min.css');

console.log('  Compiling styles (expanded)...');
execSync(`npx sass --no-source-map --style=expanded "${entry}" "${outExpanded}"`, {
  cwd: root,
  stdio: 'inherit',
});

console.log('  Minifying...');
const css = readFileSync(outExpanded, 'utf8');
const minified = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>~])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();

writeFileSync(outMinified, minified, 'utf8');

const ratio = ((1 - minified.length / css.length) * 100).toFixed(1);
console.log(`  dist/arvo.css -> dist/arvo.min.css  (${ratio}% smaller)`);
console.log('Done.');
