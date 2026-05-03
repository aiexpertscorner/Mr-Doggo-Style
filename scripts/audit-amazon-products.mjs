#!/usr/bin/env node
/**
 * PupWiki Amazon product audit.
 *
 * Reads src/data/amazon-products.json and prints a build-safe summary.
 * Usage:
 *   node scripts/audit-amazon-products.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');
const INPUT = join(DATA, 'amazon-products.json');
const OUTPUT = join(DATA, 'amazon-products-audit.json');

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

if (!existsSync(INPUT)) {
  console.error('[audit-amazon-products] Missing src/data/amazon-products.json');
  console.error('[audit-amazon-products] Run: npm run amazon:sync');
  process.exit(1);
}

const products = JSON.parse(readFileSync(INPUT, 'utf8'));

const live = products.filter((product) => product.enabled && product.amazonAffiliateUrl);
const liveEligible = products.filter((product) => product.isLiveEligible);
const enabledMissingLink = products
  .filter((product) => product.enabled && !product.amazonAffiliateUrl)
  .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));

const audit = {
  generatedAt: new Date().toISOString(),
  totalProducts: products.length,
  enabledProducts: products.filter((product) => product.enabled).length,
  enabledWithAffiliateUrl: live.length,
  liveEligible: liveEligible.length,
  disabledProducts: products.filter((product) => !product.enabled).length,
  byCategoryGroup: groupBy(products, (product) => product.categoryGroup),
  liveByCategoryGroup: groupBy(liveEligible, (product) => product.categoryGroup),
  byComplianceRisk: groupBy(products, (product) => product.complianceRisk),
  enabledMissingLink: enabledMissingLink.map((product) => ({
    id: product.id,
    name: product.name,
    categoryGroup: product.categoryGroup,
    priorityScore: product.priorityScore,
  })),
};

writeFileSync(OUTPUT, JSON.stringify(audit, null, 2), 'utf8');

console.log('[audit-amazon-products] Amazon product audit');
console.log(`  Total products: ${audit.totalProducts}`);
console.log(`  Enabled: ${audit.enabledProducts}`);
console.log(`  Enabled with SiteStripe link: ${audit.enabledWithAffiliateUrl}`);
console.log(`  Live eligible: ${audit.liveEligible}`);
console.log(`  Enabled but missing link: ${audit.enabledMissingLink.length}`);
console.log(`  Audit written: ${OUTPUT}`);
