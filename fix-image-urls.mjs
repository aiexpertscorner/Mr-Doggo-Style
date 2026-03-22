/**
 * fix-image-urls.mjs
 * Patches all Astro/JS files in src/ to use the correct Amazon CDN URL.
 * Run once from your site root: node fix-image-urls.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, 'src');

const REPLACEMENTS = [
  // Wrong Amazon CDN → correct CDN
  [
    /ws-na\.amazon-adsystem\.com\/widgets\/q\?_encoding=UTF8&ASIN=([A-Z0-9]+)&Format=(_SL\d+_)&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1&tag=([a-z0-9-]+)/g,
    (_, asin, size, tag) => `m.media-amazon.com/images/P/${asin}.01.${size}.jpg`
  ],
  // Full URL version
  [
    /https:\/\/ws-na\.amazon-adsystem\.com\/widgets\/q\?[^"'\s`]+/g,
    (match) => {
      const asinMatch = match.match(/ASIN=([A-Z0-9]+)/);
      const sizeMatch = match.match(/Format=(_SL\d+_)/);
      const tagMatch  = match.match(/tag=([a-z0-9-]+)/);
      if (asinMatch) {
        const asin = asinMatch[1];
        const size = sizeMatch ? sizeMatch[1] : '_SL300_';
        return `https://m.media-amazon.com/images/P/${asin}.01.${size}.jpg`;
      }
      return match;
    }
  ],
];

function walkFiles(dir, exts, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules','.git','dist','.astro'].includes(entry.name)) {
      walkFiles(full, exts, callback);
    } else if (entry.isFile() && exts.some(e => full.endsWith(e))) {
      callback(full);
    }
  }
}

let totalFixed = 0;

walkFiles(SRC, ['.astro', '.mjs', '.js', '.ts'], (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed: ${path.relative(__dirname, filePath)}`);
    totalFixed++;
  }
});

// Also fix index.astro in pages root
const indexPath = path.resolve(__dirname, 'src/pages/index.astro');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  let changed = false;
  for (const [pattern, replacement] of REPLACEMENTS) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) { content = newContent; changed = true; }
  }
  if (changed) {
    fs.writeFileSync(indexPath, content);
    console.log('  ✅ Fixed: src/pages/index.astro');
    totalFixed++;
  }
}

console.log(`\n✅ Fixed ${totalFixed} files. Run npm run dev to verify images.`);
