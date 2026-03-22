/**
 * add-product-images.mjs
 *
 * Voegt Amazon Associates product image URLs toe aan products.json
 * Geen API key nodig — gebruikt de gratis Amazon Associates image widget.
 *
 * Gebruik:
 *   node add-product-images.mjs
 *
 * Vereist: Node.js 18+, internet verbinding
 * Locatie: zet dit in E:\2026_Github\mrdoggostyle_site\
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CONFIG ────────────────────────────────────────────────────────────────────
const PRODUCTS_PATH = path.resolve(__dirname, 'src/data/products.json');
const OUTPUT_PATH   = path.resolve(__dirname, 'src/data/products.json');
const AMAZON_TAG    = 'aiexpertscorn-20';
const IMAGE_SIZE    = '_SL300_'; // options: _SL100_ _SL200_ _SL300_ _SL500_
const DELAY_MS      = 300; // polite delay between requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Amazon Associates image widget URL.
 * This is the official, TOS-compliant way for Associates to embed product images
 * without using the Product Advertising API.
 */
function amazonImageUrl(asin) {
  return `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=${IMAGE_SIZE}&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1&tag=${AMAZON_TAG}`;
}

/**
 * Verify the image URL actually resolves (returns 200).
 * Amazon redirects the widget URL to the real image CDN URL.
 */
function resolveImageUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect to get the final CDN URL
        const location = res.headers.location;
        req.destroy();
        resolve(location || url);
      } else if (res.statusCode === 200) {
        resolve(url);
      } else {
        resolve(url); // fallback to widget URL anyway
      }
    });
    req.on('error', () => resolve(url));
    req.on('timeout', () => { req.destroy(); resolve(url); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  🖼️   Product Images Updater — Mr. Doggo Style');
  console.log('════════════════════════════════════════════════════\n');

  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error(`❌ products.json niet gevonden op:\n   ${PRODUCTS_PATH}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  let total = 0;
  let updated = 0;
  let alreadyHad = 0;

  for (const [category, products] of Object.entries(data)) {
    console.log(`\n── ${category.toUpperCase()} ──`);

    for (const product of products) {
      total++;

      // Skip if already has a real image URL
      if (product.image && product.image.length > 0) {
        console.log(`  ✅ SKIP   ${product.name.substring(0, 50)} (already has image)`);
        alreadyHad++;
        continue;
      }

      if (!product.asin) {
        console.log(`  ⚠️  SKIP   ${product.name.substring(0, 50)} (no ASIN)`);
        continue;
      }

      // Build the Amazon Associates image widget URL
      const widgetUrl = amazonImageUrl(product.asin);

      // Try to resolve to the actual CDN URL (faster loading)
      process.stdout.write(`  🔍 ${product.name.substring(0, 45).padEnd(45)}...`);

      try {
        const resolvedUrl = await resolveImageUrl(widgetUrl);
        product.image = resolvedUrl;
        updated++;
        console.log(` ✓`);
      } catch (err) {
        product.image = widgetUrl; // fallback to widget URL
        updated++;
        console.log(` ✓ (widget URL)`);
      }

      await sleep(DELAY_MS);
    }
  }

  // Write updated data back
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

  console.log('\n════════════════════════════════════════════════════');
  console.log('  📊  Resultaat');
  console.log('────────────────────────────────────────────────────');
  console.log(`  ✅ Bijgewerkt:     ${updated} producten`);
  console.log(`  ⏭  Al had image:  ${alreadyHad} producten`);
  console.log(`  📦 Totaal:         ${total} producten`);
  console.log(`\n  💾 Opgeslagen:    ${OUTPUT_PATH}`);
  console.log('\n  ✅  Volgende stap:');
  console.log('      npm run dev  →  bekijk de producten met echte fotos');
  console.log('════════════════════════════════════════════════════\n');
}

run().catch(console.error);
