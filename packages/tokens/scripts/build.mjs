/**
 * Build script for @arvo/tokens.
 * Compiles _build-entry.scss -> dist/arvo-tokens.css + dist/arvo-tokens.min.css
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const entry = join(root, 'src', 'scss', '_build-entry.scss');

mkdirSync(distDir, { recursive: true });

const outExpanded = join(distDir, 'arvo-tokens.css');
const outMinified = join(distDir, 'arvo-tokens.min.css');

console.log('  Compiling tokens (expanded)...');
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
console.log(`  dist/arvo-tokens.css -> dist/arvo-tokens.min.css  (${ratio}% smaller)`);
console.log('Done.');
