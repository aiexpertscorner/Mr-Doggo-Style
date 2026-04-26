#!/usr/bin/env node
/**
 * sync-awin.mjs
 * AWIN Publisher API sync script.
 * Fetches programme data, product feeds, and enriches affiliate-products.json.
 *
 * Outputs:
 *   src/data/awin-products.json   — enriched product catalog
 *   src/data/awin-programs.json   — live programme status & commission data
 *
 * Run: node scripts/sync-awin.mjs
 * Env: AWIN_OAUTH2_TOKEN  (required — set in GitHub secrets or .env)
 *
 * Falls back to src/data/affiliate-products.json if API is unreachable.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

// ── Config ──────────────────────────────────────────────────────────────────

const AWIN_API        = 'https://api.awin.com';
const PUBLISHER_ID    = '2861861';
const TOKEN           = process.env.AWIN_OAUTH2_TOKEN;
const TIMEOUT_MS      = 15000;

/** Programs we're enrolled in — used for fallback construction */
const KNOWN_PROGRAMS = {
  chefpaw:     { merchantId: '63546', feedId: '93508',  label: 'ChefPaw',       deeplink: 'https://tidd.ly/41TPa44' },
  jugbow:      { merchantId: '79708', feedId: null,     label: 'JugBow',         deeplink: 'https://tidd.ly/3QryFd6' },
  crownandpaw: { merchantId: '57823', feedId: null,     label: 'Crown and Paw',  deeplink: 'https://tidd.ly/496jo7K' },
  rawwild:     { merchantId: null,    feedId: null,     label: 'Raw Wild LLC',   deeplink: 'https://tidd.ly/4e36ta9' },
};

/** Topic tags per program — used to enrich products for smart matching */
const PROGRAM_TOPICS = {
  chefpaw:     ['food', 'nutrition', 'feeding', 'fresh-food', 'sensitive-stomach', 'care'],
  jugbow:      ['training', 'behavior', 'obedience', 'leash', 'harness', 'active', 'gear'],
  crownandpaw: ['gift', 'lifestyle', 'portrait', 'dog-names', 'apparel'],
  rawwild:     ['food', 'raw-food', 'freeze-dried', 'nutrition', 'sensitive-stomach'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`[sync-awin] ${msg}`); }
function warn(msg) { console.warn(`[sync-awin] ⚠️  ${msg}`); }
function ok(msg)   { console.log(`[sync-awin] ✓  ${msg}`); }

async function apiFetch(path, description = path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AWIN_API}${path}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      warn(`${description} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    warn(`${description} → ${err.message ?? err}`);
    return null;
  }
}

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return null; }
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function getProgramKey(merchantId, name) {
  if (!merchantId && !name) return null;
  const n = (name ?? '').toLowerCase();
  if (merchantId === '63546' || n.includes('chefpaw') || n.includes('chef paw')) return 'chefpaw';
  if (merchantId === '79708' || n.includes('jugbow') || n.includes('jug bow')) return 'jugbow';
  if (merchantId === '57823' || n.includes('crown') || n.includes('paw')) return 'crownandpaw';
  if (n.includes('raw wild')) return 'rawwild';
  return null;
}

// ── Programme sync ────────────────────────────────────────────────────────────

async function fetchProgrammes() {
  log('Fetching joined programmes…');
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=joined&countryCode=US`,
    'programmes'
  );
  if (!data) return null;

  const list = Array.isArray(data) ? data : (data.programmes ?? data.programs ?? []);
  ok(`Found ${list.length} joined programme(s)`);
  return list;
}

// ── Product feed sync ─────────────────────────────────────────────────────────

async function fetchProductFeeds() {
  log('Fetching available product feeds…');
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/feeds`,
    'product-feeds'
  );
  if (!data) return [];
  const list = Array.isArray(data) ? data : (data.feeds ?? []);
  ok(`Found ${list.length} product feed(s)`);
  return list;
}

async function fetchFeedProducts(feedId, merchantId, label) {
  log(`Fetching products from feed ${feedId} (${label})…`);

  // Try newer product data API endpoint
  const candidates = [
    `/publishers/${PUBLISHER_ID}/product-feeds/${feedId}/products?limit=100&offset=0`,
    `/publishers/${PUBLISHER_ID}/feeds/${feedId}/products?limit=100`,
  ];

  for (const path of candidates) {
    const data = await apiFetch(path, `feed-${feedId}`);
    if (data) {
      const products = Array.isArray(data) ? data : (data.products ?? data.items ?? []);
      if (products.length > 0) {
        ok(`  ${products.length} products from feed ${feedId}`);
        return products;
      }
    }
  }

  // Fall back to productdata.awin.com CSV download (basic columns)
  try {
    const feedUrl = [
      `https://productdata.awin.com/datafeed/download/apikey/${TOKEN}`,
      `language/en/fid/${feedId}`,
      `columns/aw_product_id,merchant_product_id,product_name,description,search_price,aw_deep_link,merchant_image_url,aw_image_url,merchant_name,category_name`,
      `format/json/limit/100`,
    ].join('/');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      // Try JSON first
      try {
        const json = JSON.parse(text);
        const products = Array.isArray(json) ? json : (json.data ?? []);
        if (products.length > 0) {
          ok(`  ${products.length} products from productdata feed ${feedId}`);
          return products;
        }
      } catch {
        // Not JSON — skip
      }
    }
  } catch { /* ignore */ }

  warn(`No product data retrieved for feed ${feedId}`);
  return [];
}

// ── Normalize a raw API product to our schema ─────────────────────────────────

function normalizeProduct(raw, programKey, deeplink) {
  // Handle both AWIN API field names and productdata.awin.com CSV field names
  const id = raw.aw_product_id || raw.id || raw.merchantProductId || raw.merchant_product_id;
  const name = raw.product_name || raw.productName || raw.name || '';
  const description = raw.description || raw.productDescription || '';
  const price = parseFloat(raw.search_price || raw.searchPrice || raw.price || '0') || 0;
  const url = raw.aw_deep_link || raw.awDeepLink || raw.deepLink || raw.url || deeplink;
  const image = raw.merchant_image_url || raw.aw_image_url || raw.merchantImageUrl || raw.image || '';
  const merchant = raw.merchant_name || raw.merchantName || raw.merchant || '';
  const category = raw.category_name || raw.categoryName || raw.category || '';

  if (!id || !name) return null;

  return {
    id: `${programKey}-${String(id).replace(/\W+/g, '-').toLowerCase()}`,
    name: name.trim(),
    description: description.trim().slice(0, 300),
    price,
    currency: 'USD',
    url: url || deeplink,
    image: image || '',
    merchant: merchant.trim(),
    category: category.trim(),
    programId: programKey,
    topicTags: PROGRAM_TOPICS[programKey] ?? [],
    syncedAt: new Date().toISOString(),
    source: 'awin-api',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log('─────────────────────────────────────');
  log('PupWiki × AWIN sync starting');
  log(`Publisher ID: ${PUBLISHER_ID}`);
  log(`Token present: ${TOKEN ? 'yes' : 'NO — set AWIN_OAUTH2_TOKEN'}`);
  log('─────────────────────────────────────');

  // Load existing fallback products
  const fallbackFile = join(DATA, 'affiliate-products.json');
  const fallbackProducts = readJson(fallbackFile) ?? [];
  log(`Fallback products loaded: ${fallbackProducts.length}`);

  if (!TOKEN) {
    warn('No AWIN_OAUTH2_TOKEN — writing enriched fallback data only');
    const enriched = fallbackProducts.map((p) => {
      const programKey = getProgramKey(null, p.merchant);
      return {
        ...p,
        programId: programKey ?? undefined,
        topicTags: programKey ? PROGRAM_TOPICS[programKey] : [],
        source: 'manual-fallback',
      };
    });
    writeJson(join(DATA, 'awin-products.json'), enriched);
    writeJson(join(DATA, 'awin-programs.json'), { programs: [], syncedAt: new Date().toISOString(), note: 'No token — using fallback' });
    ok('Fallback data written');
    return;
  }

  // ── Step 1: Fetch programmes ─────────────────────────────────────────────
  const programmes = await fetchProgrammes();
  const programmeMap = {};
  if (programmes) {
    for (const prog of programmes) {
      const key = getProgramKey(String(prog.id ?? ''), prog.name);
      if (key) programmeMap[key] = prog;
    }
  }

  const programData = {
    programs: programmes ?? [],
    syncedAt: new Date().toISOString(),
    publisherId: PUBLISHER_ID,
    summary: Object.entries(programmeMap).map(([key, prog]) => ({
      key,
      merchantId: String(prog.id),
      name: prog.name,
      status: prog.displayStatus ?? prog.status ?? 'unknown',
      cookiePeriod: prog.cookiePeriod ?? prog.clickTtl,
    })),
  };
  writeJson(join(DATA, 'awin-programs.json'), programData);
  ok(`awin-programs.json written (${programData.summary.length} programs mapped)`);

  // ── Step 2: Fetch product feeds ──────────────────────────────────────────
  const feeds = await fetchProductFeeds();
  const feedMap = {};
  for (const feed of feeds) {
    const merchantId = String(feed.advertiserId ?? feed.merchantId ?? '');
    const key = getProgramKey(merchantId, feed.name);
    if (key) feedMap[key] = feed;
  }

  // Also add known feeds even if not in API response
  for (const [key, prog] of Object.entries(KNOWN_PROGRAMS)) {
    if (prog.feedId && !feedMap[key]) {
      feedMap[key] = { id: prog.feedId, advertiserId: prog.merchantId, name: prog.label, source: 'hardcoded' };
    }
  }

  // ── Step 3: Fetch products from each feed ────────────────────────────────
  const apiProducts = [];

  for (const [programKey, feed] of Object.entries(feedMap)) {
    const deeplink = KNOWN_PROGRAMS[programKey]?.deeplink ?? '';
    const feedId = feed.id ?? feed.feedId;
    if (!feedId) continue;

    const rawProducts = await fetchFeedProducts(feedId, feed.advertiserId, KNOWN_PROGRAMS[programKey]?.label ?? programKey);

    for (const raw of rawProducts) {
      const normalized = normalizeProduct(raw, programKey, deeplink);
      if (normalized) apiProducts.push(normalized);
    }
  }

  ok(`API products normalized: ${apiProducts.length}`);

  // ── Step 4: Merge API data with manual fallback ──────────────────────────
  // Manual products (for programs without feeds, e.g. Raw Wild, JugBow) are kept as-is.
  // API products supplement or replace manual entries by programId.

  const programsWithApiData = new Set(apiProducts.map((p) => p.programId));

  // Keep manual products for programs that have no API data
  const kept = fallbackProducts
    .map((p) => {
      const key = getProgramKey(null, p.merchant);
      return key ? { ...p, programId: key, topicTags: PROGRAM_TOPICS[key] ?? [], source: p.source ?? 'manual' } : { ...p, source: 'manual' };
    })
    .filter((p) => !programsWithApiData.has(p.programId));

  const merged = [...apiProducts, ...kept];

  // Deduplicate by id (API wins over manual)
  const seen = new Set();
  const deduped = merged.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  writeJson(join(DATA, 'awin-products.json'), deduped);
  ok(`awin-products.json written: ${deduped.length} total products`);
  log(`  └ ${apiProducts.length} from API, ${kept.length} from manual fallback`);
  log('─────────────────────────────────────');
  log('Sync complete ✓');
}

main().catch((err) => {
  console.error('[sync-awin] Fatal error:', err);
  process.exit(1);
});
