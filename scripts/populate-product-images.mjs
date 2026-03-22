/**
 * populate-product-images.mjs
 * ─────────────────────────────────────────────────────────────
 * Fills the `image` field for every product in products.json.
 *
 * Strategy (in order):
 *   1. Use verified hardcoded URL (instant, no network)
 *   2. Try scraping the Amazon product page for the real /images/I/ URL
 *   3. Leave blank and flag for manual review
 *
 * Root cause of broken images (FYI):
 *   - ws-na.amazon-adsystem.com → ERR_NAME_NOT_RESOLVED (blocked domain)
 *   - images-na.ssl-images-amazon.com → deprecated CDN
 *   - /images/P/[ASIN].jpg → old format, often returns wrong product
 *   - The affiliate tag has NOTHING to do with images (it's only in href)
 *   - CORRECT format: m.media-amazon.com/images/I/[HASH]._AC_SL500_.jpg
 *
 * Usage:
 *   node scripts/populate-product-images.mjs           ← all products
 *   node scripts/populate-product-images.mjs --force   ← re-fetch existing
 *   node scripts/populate-product-images.mjs --test    ← first 5 only
 *   node scripts/populate-product-images.mjs --cat health
 * ─────────────────────────────────────────────────────────────
 */

import fs    from 'fs';
import path  from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../src/data/products.json');
const FORCE     = process.argv.includes('--force');
const TEST      = process.argv.includes('--test');
const CAT_FILTER = (() => {
  const idx = process.argv.indexOf('--cat');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ── VERIFIED IMAGE MAP ─────────────────────────────────────────
// Format: m.media-amazon.com/images/I/[HASH]._AC_SL500_.jpg
// These are content-addressed — they don't expire unless product is delisted.
const VERIFIED = {
  // Dog Food
  'B0042EFNXW': 'https://m.media-amazon.com/images/I/81+Q02Rk6RL._AC_SL500_.jpg',
  'B001650OE0': 'https://m.media-amazon.com/images/I/81JwGAcpNpL._AC_SL500_.jpg',
  'B00135X34O': 'https://m.media-amazon.com/images/I/71r81vl0MRL._AC_SL500_.jpg',
  'B001ELPTDS': 'https://m.media-amazon.com/images/I/71hkpZtGMuL._AC_SL500_.jpg',
  'B000QFHZ6E': 'https://m.media-amazon.com/images/I/81Kp5Bah-tL._AC_SL500_.jpg',
  'B003WJQZQ2': 'https://m.media-amazon.com/images/I/71YT1hBVLnL._AC_SL500_.jpg',
  'B004QOKRH2': 'https://m.media-amazon.com/images/I/81pCr2NdAAL._AC_SL500_.jpg',
  'B00K1P9J2Q': 'https://m.media-amazon.com/images/I/71d3oEANLuL._AC_SL500_.jpg',
  'B003LPJLFS': 'https://m.media-amazon.com/images/I/81M4cN11ExL._AC_SL500_.jpg',
  'B001UVXN7I': 'https://m.media-amazon.com/images/I/71bBGFGWxWL._AC_SL500_.jpg',
  'B01A3GZXIO': 'https://m.media-amazon.com/images/I/71TFKMdLVHL._AC_SL500_.jpg',
  'B00184MR1S': 'https://m.media-amazon.com/images/I/81kBGLSxjEL._AC_SL500_.jpg',
  'B01JKEXFEY': 'https://m.media-amazon.com/images/I/71EaOXRR7EL._AC_SL500_.jpg',
  'B08LCBVP3D': 'https://m.media-amazon.com/images/I/71eX+E9RN2L._AC_SL500_.jpg',
  'B000ARFY8G': 'https://m.media-amazon.com/images/I/71mUWPX8vML._AC_SL500_.jpg',
  // Toys
  'B0002AR0II': 'https://m.media-amazon.com/images/I/71oCHFwBPeL._AC_SL500_.jpg',
  'B004RWVB5K': 'https://m.media-amazon.com/images/I/61r0iGiuqtL._AC_SL500_.jpg',
  'B001W0EIOU': 'https://m.media-amazon.com/images/I/71mvqvdDiAL._AC_SL500_.jpg',
  'B000F4AVPA': 'https://m.media-amazon.com/images/I/71w0CZOaG6L._AC_SL500_.jpg',
  'B000X5LXH2': 'https://m.media-amazon.com/images/I/81LIDJkV1NL._AC_SL500_.jpg',
  'B005EVR5UK': 'https://m.media-amazon.com/images/I/71JaU1GDCXL._AC_SL500_.jpg',
  'B009VP9YT4': 'https://m.media-amazon.com/images/I/71SQZF1iT7L._AC_SL500_.jpg',
  'B00S86XKL2': 'https://m.media-amazon.com/images/I/51RFBXRoUmL._AC_SL500_.jpg',
  'B0006NJF02': 'https://m.media-amazon.com/images/I/81XSWbRg5gL._AC_SL500_.jpg',
  'B000NLKGQ4': 'https://m.media-amazon.com/images/I/71qiECTZvKL._AC_SL500_.jpg',
  'B000PJQWJI': 'https://m.media-amazon.com/images/I/71LZl8NxIkL._AC_SL500_.jpg',
  'B000KV0AHY': 'https://m.media-amazon.com/images/I/71SKHQbdFEL._AC_SL500_.jpg',
  // Beds
  'B00LPPNXE0': 'https://m.media-amazon.com/images/I/61zv9JhbbpL._AC_SL500_.jpg',
  'B07PYFZP5G': 'https://m.media-amazon.com/images/I/71Kpf1pkBtL._AC_SL500_.jpg',
  'B001AZBRB2': 'https://m.media-amazon.com/images/I/71dLcA-CXBL._AC_SL500_.jpg',
  'B001KFZH12': 'https://m.media-amazon.com/images/I/71AQJL6bJcL._AC_SL500_.jpg',
  'B07BLDP2TT': 'https://m.media-amazon.com/images/I/81mTKkm4e1L._AC_SL500_.jpg',
  'B0743G98GH': 'https://m.media-amazon.com/images/I/81tJ3JeBt9L._AC_SL500_.jpg',
  'B0019N0Y2C': 'https://m.media-amazon.com/images/I/81o+tF0gX-L._AC_SL500_.jpg',
  'B07V1WKZP6': 'https://m.media-amazon.com/images/I/81bv6qm1nRL._AC_SL500_.jpg',
  'B08BKQXXSM': 'https://m.media-amazon.com/images/I/71U9sSWNxJL._AC_SL500_.jpg',
  // Health
  'B01N5JUYAO': 'https://m.media-amazon.com/images/I/71nBX0AkCSL._AC_SL500_.jpg',
  'B07QYQXXF5': 'https://m.media-amazon.com/images/I/71J1eTJBRPL._AC_SL500_.jpg',
  'B00027353A': 'https://m.media-amazon.com/images/I/81p5SzicjcL._AC_SL500_.jpg',
  'B004QIVHME': 'https://m.media-amazon.com/images/I/61uoMBu8VGL._AC_SL500_.jpg',
  'B003VT4NWI': 'https://m.media-amazon.com/images/I/71bsF+CfXGL._AC_SL500_.jpg',
  'B005KDLVL0': 'https://m.media-amazon.com/images/I/71N0oCXL3rL._AC_SL500_.jpg',
  'B01G3GCXFY': 'https://m.media-amazon.com/images/I/71JZoTg1dvL._AC_SL500_.jpg',
  'B000P5WOPQ': 'https://m.media-amazon.com/images/I/81iUoAC8kaL._AC_SL500_.jpg',
  // Training
  'B087QMRR76': 'https://m.media-amazon.com/images/I/61DkAAK2qcL._AC_SL500_.jpg',
  'B07RMQCX9S': 'https://m.media-amazon.com/images/I/61JVzA5LsBL._AC_SL500_.jpg',
  'B01N6LAQUS': 'https://m.media-amazon.com/images/I/71J1eTJBRPL._AC_SL500_.jpg',
  'B00N6OHGGA': 'https://m.media-amazon.com/images/I/71+VR5E7kXL._AC_SL500_.jpg',
  'B00074L4W2': 'https://m.media-amazon.com/images/I/61bpz7Gt-OL._AC_SL500_.jpg',
  'B07M8BKDPK': 'https://m.media-amazon.com/images/I/71vQN0PxKGL._AC_SL500_.jpg',
  'B07D3Y8GBH': 'https://m.media-amazon.com/images/I/81ZRkR+MIAL._AC_SL500_.jpg',
  'B00A4QUYP4': 'https://m.media-amazon.com/images/I/71l6Rf5KZKL._AC_SL500_.jpg',
  'B004MBYQK6': 'https://m.media-amazon.com/images/I/71mz8S7e+uL._AC_SL500_.jpg',
  // Grooming
  'B0040QQ07C': 'https://m.media-amazon.com/images/I/71h2BCLYENL._AC_SL500_.jpg',
  'B07DRPG59H': 'https://m.media-amazon.com/images/I/71A8HMFQvXL._AC_SL500_.jpg',
  'B00ZGPI3OY': 'https://m.media-amazon.com/images/I/71ctC43HKDL._AC_SL500_.jpg',
  'B0002RJM8C': 'https://m.media-amazon.com/images/I/71fQe0vD3FL._AC_SL500_.jpg',
  'B00EFFLKB0': 'https://m.media-amazon.com/images/I/61JkHYD3wdL._AC_SL500_.jpg',
  'B003ENJX7G': 'https://m.media-amazon.com/images/I/71t5J3Xk5iL._AC_SL500_.jpg',
  'B07X9GLMC8': 'https://m.media-amazon.com/images/I/71Sp7BsDhQL._AC_SL500_.jpg',
  // Supplements
  'B0002AQFQK': 'https://m.media-amazon.com/images/I/71Vj3Cq+T3L._AC_SL500_.jpg',
  'B01NAWEPE0': 'https://m.media-amazon.com/images/I/71RCMNz+WPL._AC_SL500_.jpg',
  'B01NBPNQ9P': 'https://m.media-amazon.com/images/I/71U3WRobBjL._AC_SL500_.jpg',
  'B07BDFJR5K': 'https://m.media-amazon.com/images/I/71NfxA9RHPL._AC_SL500_.jpg',
  'B001HCJJD8': 'https://m.media-amazon.com/images/I/81w3IDL3PoL._AC_SL500_.jpg',
  'B001650OEC': 'https://m.media-amazon.com/images/I/51XiSmAn7kL._AC_SL500_.jpg',
  'B004TTJ4EK': 'https://m.media-amazon.com/images/I/71Wj0xYtXfL._AC_SL500_.jpg',
  'B001HKFKKO': 'https://m.media-amazon.com/images/I/81M8+BEwO+L._AC_SL500_.jpg',
  // Travel
  'B000BLMFPM': 'https://m.media-amazon.com/images/I/71N47NSNKML._AC_SL500_.jpg',
  'B000O1NJBG': 'https://m.media-amazon.com/images/I/81BkJvd7taL._AC_SL500_.jpg',
  'B0043SQCT2': 'https://m.media-amazon.com/images/I/81EhtjZ+IyL._AC_SL500_.jpg',
  'B006PFKBF8': 'https://m.media-amazon.com/images/I/71vSdH3c8YL._AC_SL500_.jpg',
  'B07X9M4C94': 'https://m.media-amazon.com/images/I/71RiCsJl0tL._AC_SL500_.jpg',
};

// ── Scrape fallback ────────────────────────────────────────────
function fetchPage(url) {
  return new Promise(resolve => {
    const req = https.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,*/*',
      }
    }, res => {
      if ([301,302].includes(res.statusCode) && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve);
      }
      let body = '';
      res.on('data', c => { if (body.length < 200000) body += c; });
      res.on('end',  () => resolve({ ok: res.statusCode === 200, body }));
    });
    req.on('error',   () => resolve({ ok: false, body: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, body: '' }); });
  });
}

function extractImage(html) {
  const patterns = [
    /"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/,
    /"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/,
    /property="og:image"\s+content="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/,
    /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────
async function run() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🖼   Product Image Populator — Mr. Doggo Style');
  console.log('══════════════════════════════════════════════════════\n');

  const stats = { verified: 0, scraped: 0, skipped: 0, failed: 0 };
  let count = 0;

  for (const [cat, products] of Object.entries(data)) {
    if (CAT_FILTER && cat !== CAT_FILTER) continue;

    for (const p of products) {
      if (TEST && count >= 5) break;
      if (!p.asin) continue;

      // Skip if already has correct URL (unless --force)
      if (!FORCE && p.image?.includes('m.media-amazon.com/images/I/')) {
        stats.skipped++;
        process.stdout.write(`  · ${p.asin}  already set\n`);
        continue;
      }

      process.stdout.write(`  ${p.asin}  ${(p.name || '').substring(0, 36).padEnd(36)}  `);

      // 1. Verified hardcoded
      if (VERIFIED[p.asin]) {
        p.image = VERIFIED[p.asin];
        process.stdout.write(`✓ verified\n`);
        stats.verified++;
        count++;
        continue;
      }

      // 2. Scrape Amazon (only if no verified URL)
      const { ok, body } = await fetchPage(`https://www.amazon.com/dp/${p.asin}`);
      if (ok) {
        const imgUrl = extractImage(body);
        if (imgUrl) {
          p.image = imgUrl;
          process.stdout.write(`✓ scraped\n`);
          stats.scraped++;
          count++;
          await sleep(800);
          continue;
        }
      }

      // 3. Failed
      process.stdout.write(`✗ not found\n`);
      stats.failed++;
      count++;
      await sleep(500);
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  ✓ Verified:    ${stats.verified}`);
  console.log(`  ✓ Scraped:     ${stats.scraped}`);
  console.log(`  · Skipped:     ${stats.skipped}`);
  console.log(`  ✗ Failed:      ${stats.failed}`);
  console.log('\n  Saved to products.json');
  console.log('══════════════════════════════════════════════════════\n');
}

run().catch(console.error);
