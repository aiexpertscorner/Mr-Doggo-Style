#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const readJson = (file, fallback) => {
  try { return JSON.parse(readFileSync(join(root, file), 'utf8')); }
  catch { return fallback; }
};

const programs = readJson('src/data/awin-programs.json', {});
const products = readJson('src/data/awin-products.json', []);
const bannersRegistry = readJson('src/data/affiliate-banners.json', { banners: [] });
const banners = Array.isArray(bannersRegistry) ? bannersRegistry : (bannersRegistry.banners || []);

const joined = programs.programs || [];
const pending = programs.pendingPrograms || [];
const summary = programs.summary || [];
const feedPrograms = summary.filter((program) => program.hasProductFeed);
const productPrograms = new Set(products.map((product) => product.programId || product.advertiserId).filter(Boolean));
const logoPrograms = summary.filter((program) => program.hasLogo || program.logoUrl);
const noOutputJoined = joined.filter((program) => {
  const key = program.key || program.advertiserId;
  return !productPrograms.has(key) && !productPrograms.has(program.advertiserId);
});

const report = {
  generatedAt: new Date().toISOString(),
  syncedAt: programs.syncedAt || null,
  note: programs.note || null,
  programmes: {
    joined: joined.length,
    pending: pending.length,
    summary: summary.length,
    withProductFeed: feedPrograms.length,
    withLogo: logoPrograms.length,
    joinedWithoutProductOutput: noOutputJoined.length,
  },
  products: {
    total: products.length,
    fromFeed: products.filter((product) => product.source === 'awin-product-feed').length,
    programFallback: products.filter((product) => product.source === 'awin-program-fallback').length,
    manualFallback: products.filter((product) => /manual|fallback/.test(String(product.source || ''))).length,
    missingImage: products.filter((product) => !product.image).length,
    missingUrl: products.filter((product) => !product.url).length,
    programCount: productPrograms.size,
  },
  banners: {
    total: banners.length,
    enabled: banners.filter((banner) => banner.enabled).length,
    fromCreativeApi: banners.filter((banner) => banner.source === 'awin-api').length,
    fromProgramLogo: banners.filter((banner) => banner.source === 'awin-program-logo').length,
    missingImageOrHtml: banners.filter((banner) => banner.type === 'image_link' && !(banner.imageSrc || banner.mobileImageSrc || banner.desktopImageSrc)).length,
  },
  warnings: [
    !programs.stats?.productFeedKeyPresent ? 'AWIN_PRODUCT_FEED_API_KEY not used/present; product feeds may be fallback-only.' : null,
    products.length === 0 ? 'No AWIN products available for rendering.' : null,
    joined.length > 0 && products.filter((product) => product.source === 'awin-product-feed').length === 0 ? 'Joined programmes exist but no live feed products were imported.' : null,
    noOutputJoined.length > 0 ? `${noOutputJoined.length} joined programmes have no product output; use logos, deeplinks, or manual creatives as fallback.` : null,
  ].filter(Boolean),
};

console.log(JSON.stringify(report, null, 2));
