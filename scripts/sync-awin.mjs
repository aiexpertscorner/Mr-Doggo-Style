#!/usr/bin/env node
/**
 * sync-awin.mjs
 * AWIN Publisher API sync script — enhanced with:
 *   - Joined + pending programme status check
 *   - Creative materials fetch for feed-less programs
 *   - Feed product pagination (offset loop)
 *   - Per-program error isolation
 *
 * Outputs:
 *   src/data/awin-products.json    — enriched product catalog
 *   src/data/awin-programs.json    — live programme status & commission data
 *   src/data/affiliate-banners.json — creative banners (merged with manual entries)
 *
 * Run: node scripts/sync-awin.mjs
 * Env: AWIN_OAUTH2_TOKEN  (required — set in GitHub secrets or .env)
 *
 * Falls back to src/data/affiliate-products.json if API is unreachable.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

// ── Config ──────────────────────────────────────────────────────────────────

const AWIN_API     = 'https://api.awin.com';
const PUBLISHER_ID = '2861861';
const TOKEN        = process.env.AWIN_OAUTH2_TOKEN;
const TIMEOUT_MS   = 15000;
const PAGE_SIZE    = 100;

/** Programs we're enrolled in — used for fallback + creative fetch */
const KNOWN_PROGRAMS = {
  chefpaw:     { merchantId: '63546', feedId: '93508',  label: 'ChefPaw',       deeplink: 'https://tidd.ly/41TPa44' },
  jugbow:      { merchantId: '79708', feedId: null,     label: 'JugBow',         deeplink: 'https://tidd.ly/3QryFd6' },
  crownandpaw: { merchantId: '57823', feedId: null,     label: 'Crown and Paw',  deeplink: 'https://tidd.ly/496jo7K' },
  rawwild:     { merchantId: null,    feedId: null,     label: 'Raw Wild LLC',   deeplink: 'https://tidd.ly/4e36ta9' },
};

/** Topic tags per program — used for smart matching in AwinProductSlot */
const PROGRAM_TOPICS = {
  chefpaw:     ['food', 'nutrition', 'feeding', 'fresh-food', 'sensitive-stomach', 'care'],
  jugbow:      ['training', 'behavior', 'obedience', 'leash', 'harness', 'active', 'gear'],
  crownandpaw: ['gift', 'lifestyle', 'portrait', 'dog-names', 'apparel', 'custom'],
  rawwild:     ['food', 'raw-food', 'freeze-dried', 'nutrition', 'sensitive-stomach'],
};

/** Preferred creative dimensions (best-fit order) */
const PREFERRED_CREATIVE_SIZES = [
  { w: 300, h: 250 },
  { w: 728, h: 90  },
  { w: 160, h: 600 },
  { w: 468, h: 60  },
  { w: 320, h: 50  },
];

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
  if (merchantId === '57823' || n.includes('crown') && n.includes('paw')) return 'crownandpaw';
  if (n.includes('raw wild')) return 'rawwild';
  return null;
}

function isActiveStatus(status) {
  const s = (status ?? '').toLowerCase();
  return s === 'joined' || s === 'active' || s === 'approved';
}

// ── Programme sync (joined + pending) ────────────────────────────────────────

async function fetchProgrammes() {
  log('Fetching joined programmes…');
  const joined = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=joined&countryCode=US`,
    'programmes/joined'
  );

  log('Fetching pending programmes…');
  const pending = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=pending&countryCode=US`,
    'programmes/pending'
  );

  const joinedList  = Array.isArray(joined)  ? joined  : (joined?.programmes  ?? joined?.programs  ?? []);
  const pendingList = Array.isArray(pending) ? pending : (pending?.programmes ?? pending?.programs ?? []);

  ok(`Found ${joinedList.length} joined + ${pendingList.length} pending programme(s)`);
  if (pendingList.length > 0) {
    log(`  Pending: ${pendingList.map(p => p.name ?? p.id).join(', ')}`);
  }

  return { joined: joinedList, pending: pendingList, all: [...joinedList, ...pendingList] };
}

// ── Product feed sync with pagination ────────────────────────────────────────

async function fetchProductFeeds() {
  log('Fetching available product feeds…');
  const data = await apiFetch(`/publishers/${PUBLISHER_ID}/feeds`, 'product-feeds');
  if (!data) return [];
  const list = Array.isArray(data) ? data : (data.feeds ?? []);
  ok(`Found ${list.length} product feed(s)`);
  return list;
}

async function fetchFeedProductsPaginated(feedId, label) {
  log(`Fetching products from feed ${feedId} (${label}) with pagination…`);
  const all = [];
  let offset = 0;

  while (true) {
    const candidates = [
      `/publishers/${PUBLISHER_ID}/product-feeds/${feedId}/products?limit=${PAGE_SIZE}&offset=${offset}`,
      `/publishers/${PUBLISHER_ID}/feeds/${feedId}/products?limit=${PAGE_SIZE}&offset=${offset}`,
    ];

    let page = null;
    for (const path of candidates) {
      const data = await apiFetch(path, `feed-${feedId}@${offset}`);
      if (data) {
        const items = Array.isArray(data) ? data : (data.products ?? data.items ?? []);
        if (items.length > 0) { page = items; break; }
      }
    }

    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;
  }

  if (all.length > 0) {
    ok(`  ${all.length} total products from feed ${feedId}`);
    return all;
  }

  // Fall back to productdata.awin.com CSV/JSON download
  try {
    const feedUrl = [
      `https://productdata.awin.com/datafeed/download/apikey/${TOKEN}`,
      `language/en/fid/${feedId}`,
      `columns/aw_product_id,merchant_product_id,product_name,description,search_price,aw_deep_link,merchant_image_url,aw_image_url,merchant_name,category_name`,
      `format/json/limit/${PAGE_SIZE}`,
    ].join('/');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const products = Array.isArray(json) ? json : (json.data ?? []);
        if (products.length > 0) {
          ok(`  ${products.length} products from productdata feed ${feedId}`);
          return products;
        }
      } catch { /* not JSON */ }
    }
  } catch { /* ignore */ }

  warn(`No product data retrieved for feed ${feedId}`);
  return [];
}

// ── Creative materials fetch ──────────────────────────────────────────────────

async function fetchCreativesForProgram(programmeId, programKey, label) {
  if (!programmeId) {
    warn(`No programmeId for ${label} — skipping creatives`);
    return [];
  }

  log(`Fetching creatives for ${label} (programme ${programmeId})…`);
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes/${programmeId}/creatives`,
    `creatives/${programmeId}`
  );

  if (!data) return [];
  const list = Array.isArray(data) ? data : (data.creatives ?? data.items ?? []);

  // Filter for banner type only, with valid dimensions
  const banners = list
    .filter(c => {
      const type = (c.type ?? c.creativeType ?? '').toLowerCase();
      return type === 'banner' || type === 'image';
    })
    .map(c => ({
      id:         `${programKey}-${c.id ?? c.creativeId ?? Math.random().toString(36).slice(2)}`,
      programKey,
      label,
      creativeId: String(c.id ?? c.creativeId ?? ''),
      title:      c.title ?? c.name ?? label,
      url:        c.url ?? c.creativeUrl ?? c.clickUrl ?? KNOWN_PROGRAMS[programKey]?.deeplink ?? '',
      imageUrl:   c.imageUrl ?? c.bannerUrl ?? c.src ?? '',
      width:      Number(c.width  ?? 0),
      height:     Number(c.height ?? 0),
      deeplink:   KNOWN_PROGRAMS[programKey]?.deeplink ?? '',
      topicTags:  PROGRAM_TOPICS[programKey] ?? [],
      syncedAt:   new Date().toISOString(),
      source:     'awin-api',
    }))
    .filter(c => c.url || c.deeplink);

  ok(`  ${banners.length} banners for ${label}`);
  return banners;
}

function scoreCreative(c) {
  for (let i = 0; i < PREFERRED_CREATIVE_SIZES.length; i++) {
    if (c.width === PREFERRED_CREATIVE_SIZES[i].w && c.height === PREFERRED_CREATIVE_SIZES[i].h) {
      return PREFERRED_CREATIVE_SIZES.length - i;
    }
  }
  return 0;
}

// ── Normalize a raw API product to our schema ─────────────────────────────────

function normalizeProduct(raw, programKey, deeplink) {
  const id          = raw.aw_product_id || raw.id || raw.merchantProductId || raw.merchant_product_id;
  const name        = raw.product_name  || raw.productName  || raw.name        || '';
  const description = raw.description   || raw.productDescription || '';
  const price       = parseFloat(raw.search_price || raw.searchPrice || raw.price || '0') || 0;
  const url         = raw.aw_deep_link  || raw.awDeepLink   || raw.deepLink || raw.url || deeplink;
  const image       = raw.merchant_image_url || raw.aw_image_url || raw.merchantImageUrl || raw.image || '';
  const merchant    = raw.merchant_name || raw.merchantName || raw.merchant || '';
  const category    = raw.category_name || raw.categoryName || raw.category || '';

  if (!id || !name) return null;

  return {
    id:         `${programKey}-${String(id).replace(/\W+/g, '-').toLowerCase()}`,
    name:       name.trim(),
    description:description.trim().slice(0, 300),
    price,
    currency:   'USD',
    url:        url || deeplink,
    image:      image || '',
    merchant:   merchant.trim(),
    category:   category.trim(),
    programId:  programKey,
    topicTags:  PROGRAM_TOPICS[programKey] ?? [],
    syncedAt:   new Date().toISOString(),
    source:     'awin-api',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log('─────────────────────────────────────');
  log('PupWiki × AWIN sync starting');
  log(`Publisher ID: ${PUBLISHER_ID}`);
  log(`Token present: ${TOKEN ? 'yes' : 'NO — set AWIN_OAUTH2_TOKEN'}`);
  log('─────────────────────────────────────');

  const fallbackFile     = join(DATA, 'affiliate-products.json');
  const fallbackBanners  = join(DATA, 'affiliate-banners.json');
  const fallbackProducts = readJson(fallbackFile) ?? [];
  const existingBanners  = readJson(fallbackBanners) ?? [];
  log(`Fallback products loaded: ${fallbackProducts.length}`);
  log(`Existing banners loaded: ${existingBanners.length}`);

  if (!TOKEN) {
    warn('No AWIN_OAUTH2_TOKEN — writing enriched fallback data only');
    const enriched = fallbackProducts.map((p) => {
      const key = getProgramKey(null, p.merchant);
      return { ...p, programId: key ?? undefined, topicTags: key ? PROGRAM_TOPICS[key] : [], source: 'manual-fallback' };
    });
    writeJson(join(DATA, 'awin-products.json'), enriched);
    writeJson(join(DATA, 'awin-programs.json'), {
      programs: [], pendingPrograms: [], syncedAt: new Date().toISOString(), note: 'No token — using fallback',
    });
    ok('Fallback data written');
    return;
  }

  // ── Step 1: Fetch programmes (joined + pending) ──────────────────────────
  const { joined: joinedList, pending: pendingList, all: allProgrammes } = await fetchProgrammes();
  const programmeMap = {};
  for (const prog of allProgrammes) {
    const key = getProgramKey(String(prog.id ?? ''), prog.name);
    if (key) programmeMap[key] = prog;
  }

  const programData = {
    syncedAt:        new Date().toISOString(),
    publisherId:     PUBLISHER_ID,
    programs:        joinedList,
    pendingPrograms: pendingList,
    summary: Object.entries(programmeMap).map(([key, prog]) => ({
      key,
      merchantId:   String(prog.id),
      name:         prog.name,
      status:       prog.displayStatus ?? prog.status ?? 'unknown',
      isActive:     isActiveStatus(prog.displayStatus ?? prog.status),
      cookiePeriod: prog.cookiePeriod  ?? prog.clickTtl,
      commission:   prog.commissionRange ?? prog.defaultCommission ?? null,
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

  // Ensure known feeds are always included even if not in API response
  for (const [key, prog] of Object.entries(KNOWN_PROGRAMS)) {
    if (prog.feedId && !feedMap[key]) {
      feedMap[key] = { id: prog.feedId, advertiserId: prog.merchantId, name: prog.label, source: 'hardcoded' };
    }
  }

  // ── Step 3: Fetch products (paginated) + creatives per program ───────────
  const apiProducts  = [];
  const apiCreatives = [];
  const perProgramStats = {};

  for (const [programKey, prog] of Object.entries(KNOWN_PROGRAMS)) {
    const deeplink = prog.deeplink ?? '';
    const progInfo = programmeMap[programKey];
    const progId   = progInfo ? String(progInfo.id) : prog.merchantId;

    perProgramStats[programKey] = { products: 0, banners: 0, hasFeeds: false, hasCreatives: false };

    // Products from feed (if available)
    if (feedMap[programKey]) {
      const feedId = feedMap[programKey].id ?? feedMap[programKey].feedId;
      if (feedId) {
        try {
          const rawProducts = await fetchFeedProductsPaginated(feedId, prog.label);
          perProgramStats[programKey].hasFeeds = true;
          for (const raw of rawProducts) {
            const normalized = normalizeProduct(raw, programKey, deeplink);
            if (normalized) { apiProducts.push(normalized); perProgramStats[programKey].products++; }
          }
        } catch (err) {
          warn(`Products fetch failed for ${prog.label}: ${err.message}`);
        }
      }
    }

    // Creatives for programs with or without feeds
    try {
      const creatives = await fetchCreativesForProgram(progId, programKey, prog.label);
      if (creatives.length > 0) {
        perProgramStats[programKey].hasCreatives = true;
        perProgramStats[programKey].banners = creatives.length;
        apiCreatives.push(...creatives);
      }
    } catch (err) {
      warn(`Creatives fetch failed for ${prog.label}: ${err.message}`);
    }
  }

  ok(`API products normalized: ${apiProducts.length}`);
  ok(`API creatives fetched: ${apiCreatives.length}`);

  // Log per-program summary
  for (const [key, stats] of Object.entries(perProgramStats)) {
    log(`  ${KNOWN_PROGRAMS[key].label}: ${stats.products} products, ${stats.banners} banners`);
  }

  // ── Step 4: Merge products (API wins over manual) ────────────────────────
  const programsWithApiData = new Set(apiProducts.map(p => p.programId));
  const kept = fallbackProducts
    .map(p => {
      const key = getProgramKey(null, p.merchant);
      return key ? { ...p, programId: key, topicTags: PROGRAM_TOPICS[key] ?? [], source: p.source ?? 'manual' } : { ...p, source: 'manual' };
    })
    .filter(p => !programsWithApiData.has(p.programId));

  const merged = [...apiProducts, ...kept];
  const seen = new Set();
  const deduped = merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

  writeJson(join(DATA, 'awin-products.json'), deduped);
  ok(`awin-products.json written: ${deduped.length} total products (${apiProducts.length} API, ${kept.length} manual)`);

  // ── Step 5: Merge creatives (API wins by creativeId + programKey) ────────
  // Prefer API entries, keep manual entries for programs not returned by API
  const programsWithApiCreatives = new Set(apiCreatives.map(c => c.programKey));
  const manualBanners = existingBanners.filter(
    b => b.source !== 'awin-api' && !programsWithApiCreatives.has(b.programKey)
  );

  // Sort each program's creatives by preference score, keep all (let consumers filter by size)
  const sortedCreatives = [...apiCreatives].sort((a, b) => scoreCreative(b) - scoreCreative(a));
  const allBanners = [...sortedCreatives, ...manualBanners];

  // Deduplicate by id
  const seenBanners = new Set();
  const dedupedBanners = allBanners.filter(b => {
    if (seenBanners.has(b.id)) return false;
    seenBanners.add(b.id);
    return true;
  });

  writeJson(join(DATA, 'affiliate-banners.json'), dedupedBanners);
  ok(`affiliate-banners.json written: ${dedupedBanners.length} total banners (${sortedCreatives.length} API, ${manualBanners.length} manual)`);

  // ── Step 6: Update awin-programs.json with full stats ───────────────────
  const finalProgramData = {
    ...programData,
    summary: programData.summary.map(s => ({
      ...s,
      hasFeeds:       perProgramStats[s.key]?.hasFeeds     ?? false,
      hasCreatives:   perProgramStats[s.key]?.hasCreatives  ?? false,
      productCount:   perProgramStats[s.key]?.products      ?? 0,
      bannerCount:    perProgramStats[s.key]?.banners       ?? 0,
    })),
  };
  writeJson(join(DATA, 'awin-programs.json'), finalProgramData);

  log('─────────────────────────────────────');
  log('Sync complete ✓');
}

main().catch((err) => {
  console.error('[sync-awin] Fatal error:', err);
  process.exit(1);
});
