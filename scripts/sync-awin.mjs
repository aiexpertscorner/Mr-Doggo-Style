#!/usr/bin/env node
/**
 * sync-awin.mjs
 *
 * Safe AWIN Publisher sync for PupWiki.
 *
 * Outputs:
 * - src/data/awin-programs.json
 * - src/data/awin-products.json
 * - src/data/affiliate-banners.json
 *
 * Required for live programme sync:
 * - AWIN_OAUTH2_TOKEN
 *
 * Optional for product feeds:
 * - AWIN_PRODUCT_FEED_API_KEY
 *
 * Optional:
 * - AWIN_PUBLISHER_ID
 * - AWIN_COUNTRY_CODE
 * - AWIN_FETCH_CREATIVES=true
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

const AWIN_API = 'https://api.awin.com';
const PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '2861861';
const TOKEN = process.env.AWIN_OAUTH2_TOKEN || '';
const PRODUCT_FEED_KEY = process.env.AWIN_PRODUCT_FEED_API_KEY || '';
const COUNTRY_CODE = process.env.AWIN_COUNTRY_CODE || 'US';
const FETCH_CREATIVES = String(process.env.AWIN_FETCH_CREATIVES || '').toLowerCase() === 'true';
const TIMEOUT_MS = 15000;
const PAGE_SIZE = 250;

const PRODUCT_COLUMNS = [
  'aw_product_id',
  'merchant_product_id',
  'product_name',
  'description',
  'search_price',
  'currency',
  'aw_deep_link',
  'merchant_image_url',
  'aw_image_url',
  'merchant_name',
  'category_name',
  'merchant_id',
  'in_stock',
  'last_updated',
];

function log(msg) { console.log(`[sync-awin] ${msg}`); }
function warn(msg) { console.warn(`[sync-awin] WARN ${msg}`); }
function ok(msg) { console.log(`[sync-awin] OK ${msg}`); }

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function normalize(value) {
  return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function compact(value) {
  return normalize(value).replace(/-/g, '');
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ');
}

function toArray(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalize(header).replace(/-/g, '_'));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function parseMaybeJsonOrCsv(text) {
  try {
    const json = JSON.parse(text);
    return toArray(json, ['data', 'feeds', 'products', 'items']);
  } catch {
    return parseCsv(text);
  }
}

function getBannerRegistry(raw) {
  const fallback = {
    _meta: { version: '1.0.0', description: 'Central banner registry for PupWiki affiliate/partner banners.' },
    globalDefaults: {
      noteText: 'Advertisement / affiliate partner',
      openInNewTab: true,
      rel: 'sponsored noopener',
      imageFit: 'cover',
    },
    banners: [],
  };

  if (Array.isArray(raw)) return { ...fallback, banners: raw };
  if (raw && typeof raw === 'object' && Array.isArray(raw.banners)) return raw;
  return fallback;
}

function getStaticPrograms() {
  const config = readJson(join(DATA, 'awin-program-config.json'), { programs: [] });
  const map = new Map();
  for (const program of config.programs || []) {
    const key = program.id || normalize(program.label || program.merchantId);
    if (!key) continue;
    map.set(key, program);
    if (program.merchantId) map.set(String(program.merchantId), program);
    if (program.label) map.set(normalize(program.label), program);
  }
  return { config, map };
}

const { config: staticConfig, map: staticProgramMap } = getStaticPrograms();

function inferTopicTags(program) {
  const text = [
    program.name,
    program.description,
    program.primarySector,
    program.programmeInfo?.name,
    program.programmeInfo?.description,
    program.programmeInfo?.primarySector,
  ].join(' ').toLowerCase();

  const tags = new Set(['partner']);
  if (/food|meal|nutrition|treat|raw|pawco|pupford|montana/.test(text)) tags.add('food'), tags.add('nutrition');
  if (/insurance|vet|health|wuffes|odie|dutch/.test(text)) tags.add('health');
  if (/harness|leash|collar|training|crate|neewa|joyride|impact/.test(text)) tags.add('training'), tags.add('gear');
  if (/bed|foggy|blanket|home|petmate/.test(text)) tags.add('beds');
  if (/gift|portrait|willow|crown|muse|bereave/.test(text)) tags.add('gift'), tags.add('lifestyle');
  return [...tags];
}

function getProgramIdentity(program) {
  const advertiserId = String(program.id ?? program.advertiserId ?? program.programmeInfo?.id ?? '');
  const name = program.name || program.programmeInfo?.name || `AWIN programme ${advertiserId}`;
  const staticMatch =
    staticProgramMap.get(advertiserId) ||
    staticProgramMap.get(normalize(name)) ||
    null;
  const key = staticMatch?.id || normalize(name || advertiserId);

  return {
    key,
    advertiserId,
    name,
    staticConfig: staticMatch,
  };
}

function getProgramDeeplink(programRecord) {
  return (
    programRecord.staticConfig?.deeplink ||
    programRecord.clickThroughUrl ||
    programRecord.programmeInfo?.clickThroughUrl ||
    programRecord.displayUrl ||
    programRecord.programmeInfo?.displayUrl ||
    ''
  );
}

function isActiveStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['joined', 'active', 'approved'].includes(value);
}

async function apiFetch(path, description = path) {
  if (!TOKEN) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${AWIN_API}${path}${path.includes('accessToken=') ? '' : `${separator}accessToken=${encodeURIComponent(TOKEN)}`}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      warn(`${description} -> HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    warn(`${description} -> ${err.message || err}`);
    return null;
  }
}

async function rawFetch(url, description = url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      warn(`${description} -> HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    warn(`${description} -> ${err.message || err}`);
    return null;
  }
}

async function fetchProgrammes() {
  log(`Fetching joined programmes (${COUNTRY_CODE})`);
  const joined = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=joined&countryCode=${COUNTRY_CODE}`,
    'programmes/joined'
  );

  log(`Fetching pending programmes (${COUNTRY_CODE})`);
  const pending = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes?relationship=pending&countryCode=${COUNTRY_CODE}`,
    'programmes/pending'
  );

  const joinedList = toArray(joined, ['programmes', 'programs']);
  const pendingList = toArray(pending, ['programmes', 'programs']);
  ok(`Found ${joinedList.length} joined + ${pendingList.length} pending programme(s)`);
  if (pendingList.length) log(`Pending: ${pendingList.map((p) => p.name || p.id).join(', ')}`);
  return { joined: joinedList, pending: pendingList, all: [...joinedList, ...pendingList] };
}

async function fetchProgramDetails(advertiserId, relationship) {
  if (!advertiserId) return null;
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmedetails?advertiserId=${advertiserId}&relationship=${relationship || 'any'}`,
    `programmedetails/${advertiserId}`
  );
  return data || null;
}

function normalizeProgram(program, relationship, details = null) {
  const merged = { ...program, ...(details?.programmeInfo || {}), programmeDetails: details };
  const identity = getProgramIdentity(merged);
  const staticMatch = identity.staticConfig || {};
  const status = merged.membershipStatus || merged.status || merged.displayStatus || relationship;
  const topicTags = staticMatch.topicTags || inferTopicTags(merged);

  return {
    key: identity.key,
    advertiserId: identity.advertiserId,
    name: identity.name,
    relationship,
    status,
    isActive: relationship === 'joined' && isActiveStatus(status),
    displayUrl: merged.displayUrl || merged.programmeInfo?.displayUrl || '',
    clickThroughUrl: merged.clickThroughUrl || merged.programmeInfo?.clickThroughUrl || '',
    deeplinkEnabled: Boolean(merged.deeplinkEnabled ?? merged.programmeInfo?.deeplinkEnabled),
    logoUrl: merged.logoUrl || merged.programmeInfo?.logoUrl || '',
    primarySector: merged.primarySector || merged.programmeInfo?.primarySector || '',
    primaryRegion: merged.primaryRegion || merged.programmeInfo?.primaryRegion || null,
    currencyCode: merged.currencyCode || merged.programmeInfo?.currencyCode || '',
    validDomains: merged.validDomains || merged.programmeInfo?.validDomains || [],
    commissionRange: details?.commissionRange || merged.commissionRange || merged.defaultCommission || null,
    kpi: details?.kpi || merged.kpi || null,
    linkStatus: merged.linkStatus || '',
    staticProgramId: staticMatch.id || null,
    feedId: staticMatch.feedId || null,
    configuredDeeplink: staticMatch.deeplink || '',
    deeplink: staticMatch.deeplink || merged.clickThroughUrl || merged.programmeInfo?.clickThroughUrl || '',
    topicTags,
    pageTypes: staticMatch.pageTypes || ['blog', 'breed', 'category'],
    priority: staticMatch.priority || 50,
  };
}

async function fetchProductFeeds() {
  if (!PRODUCT_FEED_KEY) {
    warn('No AWIN_PRODUCT_FEED_API_KEY; skipping Product Feed List download');
    return [];
  }

  log('Fetching Product Feed List from productdata.awin.com');
  const url = `https://productdata.awin.com/datafeed/list/apikey/${encodeURIComponent(PRODUCT_FEED_KEY)}`;
  const text = await rawFetch(url, 'product-feed-list');
  if (!text) return [];
  const list = parseMaybeJsonOrCsv(text);
  ok(`Found ${list.length} product feed list row(s)`);
  return list;
}

function feedAdvertiserId(feed) {
  return String(
    feed.advertiser_id ||
    feed.advertiserid ||
    feed.merchant_id ||
    feed.merchantid ||
    feed.programme_id ||
    feed.programmeid ||
    feed.advertiserId ||
    feed.merchantId ||
    ''
  );
}

function feedIdValue(feed) {
  return String(feed.feed_id || feed.feedid || feed.fid || feed.id || feed.feedId || '');
}

function buildFeedMap(feeds) {
  const map = new Map();
  for (const feed of feeds) {
    const advertiserId = feedAdvertiserId(feed);
    if (!advertiserId) continue;
    if (!map.has(advertiserId)) map.set(advertiserId, []);
    map.get(advertiserId).push(feed);
  }

  for (const program of staticConfig.programs || []) {
    if (program.merchantId && program.feedId && !map.has(String(program.merchantId))) {
      map.set(String(program.merchantId), [{
        id: program.feedId,
        feed_id: program.feedId,
        advertiser_id: program.merchantId,
        merchant_id: program.merchantId,
        name: program.label,
        source: 'static-config',
      }]);
    }
  }

  return map;
}

async function fetchFeedProducts(feedId, label) {
  if (!PRODUCT_FEED_KEY) return [];
  if (!feedId) return [];

  log(`Fetching products from feed ${feedId} (${label})`);
  const columns = PRODUCT_COLUMNS.join(',');
  const url = [
    `https://productdata.awin.com/datafeed/download/apikey/${encodeURIComponent(PRODUCT_FEED_KEY)}`,
    `language/en/fid/${encodeURIComponent(feedId)}`,
    `columns/${encodeURIComponent(columns)}`,
    `format/json/limit/${PAGE_SIZE}`,
  ].join('/');

  const text = await rawFetch(url, `feed/${feedId}`);
  if (!text) return [];
  const products = parseMaybeJsonOrCsv(text);
  ok(`${products.length} product row(s) from feed ${feedId}`);
  return products;
}

async function fetchCreativesForProgram(program) {
  if (!FETCH_CREATIVES) return [];
  if (!program.advertiserId) return [];

  log(`Fetching experimental creatives for ${program.name} (${program.advertiserId})`);
  const data = await apiFetch(
    `/publishers/${PUBLISHER_ID}/programmes/${program.advertiserId}/creatives`,
    `creatives/${program.advertiserId}`
  );
  const list = toArray(data, ['creatives', 'items']);
  return list.map((creative) => normalizeCreative(creative, program)).filter(Boolean);
}

function normalizeCreative(creative, program) {
  const imageSrc = creative.imageUrl || creative.bannerUrl || creative.src || creative.image || '';
  const href = creative.url || creative.creativeUrl || creative.clickUrl || program.deeplink || program.clickThroughUrl || '';
  if (!href && !imageSrc) return null;

  return {
    id: `${program.key}-${creative.id || creative.creativeId || normalize(creative.title || creative.name || 'creative')}`,
    programKey: program.key,
    advertiserId: program.advertiserId,
    advertiser: program.name,
    network: 'awin',
    enabled: true,
    priority: program.priority || 50,
    label: creative.title || creative.name || program.name,
    type: 'image_link',
    href,
    imageSrc,
    alt: creative.alt || creative.title || `${program.name} creative`,
    width: Number(creative.width || 0),
    height: Number(creative.height || 0),
    placements: ['mid-content', 'pre-footer'],
    pageTypes: program.pageTypes || ['blog', 'breed', 'category'],
    topicTags: program.topicTags || [],
    source: 'awin-api',
    syncedAt: new Date().toISOString(),
  };
}

function normalizeProduct(raw, program) {
  const rawId = raw.aw_product_id || raw.id || raw.merchantProductId || raw.merchant_product_id || raw.product_id;
  const name = raw.product_name || raw.productName || raw.name || raw.title || '';
  if (!rawId || !name) return null;

  const price = Number.parseFloat(raw.search_price || raw.searchPrice || raw.price || raw.current_price || '0') || 0;
  const merchant = raw.merchant_name || raw.merchantName || raw.merchant || program.name || '';
  const category = raw.category_name || raw.categoryName || raw.category || program.primarySector || '';
  const image = raw.merchant_image_url || raw.aw_image_url || raw.merchantImageUrl || raw.image || raw.imageUrl || '';
  const url = raw.aw_deep_link || raw.awDeepLink || raw.deepLink || raw.url || program.deeplink || program.clickThroughUrl || '';

  return {
    id: `${program.key}-${String(rawId).replace(/\W+/g, '-').toLowerCase()}`,
    awProductId: String(raw.aw_product_id || raw.id || ''),
    merchantProductId: String(raw.merchant_product_id || raw.merchantProductId || ''),
    name: String(name).trim(),
    description: String(raw.description || raw.productDescription || '').trim().slice(0, 500),
    price,
    currency: raw.currency || program.currencyCode || 'USD',
    url,
    image,
    merchant: String(merchant).trim(),
    category: String(category).trim(),
    advertiserId: program.advertiserId,
    programId: program.key,
    topicTags: program.topicTags || [],
    availability: raw.in_stock || raw.availability || '',
    source: 'awin-product-feed',
    syncedAt: new Date().toISOString(),
  };
}

function enrichFallbackProducts(products) {
  return products.map((product) => {
    const merchant = String(product.merchant || '');
    const staticMatch =
      [...new Set(staticConfig.programs || [])].find((program) => {
        const label = normalize(program.label);
        const compactLabel = compact(program.label);
        const productMerchant = normalize(merchant);
        const compactMerchant = compact(merchant);
        return label && (
          productMerchant.includes(label) ||
          label.includes(productMerchant) ||
          compactMerchant.includes(compactLabel) ||
          compactLabel.includes(compactMerchant)
        );
      }) || null;
    return {
      ...product,
      advertiserId: staticMatch?.merchantId || product.advertiserId,
      programId: staticMatch?.id || product.programId,
      topicTags: staticMatch?.topicTags || product.topicTags || [],
      source: product.source || 'manual-fallback',
    };
  });
}

function mergeProducts(apiProducts, fallbackProducts) {
  const programsWithApiProducts = new Set(apiProducts.map((product) => product.programId).filter(Boolean));
  const keptFallbacks = enrichFallbackProducts(fallbackProducts)
    .filter((product) => !product.programId || !programsWithApiProducts.has(product.programId));
  const merged = [...apiProducts, ...keptFallbacks];
  const seen = new Set();
  return merged.filter((product) => {
    const key = product.id || `${product.programId}:${product.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildProgramOfferProducts(programs, apiProducts) {
  const programsWithApiProducts = new Set(apiProducts.map((product) => product.programId).filter(Boolean));
  return programs
    .filter((program) => program.relationship === 'joined')
    .filter((program) => !programsWithApiProducts.has(program.key))
    .filter((program) => program.deeplink || program.clickThroughUrl)
    .map((program) => ({
      id: `${program.key}-partner-offer`,
      name: `${program.name} partner offer`,
      description: program.primarySector
        ? `Visit ${program.name} for current ${program.primarySector.toLowerCase()} offers and availability.`
        : `Visit ${program.name} for current offers and availability.`,
      price: 0,
      currency: program.currencyCode || 'USD',
      url: program.deeplink || program.clickThroughUrl,
      image: program.logoUrl || '',
      merchant: program.name,
      category: program.primarySector || 'Partner offer',
      advertiserId: program.advertiserId,
      programId: program.key,
      topicTags: program.topicTags || [],
      availability: '',
      source: 'awin-program-fallback',
      syncedAt: new Date().toISOString(),
    }));
}

function buildLogoBanners(programs) {
  return programs
    .filter((program) => program.relationship === 'joined')
    .filter((program) => program.logoUrl && (program.deeplink || program.clickThroughUrl))
    .map((program) => ({
      id: `${program.key}-brand-logo`,
      programKey: program.key,
      advertiserId: program.advertiserId,
      advertiser: program.name,
      network: 'awin',
      enabled: false,
      priority: Math.max(20, (program.priority || 50) - 20),
      label: `${program.name} brand logo`,
      type: 'image_link',
      href: program.deeplink || program.clickThroughUrl,
      imageSrc: program.logoUrl,
      alt: `${program.name} logo`,
      noteText: 'Advertisement / affiliate partner',
      placements: ['brand-logo', 'pre-footer'],
      pageTypes: program.pageTypes || ['blog', 'breed', 'category'],
      topicTags: program.topicTags || [],
      source: 'awin-program-logo',
      syncedAt: new Date().toISOString(),
      imageFit: 'contain',
    }));
}

function scoreCreative(banner) {
  const preferred = [
    [300, 250],
    [728, 90],
    [160, 600],
    [468, 60],
    [320, 50],
  ];
  const index = preferred.findIndex(([w, h]) => Number(banner.width) === w && Number(banner.height) === h);
  return index === -1 ? 0 : preferred.length - index;
}

function mergeBanners(registry, apiBanners, logoBanners) {
  const existing = Array.isArray(registry.banners) ? registry.banners : [];
  const generatedPrograms = new Set([...apiBanners, ...logoBanners].map((banner) => banner.programKey).filter(Boolean));
  const manual = existing.filter((banner) => {
    if (banner.source === 'awin-api' || banner.source === 'awin-program-logo') return false;
    return !banner.programKey || !generatedPrograms.has(banner.programKey);
  });
  const generated = [...apiBanners].sort((a, b) => scoreCreative(b) - scoreCreative(a));
  const all = [...generated, ...logoBanners, ...manual];
  const seen = new Set();
  return {
    ...registry,
    banners: all.filter((banner) => {
      if (!banner.id || seen.has(banner.id)) return false;
      seen.add(banner.id);
      return true;
    }),
  };
}

async function main() {
  log('-------------------------------------');
  log('PupWiki x AWIN sync starting');
  log(`Publisher ID: ${PUBLISHER_ID}`);
  log(`OAuth token present: ${TOKEN ? 'yes' : 'NO - set AWIN_OAUTH2_TOKEN'}`);
  log(`Product feed key present: ${PRODUCT_FEED_KEY ? 'yes' : 'NO - set AWIN_PRODUCT_FEED_API_KEY for feeds'}`);
  log('-------------------------------------');

  const fallbackProducts = readJson(join(DATA, 'affiliate-products.json'), []);
  const bannerRegistry = getBannerRegistry(readJson(join(DATA, 'affiliate-banners.json'), null));
  log(`Fallback products loaded: ${fallbackProducts.length}`);
  log(`Existing banners loaded: ${bannerRegistry.banners.length}`);

  if (!TOKEN) {
    warn('No AWIN_OAUTH2_TOKEN; writing enriched fallback products and preserving banners');
    writeJson(join(DATA, 'awin-products.json'), enrichFallbackProducts(fallbackProducts));
    writeJson(join(DATA, 'awin-programs.json'), {
      publisherId: PUBLISHER_ID,
      syncedAt: new Date().toISOString(),
      note: 'No token - using fallback product data',
      programs: [],
      pendingPrograms: [],
      summary: [],
      stats: {
        joined: 0,
        pending: 0,
        products: fallbackProducts.length,
        apiProducts: 0,
        banners: bannerRegistry.banners.length,
      },
    });
    ok('Fallback data written');
    return;
  }

  const { joined, pending } = await fetchProgrammes();
  const livePrograms = [];

  for (const program of joined) {
    const advertiserId = String(program.id || program.advertiserId || '');
    const details = await fetchProgramDetails(advertiserId, 'joined');
    livePrograms.push(normalizeProgram(program, 'joined', details));
  }

  for (const program of pending) {
    const advertiserId = String(program.id || program.advertiserId || '');
    const details = await fetchProgramDetails(advertiserId, 'pending');
    livePrograms.push(normalizeProgram(program, 'pending', details));
  }

  const feeds = await fetchProductFeeds();
  const feedMap = buildFeedMap(feeds);
  const apiProducts = [];
  const apiBanners = [];
  const perProgramStats = {};

  for (const program of livePrograms) {
    const feedsForProgram = feedMap.get(program.advertiserId) || [];
    perProgramStats[program.key] = {
      advertiserId: program.advertiserId,
      products: 0,
      banners: 0,
      hasProductFeed: feedsForProgram.length > 0,
      feedIds: feedsForProgram.map(feedIdValue).filter(Boolean),
      hasCreatives: false,
      hasLogo: Boolean(program.logoUrl),
    };

    if (program.relationship === 'joined') {
      for (const feed of feedsForProgram.slice(0, 3)) {
        const feedId = feedIdValue(feed);
        const rows = await fetchFeedProducts(feedId, program.name);
        for (const row of rows) {
          const normalized = normalizeProduct(row, program);
          if (normalized) {
            apiProducts.push(normalized);
            perProgramStats[program.key].products++;
          }
        }
      }

      const creatives = await fetchCreativesForProgram(program);
      if (creatives.length) {
        apiBanners.push(...creatives);
        perProgramStats[program.key].banners += creatives.length;
        perProgramStats[program.key].hasCreatives = true;
      }
    }
  }

  const programOfferProducts = buildProgramOfferProducts(livePrograms, apiProducts);
  const mergedProducts = mergeProducts([...apiProducts, ...programOfferProducts], fallbackProducts);
  const logoBanners = buildLogoBanners(livePrograms);
  const mergedBannerRegistry = mergeBanners(bannerRegistry, apiBanners, logoBanners);

  writeJson(join(DATA, 'awin-products.json'), mergedProducts);
  writeJson(join(DATA, 'affiliate-banners.json'), mergedBannerRegistry);

  const finalPrograms = livePrograms.map((program) => ({
    ...program,
    hasProductFeed: perProgramStats[program.key]?.hasProductFeed || false,
    feedIds: perProgramStats[program.key]?.feedIds || [],
    hasCreatives: perProgramStats[program.key]?.hasCreatives || false,
    hasLogo: perProgramStats[program.key]?.hasLogo || false,
    productCount: perProgramStats[program.key]?.products || 0,
    bannerCount: perProgramStats[program.key]?.banners || 0,
  }));

  const programData = {
    publisherId: PUBLISHER_ID,
    countryCode: COUNTRY_CODE,
    syncedAt: new Date().toISOString(),
    programs: finalPrograms.filter((program) => program.relationship === 'joined'),
    pendingPrograms: finalPrograms.filter((program) => program.relationship === 'pending'),
    summary: finalPrograms.map((program) => ({
      key: program.key,
      advertiserId: program.advertiserId,
      name: program.name,
      relationship: program.relationship,
      status: program.status,
      isActive: program.isActive,
      hasProductFeed: program.hasProductFeed,
      feedIds: program.feedIds,
      hasCreatives: program.hasCreatives,
      hasLogo: program.hasLogo,
      productCount: program.productCount,
      bannerCount: program.bannerCount,
      deeplinkEnabled: program.deeplinkEnabled,
      logoUrl: program.logoUrl,
      clickThroughUrl: program.clickThroughUrl,
      topicTags: program.topicTags,
    })),
    stats: {
      joined: joined.length,
      pending: pending.length,
      feeds: feeds.length,
      apiProducts: apiProducts.length,
      programOfferProducts: programOfferProducts.length,
      totalProducts: mergedProducts.length,
      apiBanners: apiBanners.length,
      logoBanners: logoBanners.length,
      totalBanners: mergedBannerRegistry.banners.length,
      productFeedKeyPresent: Boolean(PRODUCT_FEED_KEY),
      experimentalCreativesEnabled: FETCH_CREATIVES,
    },
  };

  writeJson(join(DATA, 'awin-programs.json'), programData);

  ok(`awin-programs.json written: ${programData.programs.length} joined + ${programData.pendingPrograms.length} pending`);
  ok(`awin-products.json written: ${mergedProducts.length} total (${apiProducts.length} feed, ${programOfferProducts.length} program fallback, ${mergedProducts.length - apiProducts.length - programOfferProducts.length} manual)`);
  ok(`affiliate-banners.json written: ${mergedBannerRegistry.banners.length} total (${apiBanners.length} creative API, ${logoBanners.length} logo fallback)`);

  for (const program of programData.summary) {
    log(`${program.name}: relationship=${program.relationship}, products=${program.productCount}, feed=${program.hasProductFeed ? 'yes' : 'no'}, logo=${program.hasLogo ? 'yes' : 'no'}`);
  }

  log('-------------------------------------');
  log('Sync complete');
}

main().catch((err) => {
  console.error('[sync-awin] Fatal error:', err);
  process.exit(1);
});
