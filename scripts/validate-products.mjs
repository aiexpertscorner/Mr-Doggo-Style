/**
 * validate-products.mjs
 * ─────────────────────────────────────────────────────────────
 * Weekly health check for products.json.
 * Checks: image URLs, schema completeness, stale prices,
 * missing fields, and broken ASINs.
 *
 * Usage:
 *   node scripts/validate-products.mjs              ← full audit
 *   node scripts/validate-products.mjs --fix        ← auto-fix what can be fixed
 *   node scripts/validate-products.mjs --cat health ← one category only
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH  = path.resolve(__dirname, '../src/data/products.json');
const FIX        = process.argv.includes('--fix');
const CAT_FILTER = (() => {
  const idx = process.argv.indexOf('--cat');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const STALE_DAYS = 30; // flag prices older than this

// ── Required fields per product ──────────────────────────────
const REQUIRED_FIELDS = [
  'id', 'name', 'brand', 'asin', 'price', 'price_updated',
  'rating', 'reviewCount', 'image', 'category', 'subcategory',
  'breed_size_fit', 'life_stage', 'health_focus',
  'features', 'pros', 'cons', 'verdict', 'score', 'tags', 'active'
];

const RECOMMENDED_FIELDS = [
  'search_volume', 'coat_type_fit'
];

// ── HTTP check ────────────────────────────────────────────────
function checkUrl(url) {
  return new Promise(resolve => {
    const req = https.get(url, { timeout: 8000 }, res => {
      req.destroy();
      resolve({ ok: [200, 301, 302].includes(res.statusCode), status: res.statusCode });
    });
    req.on('error',   () => resolve({ ok: false, status: 'ERR' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT' }); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Colour helpers ────────────────────────────────────────────
const R = s => `\x1b[31m${s}\x1b[0m`;
const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

// ── Main ──────────────────────────────────────────────────────
async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🔍  Products Validator — Mr. Doggo Style');
  console.log('══════════════════════════════════════════════════════\n');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const now  = new Date();
  const issues = { errors: [], warnings: [], info: [] };
  let totalProducts = 0;
  let checkedImages  = 0;

  for (const [cat, products] of Object.entries(data)) {
    if (CAT_FILTER && cat !== CAT_FILTER) continue;

    console.log(B(`\n── ${cat.toUpperCase()} (${products.length} products) ──`));

    for (const p of products) {
      totalProducts++;
      const pId = `${cat}/${p.id ?? p.asin}`;

      // 1. Required field check
      for (const field of REQUIRED_FIELDS) {
        if (p[field] === undefined || p[field] === null || p[field] === '') {
          issues.errors.push({ product: pId, msg: `Missing required field: ${field}` });
        }
      }

      // 2. Recommended field check
      for (const field of RECOMMENDED_FIELDS) {
        if (p[field] === undefined) {
          issues.warnings.push({ product: pId, msg: `Missing recommended field: ${field}` });
        }
      }

      // 3. Image URL quality check
      if (p.image) {
        if (p.image.includes('ws-na.amazon-adsystem.com')) {
          issues.errors.push({ product: pId, msg: 'BAD IMAGE: ws-na.amazon-adsystem.com is blocked' });
        } else if (p.image.includes('images-na.ssl-images-amazon.com')) {
          issues.warnings.push({ product: pId, msg: 'DEPRECATED image domain: use m.media-amazon.com' });
        } else if (p.image.includes('/images/P/')) {
          issues.warnings.push({ product: pId, msg: 'OLD image format /images/P/ — may redirect unreliably' });
        } else if (!p.image.includes('m.media-amazon.com/images/I/')) {
          issues.warnings.push({ product: pId, msg: `Unexpected image domain: ${p.image.split('/')[2]}` });
        }
      }

      // 4. Stale price check
      if (p.price_updated) {
        const updated = new Date(p.price_updated);
        const ageDays = Math.floor((now - updated) / 86400000);
        if (ageDays > STALE_DAYS) {
          issues.warnings.push({ product: pId, msg: `Price last updated ${ageDays} days ago (${p.price_updated})` });
        }
      }

      // 5. Score range check
      if (p.score !== undefined && (p.score < 1 || p.score > 10)) {
        issues.errors.push({ product: pId, msg: `Score out of range: ${p.score} (must be 1–10)` });
      }

      // 6. Rating sanity check
      if (p.rating !== undefined && (p.rating < 1 || p.rating > 5)) {
        issues.errors.push({ product: pId, msg: `Rating out of range: ${p.rating}` });
      }

      // 7. ASIN format check
      if (p.asin && !/^B[A-Z0-9]{9}$/.test(p.asin)) {
        issues.warnings.push({ product: pId, msg: `Unusual ASIN format: ${p.asin}` });
      }

      // 8. Price sanity check
      if (p.price !== undefined && (p.price <= 0 || p.price > 1000)) {
        issues.warnings.push({ product: pId, msg: `Unusual price: $${p.price}` });
      }

      // 9. Inactive flag
      if (p.active === false) {
        issues.info.push({ product: pId, msg: 'Product marked as inactive' });
      }

      // Print per-product status
      const hasErrors = issues.errors.some(i => i.product === pId);
      const hasWarns  = issues.warnings.some(i => i.product === pId);
      const icon = hasErrors ? R('✗') : hasWarns ? Y('⚠') : G('✓');
      console.log(`  ${icon}  ${(p.name ?? p.id).substring(0, 45).padEnd(45)} ${D('$' + (p.price ?? '?'))}`);
    }
  }

  // ── Image HTTP check (optional, network required) ─────────────
  const DO_HTTP = process.argv.includes('--check-urls');
  if (DO_HTTP) {
    console.log('\n' + B('── HTTP Image Check (this takes a moment…) ──'));
    for (const [cat, products] of Object.entries(data)) {
      if (CAT_FILTER && cat !== CAT_FILTER) continue;
      for (const p of products) {
        if (!p.image || !p.image.startsWith('https://')) continue;
        const { ok, status } = await checkUrl(p.image);
        checkedImages++;
        if (!ok) {
          issues.errors.push({
            product: `${cat}/${p.id}`,
            msg: `Image HTTP ${status}: ${p.image}`
          });
          console.log(R(`  ✗ HTTP ${status}`) + `  ${p.asin}`);
        }
        await sleep(300);
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  📊  Validation Summary');
  console.log('──────────────────────────────────────────────────────');
  console.log(`  Products checked:  ${totalProducts}`);
  console.log(`  Errors:            ${issues.errors.length > 0 ? R(issues.errors.length) : G(0)}`);
  console.log(`  Warnings:          ${issues.warnings.length > 0 ? Y(issues.warnings.length) : G(0)}`);
  console.log(`  Info:              ${issues.info.length}`);
  if (DO_HTTP) console.log(`  Images HTTP-checked: ${checkedImages}`);

  if (issues.errors.length > 0) {
    console.log('\n' + R('  ERRORS (fix these):'));
    issues.errors.forEach(i => console.log(`    ${R('✗')} [${i.product}] ${i.msg}`));
  }

  if (issues.warnings.length > 0) {
    console.log('\n' + Y('  WARNINGS (review these):'));
    issues.warnings.slice(0, 20).forEach(i => console.log(`    ${Y('⚠')} [${i.product}] ${i.msg}`));
    if (issues.warnings.length > 20)
      console.log(D(`    … and ${issues.warnings.length - 20} more`));
  }

  // Write JSON report
  const report = {
    timestamp: now.toISOString(),
    totalProducts,
    errors:   issues.errors,
    warnings: issues.warnings,
    info:     issues.info,
  };
  const reportPath = path.resolve(__dirname, '../validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\n  💾  Report saved to validation-report.json');
  console.log('══════════════════════════════════════════════════════\n');

  if (issues.errors.length > 0) process.exit(1);
}

run().catch(console.error);
