/**
 * download-brand-logos.mjs
 * Downloads brand logos from Clearbit to public/images/brands/
 * Run: node scripts/download-brand-logos.mjs
 */

import fs   from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const ROOT     = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR  = path.join(ROOT, 'public', 'images', 'brands');
const BRANDS   = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'brands.json'), 'utf8'));
const FORCE    = process.argv.includes('--force');

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { timeout: 8000 }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); try { fs.unlinkSync(dest); } catch {}
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close(); try { fs.unlinkSync(dest); } catch {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', e => { file.close(); try { fs.unlinkSync(dest); } catch {}; reject(e); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log(`\n🏷️  Brand Logo Downloader — ${BRANDS.length} brands\n`);

let ok = 0, skip = 0, fail = 0;

for (const brand of BRANDS) {
  const dest = path.join(OUT_DIR, `${brand.slug}.png`);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 500) {
    skip++;
    continue;
  }
  try {
    await download(`https://logo.clearbit.com/${brand.domain}?size=200&format=png`, dest);
    const size = fs.statSync(dest).size;
    if (size < 500) { fs.unlinkSync(dest); throw new Error('too small'); }
    console.log(`  ${G('✓')}  ${brand.name.padEnd(30)} ${D(brand.domain)}`);
    ok++;
  } catch {
    console.log(`  ${R('✗')}  ${brand.name.padEnd(30)} ${D('no logo found')}`);
    fail++;
  }
  await sleep(120);
}

console.log(`\n  Done: ${G(ok)} ✓  Skipped: ${D(skip)}  Failed: ${R(fail)}`);
console.log(`  Logos saved to: public/images/brands/\n`);
