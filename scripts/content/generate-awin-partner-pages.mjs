#!/usr/bin/env node
/**
 * Generate one rich PupWiki partner profile page per joined + active AWIN programme.
 *
 * Reads:
 * - src/data/awin-programs.json
 * - src/data/awin-products.json
 * - src/data/affiliate-banners.json
 *
 * Writes:
 * - src/content/blog/partner-<program-key>.md
 * - src/data/pupwiki-partners-summary.json
 *
 * Pages are intentionally excluded from the editorial blog feed via indexInBlog=false.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = resolve(ROOT, 'src/data');
const BLOG_DIR = resolve(ROOT, 'src/content/blog');
const PROGRAMS_PATH = join(DATA_DIR, 'awin-programs.json');
const PRODUCTS_PATH = join(DATA_DIR, 'awin-products.json');
const BANNERS_PATH = join(DATA_DIR, 'affiliate-banners.json');
const SUMMARY_PATH = join(DATA_DIR, 'pupwiki-partners-summary.json');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply') || !process.argv.includes('--check');

function log(message) { console.log(`[generate-awin-partner-pages] ${message}`); }
function warn(message) { console.warn(`[generate-awin-partner-pages] WARN ${message}`); }
function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function quote(value) { return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; }
function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function titleCase(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function percentRange(range) {
  const items = Array.isArray(range) ? range : [];
  const pct = items.find((item) => item?.type === 'percentage');
  if (!pct) return 'Commission terms available through AWIN';
  if (Number(pct.min) === Number(pct.max)) return `${pct.max}% commission`;
  return `${pct.min}%–${pct.max}% commission`;
}
function normalizeTopic(value) { return String(value || '').toLowerCase().replace(/[-_]+/g, ' '); }
function inferPartnerCluster(program) {
  const blob = [program.name, program.primarySector, ...(program.topicTags || [])].join(' ').toLowerCase();
  if (/food|nutrition|broth|fresh|raw|feeding/.test(blob)) return { slug: 'dog-food', label: 'Food & nutrition', icon: '🍖' };
  if (/training|leash|harness|collar|fence|obedience|gear/.test(blob)) return { slug: 'training', label: 'Training & gear', icon: '🦮' };
  if (/gift|portrait|memorial|license|lifestyle|apparel|accessor/.test(blob)) return { slug: 'lifestyle', label: 'Lifestyle & gifts', icon: '🎁' };
  if (/bed|sleep|comfort|home/.test(blob)) return { slug: 'beds', label: 'Beds & comfort', icon: '🛏️' };
  if (/health|insurance|vet|wellness|supplement/.test(blob)) return { slug: 'health', label: 'Health & wellness', icon: '🩺' };
  return { slug: 'pupwiki-partners', label: 'PupWiki Partners', icon: '🤝' };
}
function cleanDomain(program) {
  const domain = program.validDomains?.[0]?.domain || program.displayUrl || '';
  return String(domain).replace(/^https?:\/\//, '').replace(/^\*\./, '').replace(/\/$/, '');
}
function productRows(program, products) {
  return products.filter((product) => String(product.advertiserId || '') === String(program.advertiserId || '') || String(product.programId || '') === String(program.key || '')).slice(0, 8);
}
function bannerRows(program, bannerRegistry) {
  const banners = Array.isArray(bannerRegistry) ? bannerRegistry : bannerRegistry?.banners || [];
  return banners.filter((banner) => String(banner.advertiserId || '') === String(program.advertiserId || '') || String(banner.programKey || '') === String(program.key || '')).slice(0, 6);
}
function yamlList(values) {
  return `[${values.map((value) => quote(value)).join(', ')}]`;
}
function buildMarkdown(program, products, banners) {
  const cluster = inferPartnerCluster(program);
  const pageSlug = `partner-${program.key}`;
  const tags = Array.from(new Set(['partner', 'awin', cluster.slug, ...(program.topicTags || [])].map(slugify).filter(Boolean))).slice(0, 14);
  const kpi = program.kpi || {};
  const commission = percentRange(program.commissionRange);
  const domain = cleanDomain(program);
  const safeName = program.name || titleCase(program.key);
  const logo = program.logoUrl || '';
  const deeplink = program.deeplink || program.configuredDeeplink || program.clickThroughUrl || '';
  const productCount = products.length;
  const bannerCount = banners.length;
  const productList = productCount
    ? products.map((product) => `- **${product.name || 'Partner product'}** — ${product.category || product.categoryLabel || 'Partner offer'}${product.url ? ` ([view partner listing](${product.url}))` : ''}`).join('\n')
    : '- This partner currently uses a brand/profile deeplink on PupWiki. Product-feed rows can be added automatically when AWIN exposes usable feed data.';
  const creativeList = bannerCount
    ? banners.map((banner) => `- ${banner.label || banner.alt || 'Partner creative'} — source: ${banner.source || 'AWIN'}`).join('\n')
    : '- No dedicated creative assets were imported yet. The profile logo and AWIN partner deeplink are used as the safe fallback.';
  const topicLine = tags.slice(0, 8).map(normalizeTopic).join(', ');

  return `---
title: ${quote(`${safeName} Partner Profile — PupWiki AWIN Resource`)}
seoTitle: ${quote(`${safeName} Partner Profile — Products, Deeplinks & PupWiki Fit`)}
displayTitle: ${quote(`${safeName} partner profile`)}
description: ${quote(`PupWiki partner profile for ${safeName}, including product or service focus, AWIN deeplink, topic fit, commercial notes and safe disclosure context.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
author: "The PupWiki Team"
category: "PupWiki Partners"
tags: ${yamlList(tags)}
postType: "general"
contentTier: "money"
indexInBlog: false
generated: true
reviewMethod: "product-data-comparison"
claimSensitivity: "low"
monetizationIntent: "service"
affiliateDisclosure: true
medicalDisclaimer: false
heroImage: ${quote(logo)}
heroImageAlt: ${quote(`${safeName} logo`)}
readTime: 5
partnerKey: ${quote(program.key)}
partnerAdvertiserId: ${quote(program.advertiserId)}
partnerCluster: ${quote(cluster.slug)}
partnerDeeplink: ${quote(deeplink)}
canonicalUrl: ${quote(`https://pupwiki.com/blog/${pageSlug}`)}
---

> **Affiliate disclosure:** ${safeName} is listed through PupWiki's AWIN partner data. PupWiki may earn a commission from qualifying partner links at no extra cost to you.

## What is ${safeName}?

${safeName} is an AWIN partner currently mapped to PupWiki's **${cluster.label}** cluster. This profile helps readers understand where the partner may fit in the PupWiki ecosystem, which pages it can support, and which deeplinks or creative assets are available for responsible affiliate placement.

- **Partner category:** ${cluster.icon} ${cluster.label}
- **Website/domain:** ${domain || 'Available through AWIN tracking link'}
- **AWIN relationship:** ${program.relationship || 'joined'} / ${program.status || 'active'}
- **Primary sector:** ${program.primarySector || 'Pet and dog-owner products/services'}
- **Commission signal:** ${commission}
- **Topic fit:** ${topicLine || 'partner, dog owner resources'}

## PupWiki fit and page placement

${safeName} can be considered for pages that match these intent tags: **${topicLine || 'partner resources'}**. The engine should prefer placements where the product or service naturally supports the reader's current task.

Recommended placement rules:

1. Use this partner on pages that match the same product/service cluster.
2. Avoid health or emergency contexts unless the partner is specifically relevant and the page wording remains conservative.
3. Keep partner links clearly disclosed and avoid hardcoded pricing or unsupported claims.
4. Prefer direct AWIN deeplinks or product-feed URLs when available.

## Deeplink and tracking

Primary partner link:

[Visit ${safeName}](${deeplink})

Use this as the default PupWiki partner CTA unless a more specific product-feed link or creative deeplink is available.

## Product and feed data

Imported product rows for this partner: **${productCount}**.

${productList}

## Creative assets and logos

Imported creative/banner rows for this partner: **${bannerCount}**.

${creativeList}

${logo ? `![${safeName} logo](${logo})` : ''}

## Performance and commercial notes

Available AWIN KPI fields from the latest sync:

- **EPC:** ${kpi.epc ?? 'n/a'}
- **Conversion rate:** ${kpi.conversionRate ?? 'n/a'}
- **Approval percentage:** ${kpi.approvalPercentage ?? 'n/a'}
- **Average payment time:** ${kpi.averagePaymentTime ?? 'n/a'} days
- **Validation days:** ${kpi.validationDays ?? 'n/a'}

These figures are directional signals from AWIN data and can change. They should inform placement priority, not replace editorial relevance.

## Related PupWiki paths

- [PupWiki Partners](/categories/pupwiki-partners)
- [${cluster.label}](/categories/${cluster.slug})
- [Affiliate disclosure](/disclosure)
- [How PupWiki researches guides](/how-we-test)
`;
}

function main() {
  mkdirSync(BLOG_DIR, { recursive: true });
  const awinData = readJson(PROGRAMS_PATH, null);
  const products = readJson(PRODUCTS_PATH, []);
  const banners = readJson(BANNERS_PATH, { banners: [] });

  if (!awinData || !Array.isArray(awinData.programs)) {
    warn('No awin-programs.json programs array found. Skipping partner page generation.');
    return;
  }

  const activePrograms = awinData.programs.filter((program) => program.relationship === 'joined' && program.isActive !== false && program.key);
  let written = 0;
  const summary = [];

  for (const program of activePrograms) {
    const rows = productRows(program, products);
    const creativeRows = bannerRows(program, banners);
    const slug = `partner-${program.key}`;
    const file = join(BLOG_DIR, `${slug}.md`);
    const markdown = buildMarkdown(program, rows, creativeRows);
    if (APPLY) writeFileSync(file, markdown, 'utf8');
    written += 1;
    summary.push({
      key: program.key,
      advertiserId: program.advertiserId,
      name: program.name,
      slug,
      href: `/blog/${slug}`,
      cluster: inferPartnerCluster(program).slug,
      productRows: rows.length,
      creativeRows: creativeRows.length,
      hasLogo: Boolean(program.logoUrl),
      hasDeeplink: Boolean(program.deeplink || program.clickThroughUrl),
      feedIds: program.feedIds || [],
    });
  }

  if (APPLY) {
    writeFileSync(SUMMARY_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), totalPartners: summary.length, partners: summary }, null, 2)}\n`, 'utf8');
  }

  log(`${APPLY ? 'Generated' : 'Checked'} ${written} partner profile page(s).`);
}

main();
