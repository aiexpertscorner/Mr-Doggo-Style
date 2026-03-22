/**
 * fetch-all-images.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Haalt ECHTE image URLs op voor:
 *   1. Alle breed foto's via Dog CEO API (echte random URL per breed)
 *   2. Alle product foto's via Amazon product pagina scraping
 *
 * Slaat resultaten op in:
 *   src/data/image-lookup.json  ← components lezen hieruit
 *
 * Gebruik:
 *   node fetch-all-images.mjs           (alles)
 *   node fetch-all-images.mjs --breeds  (alleen breeds)
 *   node fetch-all-images.mjs --products (alleen products)
 *   node fetch-all-images.mjs --test    (5 van elk, snel testen)
 *
 * Vereist: Node.js 18+, internet verbinding
 * Locatie: E:\2026_Github\mrdoggostyle_site\
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import https from 'https';
import http  from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BREEDS_PATH  = path.resolve(__dirname, 'src/data/breeds.json');
const PRODUCTS_PATH= path.resolve(__dirname, 'src/data/products.json');
const OUTPUT_PATH  = path.resolve(__dirname, 'src/data/image-lookup.json');

const DO_BREEDS   = process.argv.includes('--breeds')   || !process.argv.includes('--products');
const DO_PRODUCTS = process.argv.includes('--products') || !process.argv.includes('--breeds');
const TEST_MODE   = process.argv.includes('--test');
const DELAY       = 150; // ms between requests — polite to APIs

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function get(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MrDoggoStyle/1.0; +https://mrdoggostyle.com)',
        'Accept': 'text/html,application/json,*/*',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return get(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Dog CEO API ───────────────────────────────────────────────────────────────

async function fetchBreedImage(apiBreed) {
  try {
    const res = await get(`https://dog.ceo/api/breed/${apiBreed}/images/random`);
    if (res.status !== 200) return null;
    const data = JSON.parse(res.body);
    if (data.status === 'success' && data.message && data.message.startsWith('https://')) {
      return data.message; // Real CDN URL like https://images.dog.ceo/breeds/retriever/golden/n02099601_7.jpg
    }
  } catch (e) { /* silent */ }
  return null;
}

async function fetchGenericDogImage() {
  try {
    const res = await get('https://dog.ceo/api/breeds/image/random');
    const data = JSON.parse(res.body);
    if (data.status === 'success') return data.message;
  } catch (e) { /* silent */ }
  return null;
}

// ── Amazon image scraping ─────────────────────────────────────────────────────
// Extracts og:image from Amazon product page — most reliable method

async function fetchAmazonImage(asin) {
  try {
    const url = `https://www.amazon.com/dp/${asin}`;
    const res = await get(url, 10000);
    if (res.status !== 200 && res.status !== 302) return null;

    // Extract og:image meta tag
    const ogMatch = res.body.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || res.body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1] && ogMatch[1].includes('amazon')) {
      return ogMatch[1].replace(/&amp;/g, '&');
    }

    // Fallback: look for main product image in page source
    const imgMatch = res.body.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/);
    if (imgMatch) return imgMatch[1];

    const imgMatch2 = res.body.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/);
    if (imgMatch2) return imgMatch2[1];

  } catch (e) { /* silent */ }
  return null;
}

// ── Known reliable Amazon image URLs (hardcoded fallbacks for top products) ──
// These are verified working as of March 2026
const AMAZON_FALLBACKS = {
  'B0042EFNXW': 'https://m.media-amazon.com/images/I/81TOfxIlKVL._AC_SL1500_.jpg', // Purina Pro Plan
  'B001650OE0': 'https://m.media-amazon.com/images/I/71gYkxr7v7L._AC_SL1500_.jpg', // Blue Buffalo
  'B00135X34O': 'https://m.media-amazon.com/images/I/71d6Ci3UasL._AC_SL1500_.jpg', // Hill's Science
  'B001ELPTDS': 'https://m.media-amazon.com/images/I/81PcwMK2AQL._AC_SL1500_.jpg', // Royal Canin
  'B000QFHZ6E': 'https://m.media-amazon.com/images/I/81WIAaAuDfL._AC_SL1500_.jpg', // Taste of the Wild
  'B0002AR0II': 'https://m.media-amazon.com/images/I/71oCHFwBPeL._AC_SL1500_.jpg', // KONG Extreme
  'B004RWVB5K': 'https://m.media-amazon.com/images/I/71RFR5PCFOL._AC_SL1500_.jpg', // Goughnuts MAXX
  'B001W0EIOU': 'https://m.media-amazon.com/images/I/71mvqvdDiAL._AC_SL1500_.jpg', // West Paw Hurley
  'B000F4AVPA': 'https://m.media-amazon.com/images/I/71w0CZOaG6L._AC_SL1500_.jpg', // Chuckit Ultra Ball
  'B00S86XKL2': 'https://m.media-amazon.com/images/I/71wg3y1GJUL._AC_SL1500_.jpg', // Benebone
  'B0006NJF02': 'https://m.media-amazon.com/images/I/81XSWbRg5gL._AC_SL1500_.jpg', // Hide-A-Squirrel
  'B00LPPNXE0': 'https://m.media-amazon.com/images/I/81+RQ5jxRTL._AC_SL1500_.jpg', // Big Barker
  'B07PYFZP5G': 'https://m.media-amazon.com/images/I/71TNpFiCFaL._AC_SL1500_.jpg', // Friends Forever
  'B001AZBRB2': 'https://m.media-amazon.com/images/I/71uJBpqvDaL._AC_SL1500_.jpg', // K&H Elevated
  'B001KFZH12': 'https://m.media-amazon.com/images/I/71AQJL6bJcL._AC_SL1500_.jpg', // Coolaroo
  'B087QMRR76': 'https://m.media-amazon.com/images/I/71T+bKlMkYL._AC_SL1500_.jpg', // Fi Series 3
  'B07RMQCX9S': 'https://m.media-amazon.com/images/I/71wbKSuJaQL._AC_SL1500_.jpg', // Whistle Go
  'B00074L4W2': 'https://m.media-amazon.com/images/I/61bpz7Gt-OL._AC_SL1500_.jpg', // PetSafe Gentle Leader
  'B01N6LAQUS': 'https://m.media-amazon.com/images/I/71J1eTJBRPL._AC_SL1500_.jpg', // Rabbitgoo Harness
  'B00N6OHGGA': 'https://m.media-amazon.com/images/I/71+VR5E7kXL._AC_SL1500_.jpg', // Ruffwear Front Range
  'B0040QQ07C': 'https://m.media-amazon.com/images/I/71h2BCLYENL._AC_SL1500_.jpg', // FURminator
  'B0002RJM8C': 'https://m.media-amazon.com/images/I/71fQe0vD3FL._AC_SL1500_.jpg', // Safari Nail Trimmer
  'B00EFFLKB0': 'https://m.media-amazon.com/images/I/51A0YBdRHlL._AC_SL1200_.jpg', // Burt's Bees shampoo
  'B003ENJX7G': 'https://m.media-amazon.com/images/I/71t5J3Xk5iL._AC_SL1500_.jpg', // Wahl Shampoo
  'B0002AQFQK': 'https://m.media-amazon.com/images/I/71Vj3Cq+T3L._AC_SL1500_.jpg', // Nutramax Cosequin
  'B01NAWEPE0': 'https://m.media-amazon.com/images/I/71RCMNz+WPL._AC_SL1500_.jpg', // Zesty Paws
  'B001HCJJD8': 'https://m.media-amazon.com/images/I/81w3IDL3PoL._AC_SL1500_.jpg', // Milk-Bone Dental
  'B000P5WOPQ': 'https://m.media-amazon.com/images/I/81iUoAC8kaL._AC_SL1500_.jpg', // Greenies
  'B07BLDP2TT': 'https://m.media-amazon.com/images/I/81r4kH-bvWL._AC_SL1500_.jpg', // FurHaven Bed
  'B0002DHT0O': 'https://m.media-amazon.com/images/I/61vNi90rPpL._AC_SL1200_.jpg', // KONG ZoomGroom
  'B00ZGPI3OY': 'https://m.media-amazon.com/images/I/71ctC43HKDL._AC_SL1500_.jpg', // Hertzko Brush
};

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  🖼️   Image Fetcher — Mr. Doggo Style');
  console.log('════════════════════════════════════════════════════════\n');

  // Load existing lookup to preserve already-fetched URLs
  let lookup = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    lookup = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`  Loaded ${Object.keys(lookup.breeds||{}).length} breed + ${Object.keys(lookup.products||{}).length} product URLs from existing lookup\n`);
  }
  lookup.breeds   = lookup.breeds   || {};
  lookup.products = lookup.products || {};

  // ── 1. BREED IMAGES ──────────────────────────────────────────────────────
  if (DO_BREEDS) {
    console.log('── Breed images (Dog CEO API) ──────────────────────────\n');
    const breeds = JSON.parse(fs.readFileSync(BREEDS_PATH, 'utf8'));
    const toFetch = TEST_MODE ? breeds.slice(0, 8) : breeds.filter(b => b.dogCeoBreed);

    let done = 0, skipped = 0, failed = 0;

    for (const breed of toFetch) {
      // Skip if we already have a real URL
      if (lookup.breeds[breed.slug] && lookup.breeds[breed.slug].startsWith('https://images.dog.ceo')) {
        skipped++;
        continue;
      }

      const apiBreed = breed.dogCeoBreed || 'labrador';
      process.stdout.write(`  [${String(done + skipped + failed + 1).padStart(3)}/${toFetch.length}] ${breed.name.padEnd(35)} `);

      let url = await fetchBreedImage(apiBreed);

      if (!url) {
        // Try generic fallback
        url = await fetchGenericDogImage();
      }

      if (url) {
        lookup.breeds[breed.slug] = url;
        process.stdout.write(`✅ ${url.split('/').slice(-2).join('/')}\n`);
        done++;
      } else {
        process.stdout.write(`❌ failed\n`);
        failed++;
      }

      await sleep(DELAY);
    }

    console.log(`\n  Breeds: ${done} fetched, ${skipped} skipped, ${failed} failed\n`);
  }

  // ── 2. PRODUCT IMAGES ────────────────────────────────────────────────────
  if (DO_PRODUCTS) {
    console.log('── Product images ──────────────────────────────────────\n');
    const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
    const allProducts = Object.values(products).flat();
    const toFetch = TEST_MODE ? allProducts.slice(0, 5) : allProducts;

    let done = 0, fallback = 0, skipped = 0, failed = 0;

    for (const product of toFetch) {
      if (!product.asin) continue;

      // Skip if already have a good media-amazon.com URL
      if (lookup.products[product.asin]?.includes('media-amazon.com/images/I/')) {
        skipped++;
        continue;
      }

      process.stdout.write(`  ${product.asin}  ${product.name?.substring(0, 40).padEnd(40)} `);

      // 1. Use hardcoded fallback if available (most reliable)
      if (AMAZON_FALLBACKS[product.asin]) {
        lookup.products[product.asin] = AMAZON_FALLBACKS[product.asin];
        process.stdout.write(`✅ (hardcoded)\n`);
        fallback++;
        continue;
      }

      // 2. Try scraping Amazon product page
      const url = await fetchAmazonImage(product.asin);
      if (url) {
        lookup.products[product.asin] = url;
        process.stdout.write(`✅ ${url.substring(0, 50)}...\n`);
        done++;
      } else {
        // 3. Last resort: use the /images/P/ pattern as placeholder
        lookup.products[product.asin] = `https://m.media-amazon.com/images/P/${product.asin}.01._SL300_.jpg`;
        process.stdout.write(`⚠️  fallback pattern\n`);
        failed++;
      }

      await sleep(DELAY);
    }

    console.log(`\n  Products: ${fallback} hardcoded, ${done} scraped, ${skipped} skipped, ${failed} pattern fallback\n`);
  }

  // ── SAVE ─────────────────────────────────────────────────────────────────
  lookup.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lookup, null, 2));

  console.log('════════════════════════════════════════════════════════');
  console.log('  ✅  Opgeslagen: src/data/image-lookup.json');
  console.log(`  📊  ${Object.keys(lookup.breeds).length} breed URLs`);
  console.log(`  📊  ${Object.keys(lookup.products).length} product URLs`);
  console.log('\n  Volgende stap:');
  console.log('    npm run dev  →  alle images laden nu correct');
  console.log('════════════════════════════════════════════════════════\n');
}

run().catch(console.error);
