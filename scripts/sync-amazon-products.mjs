#!/usr/bin/env node
/**
 * PupWiki Amazon SiteStripe CSV sync.
 *
 * Converts:
 *   src/data/amazon-products-live-checked.csv
 * into:
 *   src/data/amazon-products.json
 *   src/data/amazon-products-summary.json
 *
 * Safe build behavior:
 * - If the CSV is missing but amazon-products.json already exists, the script exits 0.
 * - Use --strict to fail when the CSV is missing.
 *
 * Usage:
 *   node scripts/sync-amazon-products.mjs
 *   node scripts/sync-amazon-products.mjs src/data/amazon-products-live-checked.csv
 *   node scripts/sync-amazon-products.mjs --strict
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'amazon-products.json');
const SUMMARY_FILE = join(DATA_DIR, 'amazon-products-summary.json');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const explicitInput = args.find((arg) => !arg.startsWith('--'));

const CANDIDATES = [
  explicitInput ? resolve(process.cwd(), explicitInput) : '',
  join(DATA_DIR, 'amazon-products-live-checked.csv'),
  join(DATA_DIR, 'AMAZON_PRODUCT_SEED_SITESTRIPE - amazon-products-live-checked.csv'),
].filter(Boolean);

const KNOWN_COLUMNS = new Set([
  'id',
  'enabled',
  'priorityScore',
  'liveSearchStatus',
  'liveSearchNote',
  'salesIntent',
  'categoryGroup',
  'categoryLabel',
  'name',
  'amazonSearchQuery',
  'asin',
  'amazonAffiliateUrl',
  'recommendedPlacement',
  'topicTags',
  'targetPageSlugs',
  'complianceRisk',
  'complianceNotes',
]);

function log(message) {
  console.log(`[sync-amazon-products] ${message}`);
}

function warn(message) {
  console.warn(`[sync-amazon-products] ⚠ ${message}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => String(value).trim() !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => String(value).trim() !== '')) rows.push(row);
  return rows;
}

function toRecords(csvText) {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, ''));
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map((header) => String(header || '').trim());
  const records = rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });

  return { headers, records };
}

function clean(value) {
  return String(value ?? '').trim();
}

function toBool(value) {
  return ['true', '1', 'yes', 'y', 'enabled', 'live'].includes(clean(value).toLowerCase());
}

function toNumber(value) {
  const number = Number(clean(value));
  return Number.isFinite(number) ? number : null;
}

function splitPipe(value) {
  return clean(value)
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function findInputFile() {
  return CANDIDATES.find((file) => file && existsSync(file)) || '';
}

function getBrandColumn(headers) {
  return headers.find((key) => !KNOWN_COLUMNS.has(key)) || '';
}

function hasValidAmazonLink(url) {
  return /^https?:\/\//i.test(url) && (url.includes('amzn.to') || url.includes('amazon.'));
}

function normalizeRecord(record, brandColumn, sourceName) {
  const affiliateUrl = clean(record.amazonAffiliateUrl);
  const complianceRisk = clean(record.complianceRisk).toLowerCase() || 'unknown';

  const product = {
    id: clean(record.id),
    enabled: toBool(record.enabled),
    priorityScore: toNumber(record.priorityScore),
    liveSearchStatus: clean(record.liveSearchStatus),
    liveSearchNote: clean(record.liveSearchNote),
    salesIntent: clean(record.salesIntent).toLowerCase(),
    categoryGroup: clean(record.categoryGroup),
    categoryLabel: clean(record.categoryLabel),
    name: clean(record.name),
    brand: brandColumn ? clean(record[brandColumn]) : '',
    amazonSearchQuery: clean(record.amazonSearchQuery),
    asin: clean(record.asin),
    amazonAffiliateUrl: affiliateUrl,
    recommendedPlacement: clean(record.recommendedPlacement),
    topicTags: splitPipe(record.topicTags),
    targetPageSlugs: splitPipe(record.targetPageSlugs),
    complianceRisk,
    complianceNotes: clean(record.complianceNotes),
    source: sourceName,
    hasAffiliateUrl: Boolean(affiliateUrl),
  };

  return {
    ...product,
    isLiveEligible:
      product.enabled &&
      hasValidAmazonLink(product.amazonAffiliateUrl) &&
      product.complianceRisk !== 'high',
  };
}

function summarize(products, sourceName, headers, rawRowCount) {
  const byCategoryGroup = {};
  const byRisk = {};
  const missingLinks = [];

  for (const product of products) {
    const category = product.categoryGroup || 'uncategorized';
    const risk = product.complianceRisk || 'unknown';

    byCategoryGroup[category] = (byCategoryGroup[category] || 0) + 1;
    byRisk[risk] = (byRisk[risk] || 0) + 1;

    if (product.enabled && !product.hasAffiliateUrl) {
      missingLinks.push({
        id: product.id,
        name: product.name,
        categoryGroup: product.categoryGroup,
        priorityScore: product.priorityScore,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceCsv: sourceName,
    totalRows: rawRowCount,
    totalProducts: products.length,
    enabledProducts: products.filter((product) => product.enabled).length,
    enabledWithAffiliateUrl: products.filter((product) => product.enabled && product.hasAffiliateUrl).length,
    liveEligible: products.filter((product) => product.isLiveEligible).length,
    categoryGroups: Object.keys(byCategoryGroup).sort(),
    byCategoryGroup,
    byComplianceRisk: byRisk,
    detectedHeaders: headers,
    missingLinks: missingLinks
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
      .slice(0, 50),
  };
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const input = findInputFile();

  if (!input) {
    const message = `No Amazon CSV found. Tried: ${CANDIDATES.join(', ')}`;
    if (existsSync(OUTPUT_FILE) && !strict) {
      warn(`${message}. Existing amazon-products.json kept.`);
      return;
    }

    if (!strict) {
      warn(`${message}. Writing empty amazon-products.json so the Astro build can continue.`);
      writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf8');
      writeFileSync(
        SUMMARY_FILE,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            totalProducts: 0,
            note: 'No CSV found; empty Amazon catalog written.',
          },
          null,
          2
        ),
        'utf8'
      );
      return;
    }

    console.error(`[sync-amazon-products] ${message}`);
    process.exit(1);
  }

  const text = readFileSync(input, 'utf8');
  const { headers, records } = toRecords(text);
  const brandColumn = getBrandColumn(headers);

  if (brandColumn) {
    log(`Detected brand/source column: "${brandColumn}"`);
  }

  const products = records
    .map((record) => normalizeRecord(record, brandColumn, basename(input)))
    .filter((product) => product.id && product.name)
    .sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      if (a.isLiveEligible !== b.isLiveEligible) return a.isLiveEligible ? -1 : 1;
      return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    });

  const summary = summarize(products, basename(input), headers, records.length);

  writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2), 'utf8');
  writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');

  log(`Read ${records.length} CSV rows from ${basename(input)}`);
  log(`Wrote ${products.length} products to ${OUTPUT_FILE}`);
  log(`Enabled products with SiteStripe links: ${summary.enabledWithAffiliateUrl}`);
  log(`Live eligible products: ${summary.liveEligible}`);
}

main();
