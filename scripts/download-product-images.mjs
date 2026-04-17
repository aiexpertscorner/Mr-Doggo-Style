/**
 * download-product-images.mjs v2
 * Downloads product images to public/images/products/ for local serving
 *
 * Priority per product:
 *   1. Amazon CDN URL from product-index.json (if present)
 *   2. Amazon image via ASIN pattern (auto-constructed)
 *   3. Clearbit brand logo (domain lookup)
 *   4. Skip (emoji fallback in component)
 *
 * Run:
 *   node scripts/download-product-images.mjs
 *   node scripts/download-product-images.mjs --force   (re-download all)
 *   node scripts/download-product-images.mjs --dry     (preview only)
 */

import fs    from 'fs';
import path  from 'path';
import https from 'https';
import http  from 'http';
import { fileURLToPath } from 'url';

const ROOT       = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR    = path.join(ROOT, 'public', 'images', 'products');
const INDEX_PATH = path.join(ROOT, 'src', 'data', 'product-index.json');
const FORCE      = process.argv.includes('--force');
const DRY        = process.argv.includes('--dry');

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Amazon ASIN-based image URLs (multiple patterns) ─────────
// Amazon product images can often be fetched directly from ASIN
function getAsinImageUrls(asin) {
  return [
    // Pattern 1: SSL images (most reliable without API)
    `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SX300_SY300_.jpg`,
    // Pattern 2: Amazon media CDN variant
    `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL160_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1&tag=aiexpertscorn-20`,
  ];
}

// ── Brand → Clearbit domain ───────────────────────────────────
const BRAND_DOMAIN = {
  'purina':          'purina.com',
  'blue buffalo':    'bluebuffalo.com',
  "hill's":          'hillspet.com',
  'royal canin':     'royalcanin.com',
  'nutro':           'nutro.com',
  'iams':            'iams.com',
  'merrick':         'merrickpetcare.com',
  'wellness':        'wellnesspetfood.com',
  'taste of the wild':'tasteofthewildpetfood.com',
  'instinct':        'instinctpetfood.com',
  'orijen':          'championpetfoods.com',
  'acana':           'championpetfoods.com',
  'pedigree':        'pedigree.com',
  'cesar':           'cesar.com',
  "farmer's dog":    'thefarmersdog.com',
  'ollie':           'myollie.com',
  'rachael ray':     'nutrish.com',
  'victor':          'victorpetfood.com',
  'diamond':         'diamondpet.com',
  'kong':            'kongcompany.com',
  'goughnuts':       'goughnuts.com',
  'west paw':        'westpaw.com',
  'chuckit':         'chuckit.com',
  'nylabone':        'nylabone.com',
  'outward hound':   'outwardhound.com',
  'big barker':      'bigbarker.com',
  'petfusion':       'petfusion.com',
  'furhaven':        'furhaven.com',
  'coolaroo':        'coolaroo.com',
  'casper':          'casper.com',
  'nexgard':         'nexgard.com',
  'seresto':         'seresto.com',
  'frontline':       'frontline.us',
  'bravecto':        'bravecto.com',
  'embark':          'embarkvet.com',
  'wisdom panel':    'wisdompanel.com',
  'ruffwear':        'ruffwear.com',
  'petsafe':         'petsafe.net',
  'garmin':          'garmin.com',
  'tractive':        'tractive.com',
  'furminator':      'furminator.com',
  'andis':           'andis.com',
  'wahl':            'wahlclippers.com',
  'hertzko':         'hertzko.com',
  'zesty paws':      'zestypaws.com',
  'nutramax':        'nutramax.com',
  'cosequin':        'nutramax.com',
  'nordic naturals': 'nordicnaturals.com',
  'whistle':         'whistle.com',
  'fi ':             'tryfi.com',       // space to avoid matching "fit"
  'tractive':        'tractive.com',
};

function getBrandDomain(name) {
  const lower = (name || '').toLowerCase();
  for (const [brand, domain] of Object.entries(BRAND_DOMAIN)) {
    if (lower.includes(brand)) return domain;
  }
  return null; // no match — skip Clearbit
}

// ── Download helper with redirect support ────────────────────
function downloadFile(url, dest, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const mod  = url.startsWith('https') ? https : http;

    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'image/webp,image/jpeg,image/png,*/*',
      },
      timeout: timeoutMs,
    }, res => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        const loc = res.headers.location;
        if (!loc) return reject(new Error('Redirect with no location'));
        return downloadFile(loc, dest, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      // Check content-type is image
      const ct = res.headers['content-type'] || '';
      if (!ct.includes('image') && !ct.includes('octet-stream') && url.includes('clearbit')) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        return reject(new Error('Not an image'));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
      file.on('error',  e => { try { fs.unlinkSync(dest); } catch {} reject(e); });
    });

    req.on('error',   e => { file.close(); try { fs.unlinkSync(dest); } catch {} reject(e); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function isValidImage(filePath, minBytes = 3000) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size >= minBytes;
  } catch { return false; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────
if (!fs.existsSync(INDEX_PATH)) {
  console.error(R('✗ product-index.json not found. Copy it from the outputs folder first.'));
  process.exit(1);
}

const productIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const entries      = Object.entries(productIndex);

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  📦  Product Image Downloader v2`);
console.log(`  Products: ${entries.length} | ${FORCE ? 'Force re-download' : 'Skip existing'} | ${DRY ? 'DRY RUN' : 'WRITE'}`);
console.log(`══════════════════════════════════════════════════════\n`);

let downloaded = 0, logos = 0, skipped = 0, failed = 0;

for (const [id, product] of entries) {
  const p        = product;
  const jpgPath  = path.join(OUT_DIR, `${id}.jpg`);
  const pngPath  = path.join(OUT_DIR, `${id}.png`);

  // Already have a valid local file
  const existingJpg = isValidImage(jpgPath);
  const existingPng = isValidImage(pngPath);

  if (!FORCE && (existingJpg || existingPng)) {
    if (!p.local_image) {
      p.local_image = existingJpg ? `/images/products/${id}.jpg` : `/images/products/${id}.png`;
    }
    skipped++;
    continue;
  }

  if (DRY) {
    const src = p.image ? 'CDN' : p.asin ? 'ASIN' : getBrandDomain(p.name) ? 'logo' : '✗';
    console.log(`  ${D('→')}  ${(p.name||id).slice(0,50).padEnd(50)} [${src}]`);
    continue;
  }

  let ok = false;

  // ── Try 1: Direct Amazon CDN URL (from product-index.json) ──
  if (!ok && p.image && p.image.includes('m.media-amazon.com')) {
    try {
      await downloadFile(p.image, jpgPath);
      if (isValidImage(jpgPath)) {
        p.local_image = `/images/products/${id}.jpg`;
        console.log(`  ${G('✓')}  ${(p.name||id).slice(0,52)} ${D('← Amazon CDN')}`);
        downloaded++; ok = true;
      } else { try { fs.unlinkSync(jpgPath); } catch {} }
    } catch {}
  }

  // ── Try 2: Amazon image from ASIN ───────────────────────────
  if (!ok && p.asin && p.asin !== 'SUBSCRIPTION') {
    for (const url of getAsinImageUrls(p.asin)) {
      try {
        await downloadFile(url, jpgPath, 5000);
        if (isValidImage(jpgPath, 5000)) {
          p.local_image = `/images/products/${id}.jpg`;
          console.log(`  ${G('✓')}  ${(p.name||id).slice(0,52)} ${D('← ASIN pattern')}`);
          downloaded++; ok = true; break;
        } else { try { fs.unlinkSync(jpgPath); } catch {} }
      } catch {}
    }
  }

  // ── Try 3: Clearbit brand logo ───────────────────────────────
  if (!ok) {
    const domain = getBrandDomain(p.name);
    if (domain) {
      try {
        const logoUrl = `https://logo.clearbit.com/${domain}?size=200&format=png`;
        await downloadFile(logoUrl, pngPath, 6000);
        if (isValidImage(pngPath, 800)) {
          p.local_image = `/images/products/${id}.png`;
          console.log(`  ${Y('◎')}  ${(p.name||id).slice(0,52)} ${D(`← logo:${domain}`)}`);
          logos++; ok = true;
        } else { try { fs.unlinkSync(pngPath); } catch {} }
      } catch {}
    }
  }

  if (!ok) {
    console.log(`  ${R('✗')}  ${(p.name||id).slice(0,52)} — no image`);
    failed++;
  }

  await sleep(150);
}

// Save updated index
if (!DRY) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(productIndex, null, 2));
  console.log(`\n  ${G('✓')}  product-index.json saved (local_image fields added)`);
}

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  Downloaded:  ${G(downloaded)}`);
console.log(`  Brand logos: ${Y(logos)}`);
console.log(`  Skipped:     ${D(skipped)} (already existed)`);
console.log(`  Failed:      ${failed > 0 ? R(failed) : D(failed)}`);
if (!DRY) console.log(`\n  Next: npm run build && git add public/images && git push`);
console.log(`══════════════════════════════════════════════════════\n`);
