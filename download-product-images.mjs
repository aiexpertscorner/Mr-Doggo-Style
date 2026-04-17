/**
 * download-product-images.mjs
 * ────────────────────────────────────────────────────────────
 * Downloads product images from Amazon CDN to public/images/products/
 * Falls back to Clearbit brand logo API if Amazon image is missing/fails
 *
 * Run ONCE before deploying:
 *   node scripts/download-product-images.mjs
 *   node scripts/download-product-images.mjs --force  ← re-download all
 *
 * Output:
 *   public/images/products/{product-id}.jpg   ← Amazon product photo
 *   public/images/products/{product-id}.png   ← Clearbit logo fallback
 *   src/data/product-index.json               ← updated with local_image field
 * ────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import https from 'https';
import http  from 'http';
import { fileURLToPath } from 'url';

const ROOT        = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR     = path.join(ROOT, 'public', 'images', 'products');
const INDEX_PATH  = path.join(ROOT, 'src', 'data', 'product-index.json');
const PRODS_PATH  = path.join(ROOT, 'src', 'data', 'products.json');
const FORCE       = process.argv.includes('--force');
const DRY         = process.argv.includes('--dry');

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Brand → Clearbit domain mapping ──────────────────────────
const BRAND_DOMAIN = {
  // Dog food
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
  'fromm':           'frommfamily.com',
  // Toys
  'kong':            'kongcompany.com',
  'goughnuts':       'goughnuts.com',
  'west paw':        'westpaw.com',
  'chuckit':         'chuckit.com',
  'nylabone':        'nylabone.com',
  'jolly pets':      'jollypets.com',
  'outward hound':   'outwardhound.com',
  'sniffspot':       'sniffspot.com',
  'benebones':       'benebone.com',
  // Beds
  'big barker':      'bigbarker.com',
  'petfusion':       'petfusion.com',
  'furhaven':        'furhaven.com',
  'k&h':             'khpet.com',
  'coolaroo':        'coolaroo.com',
  'casper':          'casper.com',
  // Health
  'nexgard':         'nexgard.com',
  'seresto':         'seresto.com',
  'frontline':       'frontline.us',
  'bravecto':        'bravecto.com',
  'embark':          'embarkvet.com',
  'wisdom panel':    'wisdompanel.com',
  // Training
  'ruffwear':        'ruffwear.com',
  'petsafe':         'petsafe.net',
  'garmin':          'garmin.com',
  'fi':              'tryfi.com',
  'tractive':        'tractive.com',
  'sportdog':        'sportdog.com',
  // Grooming
  'furminator':      'furminator.com',
  'andis':           'andis.com',
  'wahl':            'wahlclippers.com',
  'hertzko':         'hertzko.com',
  'burt\'s bees':    'burtsbees.com',
  'earthbath':       'earthbath.com',
  // Supplements
  'zesty paws':      'zestypaws.com',
  'nutramax':        'nutramax.com',
  'nordic naturals': 'nordicnaturals.com',
  'vetri-science':   'vetriscience.com',
  'cosequin':        'nutramax.com',
  'dasuquin':        'nutramax.com',
  // Smart tech
  'whistle':         'whistle.com',
  'sure petcare':    'surepetcare.com',
  // Fallback
  'default':         'amazon.com',
};

function getBrandDomain(productName) {
  const lower = productName.toLowerCase();
  for (const [brand, domain] of Object.entries(BRAND_DOMAIN)) {
    if (lower.includes(brand)) return domain;
  }
  return 'amazon.com';
}

// ── HTTP download helper ──────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MrDoggoStyleBot/1.0)',
        'Accept': 'image/*,*/*',
      },
      timeout: 8000,
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    });
    req.on('error', e => { file.close(); try { fs.unlinkSync(dest); } catch {} reject(e); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Load product data ─────────────────────────────────────────
const productIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const allProducts  = Object.entries(productIndex);

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  📦  Product Image Downloader`);
console.log(`  Products: ${allProducts.length} | Mode: ${FORCE ? 'Force re-download' : 'Skip existing'} | ${DRY ? 'DRY RUN' : 'WRITE'}`);
console.log(`  Output: public/images/products/`);
console.log(`══════════════════════════════════════════════════════\n`);

let downloaded = 0, usedLogo = 0, skipped = 0, failed = 0;

for (const [id, product] of allProducts) {
  const p = product as any;
  const localPath = path.join(OUT_DIR, `${id}.jpg`);
  const localPng  = path.join(OUT_DIR, `${id}.png`);

  // Skip if already downloaded
  if (!FORCE && (fs.existsSync(localPath) || fs.existsSync(localPng))) {
    skipped++;
    if (!p.local_image) {
      p.local_image = fs.existsSync(localPath) ? `/images/products/${id}.jpg` : `/images/products/${id}.png`;
    }
    continue;
  }

  if (DRY) {
    console.log(`  ${D('→')}  ${p.name?.slice(0,50)} — would download`);
    continue;
  }

  let success = false;

  // Try 1: Amazon CDN image
  if (p.image && p.image.includes('media-amazon')) {
    try {
      await downloadFile(p.image, localPath);
      // Verify file is a real image (>5KB)
      const stat = fs.statSync(localPath);
      if (stat.size > 5000) {
        p.local_image = `/images/products/${id}.jpg`;
        console.log(`  ${G('✓')}  ${p.name?.slice(0,50)} ${D('← Amazon CDN')}`);
        downloaded++;
        success = true;
      } else {
        fs.unlinkSync(localPath);
      }
    } catch (e) {
      try { fs.unlinkSync(localPath); } catch {}
    }
  }

  // Try 2: Clearbit brand logo
  if (!success) {
    const domain = getBrandDomain(p.name || '');
    const logoUrl = `https://logo.clearbit.com/${domain}?size=200`;
    try {
      await downloadFile(logoUrl, localPng);
      const stat = fs.statSync(localPng);
      if (stat.size > 1000) {
        p.local_image = `/images/products/${id}.png`;
        console.log(`  ${Y('◎')}  ${p.name?.slice(0,50)} ${D(`← logo: ${domain}`)}`);
        usedLogo++;
        success = true;
      } else {
        fs.unlinkSync(localPng);
      }
    } catch (e) {
      try { fs.unlinkSync(localPng); } catch {}
    }
  }

  if (!success) {
    console.log(`  ${R('✗')}  ${p.name?.slice(0,50)} — no image found`);
    failed++;
  }

  await sleep(200); // polite delay
}

// Save updated product index
if (!DRY) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(productIndex, null, 2));
  console.log(`\n  ${G('✓')}  product-index.json updated with local_image fields`);
}

// Summary
console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  Downloaded:  ${G(downloaded)}  (Amazon CDN)`);
console.log(`  Brand logos: ${Y(usedLogo)}  (Clearbit fallback)`);
console.log(`  Skipped:     ${D(skipped)}  (already existed)`);
console.log(`  Failed:      ${failed > 0 ? R(failed) : D(failed)}`);
console.log(`\n  Next: npm run build → git add public/images → git push`);
console.log(`══════════════════════════════════════════════════════\n`);
