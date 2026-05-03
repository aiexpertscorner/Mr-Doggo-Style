#!/usr/bin/env node
/**
 * AWIN-led PSEO generator for PupWiki.
 *
 * Purpose:
 * - Generate a small set of rich commerce cluster pages from current joined/active AWIN programmes.
 * - Keep breed-specific generation manual/reviewed.
 * - Never fail production build when used through the CI wrapper script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeMonetizationIntent,
  normalizeReviewMethod,
  sanitizePublicDogCopy,
} from '../lib/public-content-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply');
const INCLUDE_EXISTING = process.argv.includes('--include-existing');
const MODE = getArg('mode') || 'clusters';
const LIMIT = Number(getArg('limit') || 10);
const MIN_PROGRAMS = Number(getArg('min-programs') || 1);

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}
function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}
function writeJson(rel, data) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function titleCase(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function quote(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
function yamlList(values) {
  return `[${Array.from(new Set((values || []).filter(Boolean).map(String))).map(quote).join(', ')}]`;
}
function clean(value) {
  return sanitizePublicDogCopy(String(value || '')).replace(/\s+/g, ' ').trim();
}
function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
function commissionLabel(program) {
  const pct = (Array.isArray(program.commissionRange) ? program.commissionRange : []).find((item) => item?.type === 'percentage');
  if (!pct) return 'AWIN commission terms';
  return Number(pct.min) === Number(pct.max) ? `${pct.max}% commission` : `${pct.min}%â€“${pct.max}% commission`;
}

const awin = readJson('src/data/awin-programs.json', { programs: [] });
const products = readJson('src/data/awin-products.json', []);
const backlog = readJson('src/data/pseo-opportunity-backlog.json', { items: [] });
const breeds = [...readJson('src/data/master-breeds.json', []), ...readJson('src/data/master-crossbreeds.json', [])];
const existing = new Set(walk(BLOG_DIR).filter((file) => file.endsWith('.md')).map((file) => path.basename(file, '.md')));
const programs = (awin.programs || []).filter((program) => program.relationship === 'joined' && program.isActive !== false);

const RULES = [
  {
    slug: 'dog-food-nutrition-partners',
    title: 'Dog Food, Toppers and Feeding Help',
    tags: ['food', 'nutrition', 'feeding', 'fresh-food', 'raw-food', 'sensitive-stomach', 'broth', 'allergies', 'appliances'],
    amazonQueries: ['dog food storage container', 'slow feeder dog bowl', 'dog broth topper', 'freeze dried raw dog food'],
    internalTargets: ['/categories/dog-food', '/categories/puppy', '/categories/senior-dogs', '/breeds', '/cost-calculator'],
    intent: 'food',
    sensitivity: 'high',
    intro: 'Use this guide to compare dog food, toppers, storage, feeding tools and nutrition services by life stage, ingredient fit, preparation time, budget and veterinary context.',
  },
  {
    slug: 'dog-training-gear-safety-partners',
    title: 'Dog Training, Walking and Safety Help',
    tags: ['training', 'behavior', 'obedience', 'recall', 'leash', 'harness', 'working', 'active', 'gear', 'safety', 'fence'],
    amazonQueries: ['no pull dog harness', 'long leash recall training', 'dog training treats', 'dog training clicker'],
    internalTargets: ['/categories/training', '/categories/dog-services', '/categories/puppy', '/categories/travel', '/breeds'],
    intent: 'training',
    sensitivity: 'medium',
    intro: 'Use this guide to compare training support, walking gear, recall practice, containment, active-dog routines and safer outings without treating gear as a shortcut for kind training.',
  },
  {
    slug: 'personalized-dog-gifts-lifestyle-partners',
    title: 'Personalized Dog Gifts and Everyday Dog Life',
    tags: ['gift', 'lifestyle', 'portrait', 'memorial', 'dog-names', 'apparel', 'accessories', 'id', 'license'],
    amazonQueries: ['personalized dog gifts', 'custom dog portrait', 'dog owner gifts', 'personalized dog id tag'],
    internalTargets: ['/categories/lifestyle', '/dog-names', '/categories/pupwiki-partners', '/breeds'],
    intent: 'lifestyle',
    sensitivity: 'low',
    intro: 'Use this guide to compare personalized gifts, portraits, IDs, accessories and dog-owner keepsakes by meaning, quality, timing, sizing and everyday usefulness.',
  },
  {
    slug: 'dog-beds-comfort-home-partners',
    title: 'Dog Beds, Comfort and Home Setup',
    tags: ['beds', 'bed', 'comfort', 'home', 'sleep', 'orthopedic', 'senior-dog'],
    amazonQueries: ['orthopedic dog bed washable cover', 'washable dog crate bed', 'senior dog bed', 'cooling dog bed'],
    internalTargets: ['/categories/beds', '/categories/senior-dogs', '/categories/puppy', '/breeds'],
    intent: 'cost',
    sensitivity: 'medium',
    intro: 'Use this guide to compare beds, crate comfort, washable covers, senior comfort, cooling, travel rest and household setup by the dogâ€™s size and sleep style.',
  },
  {
    slug: 'dog-health-wellness-adjacent-partners',
    title: 'Dog Health, Wellness and Vet-Care Planning',
    tags: ['health', 'wellness', 'care', 'nutrition', 'supplements', 'vet', 'insurance'],
    amazonQueries: ['dog first aid kit', 'dog dental care kit', 'senior dog comfort supplies'],
    internalTargets: ['/categories/health', '/categories/dog-services', '/categories/senior-dogs', '/categories/insurance', '/disclosure'],
    intent: 'vet-care',
    sensitivity: 'high',
    intro: 'Use this guide to compare health-adjacent resources, wellness routines, insurance timing and vet-care planning while keeping medical decisions with a veterinarian.',
  },
  {
    slug: 'dog-services-care-planning',
    title: 'Dog Services, Local Care and Booking Questions',
    tags: ['service', 'services', 'vet', 'telehealth', 'grooming', 'training', 'boarding', 'walking', 'daycare', 'insurance', 'subscription'],
    amazonQueries: [],
    internalTargets: ['/categories/dog-services', '/categories/health', '/categories/training', '/categories/grooming', '/categories/insurance', '/breeds'],
    intent: 'service',
    sensitivity: 'high',
    intro: 'Use this guide to compare dog services such as vet support, insurance, grooming appointments, training help, walking, boarding and care subscriptions. Later local pages can connect this same structure to maps and nearby providers.',
  },
];

function scoreProgram(program) {
  const kpi = program.kpi || {};
  return Number(program.priority || 50) + Number(kpi.epc || 0) * 8 + Number(kpi.conversionRate || 0) * 1.5 + Number(kpi.approvalPercentage || 0) * 0.12 + (program.hasLogo ? 5 : 0) + (program.hasProductFeed ? 6 : 0);
}
function matches(obj, rule) {
  const tags = (obj.topicTags || []).map(slugify);
  const blob = [obj.name, obj.description, obj.category, obj.merchant, obj.primarySector, obj.displayUrl, ...tags].join(' ').toLowerCase();
  return rule.tags.some((tag) => tags.includes(slugify(tag)) || blob.includes(String(tag).replace(/-/g, ' ')) || blob.includes(slugify(tag)));
}
function productLine(product) {
  const price = Number(product.price) > 0 ? ` - listed at $${Number(product.price).toFixed(2)} when last checked` : '';
  return sanitizePublicDogCopy(`- **${product.name}** from ${product.merchant || 'brand'}${price}. ${clean(product.description).slice(0, 150)}${product.url ? ` [Review dog-fit details](${product.url})` : ''}`);
}
function partnerLine(program) {
  const details = [
    program.primarySector,
    program.hasProductFeed ? 'product or service details available' : 'brand details available',
  ].filter(Boolean).join('; ');
  return sanitizePublicDogCopy(`- **${program.name}** - ${details}. Useful to compare for fit, trust, availability, terms and dog-care purpose. [Review ${program.name}](${program.deeplink || program.clickThroughUrl})`);
}
function getClusters() {
  return RULES.map((rule) => {
    const matchedPrograms = programs.filter((program) => matches(program, rule)).sort((a, b) => scoreProgram(b) - scoreProgram(a));
    const matchedProducts = products.filter((product) => matches(product, rule));
    return {
      kind: 'cluster',
      slug: rule.slug,
      suggestedSlug: rule.slug,
      title: rule.title,
      rule,
      programs: matchedPrograms,
      products: matchedProducts.slice(0, 16),
      priorityScore: Math.round(matchedPrograms.reduce((sum, program) => sum + scoreProgram(program), 0) + matchedProducts.length * 4 + matchedPrograms.length * 20),
      amazonQueries: rule.amazonQueries,
      internalLinkTargets: unique([...rule.internalTargets, '/categories/pupwiki-partners', '/disclosure']),
    };
  }).filter((cluster) => cluster.programs.length >= MIN_PROGRAMS);
}
function getBreedPages(clusters) {
  const byTag = new Map();
  for (const cluster of clusters) for (const tag of cluster.rule.tags) byTag.set(slugify(tag), cluster);
  return (backlog.items || []).filter((item) => item.type === 'breed-family-page').map((item) => {
    const family = slugify(item.family || item.cluster || '');
    const cluster = byTag.get(family) || clusters.find((candidate) => candidate.rule.tags.some((tag) => family.includes(slugify(tag)) || slugify(tag).includes(family)));
    const breed = breeds.find((breedItem) => breedItem.slug === item.breedSlug);
    if (!cluster || !breed) return null;
    return { ...item, kind: 'breed', commerceCluster: cluster.slug, commerceClusterTitle: cluster.title, programmes: cluster.programs.map((program) => program.name), products: cluster.products.slice(0, 6), amazonQueries: cluster.amazonQueries, internalLinkTargets: unique([...(item.internalLinkTargets || []), `/blog/${cluster.slug}`, ...cluster.internalLinkTargets]) };
  }).filter(Boolean);
}
function renderCluster(cluster) {
  const tags = unique([cluster.slug, ...cluster.rule.tags, ...cluster.programs.flatMap((program) => program.topicTags || []), ...cluster.products.flatMap((product) => product.topicTags || [])]).map(slugify);
  const sensitive = cluster.rule.sensitivity === 'high';
  const relatedLinks = cluster.internalLinkTargets.map((href) => `- [${titleCase(href.replace(/^\//, '').replace(/\//g, ' â€º '))}](${href})`).join('\n');
  const amazonCoverage = cluster.amazonQueries.length ? cluster.amazonQueries.map((query) => `- ${query}`).join('\n') : '- This journey is mainly service-led, so compare provider details, booking terms, coverage, reviews and dog fit before choosing.';
  const body = `> **Reader-support note:** PupWiki may earn from qualifying partner links. Brand availability, offers, products and terms can change.
${sensitive ? '\n> **Health-sensitive note:** This page is for comparison and planning only. It does not provide veterinary, medical, insurance, or financial advice.\n' : ''}
## What this guide helps you decide

${cluster.rule.intro}

It is written for people who already have a dog and for people still deciding whether a dog fits their home, time, budget and care expectations.

## Dog brands and services to compare

${cluster.programs.map(partnerLine).join('\n')}

## Products and service details worth reviewing

${cluster.products.length ? cluster.products.slice(0, 8).map(productLine).join('\n') : '- This guide currently has brand or service coverage but limited detailed product rows. Start with provider fit, service terms, availability, reviews and dog-care purpose.'}

## How to compare these options

- Match the product or service to the dogâ€™s life stage, size, activity level and owner goal.
- Confirm shipping, availability, formula, sizing, subscription terms, return policy or service terms on the partner site.
- If you are still choosing a dog, use these options to understand the real care, time and budget commitments behind ownership.
- Treat price and availability as dynamic; do not rely on older imported data.

## Related PupWiki pages

${relatedLinks}

## Extra comparison paths

${amazonCoverage}
`;
  return `---
title: ${quote(`${cluster.title} - PupWiki Dog Guide`)}
seoTitle: ${quote(`${cluster.title} - Brands, Services and Dog-Fit Checks`)}
displayTitle: ${quote(cluster.title)}
description: ${quote(`Compare dog-focused brands, products and services for ${cluster.title.toLowerCase()}, with practical checks for current and future dog owners.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
author: "The PupWiki Team"
category: "PupWiki Partners"
tags: ${yamlList(tags)}
postType: "comparison"
contentTier: "money"
cluster: ${quote(cluster.slug)}
productFamilies: ${yamlList(cluster.rule.tags)}
awinTopicTags: ${yamlList(tags)}
amazonQueries: ${yamlList(cluster.amazonQueries)}
internalLinkTargets: ${yamlList(cluster.internalLinkTargets)}
generated: true
indexInBlog: false
reviewMethod: ${quote(normalizeReviewMethod('product-data-comparison'))}
claimSensitivity: ${quote(cluster.rule.sensitivity)}
monetizationIntent: ${quote(normalizeMonetizationIntent(cluster.rule.intent || cluster.rule.tags[0] || 'service'))}
affiliateDisclosure: true
medicalDisclaimer: ${sensitive ? 'true' : 'false'}
partnerProgramKeys: ${yamlList(cluster.programs.map((program) => program.key))}
partnerAdvertiserIds: ${yamlList(cluster.programs.map((program) => program.advertiserId))}
canonicalUrl: ${quote(`https://pupwiki.com/blog/${cluster.slug}`)}
---

${body}`;
}
function renderBreedPage(item) {
  const breed = breeds.find((breedItem) => breedItem.slug === item.breedSlug);
  const title = `${breed.name} ${titleCase(item.family)} Partner and Product Planning Guide`;
  const tags = unique([item.family, item.cluster, item.commerceCluster, breed.slug, breed.name, ...item.programmes, ...item.amazonQueries]).map(slugify);
  const body = `> **Affiliate disclosure:** PupWiki may earn from qualifying partner links.

## Why this guide is linked to current partner data

This page exists because PupWiki has active partner or product coverage for **${item.commerceClusterTitle}** and the content inventory identified a relevant gap for **${breed.name}**.

Relevant partner programmes:

${item.programmes.map((name) => `- ${name}`).join('\n')}

## Product/service signals to compare

${item.products.length ? item.products.map(productLine).join('\n') : '- Partner product rows are limited, so the page relies on active partner topic tags and deeplinks for now.'}

## Related PupWiki paths

${item.internalLinkTargets.map((href) => `- [${titleCase(href.replace(/^\//, '').replace(/\//g, ' â€º '))}](${href})`).join('\n')}
`;
  return `---
title: ${quote(title)}
seoTitle: ${quote(title)}
displayTitle: ${quote(`${breed.name} ${titleCase(item.family)} planning guide`)}
description: ${quote(`A PupWiki planning guide for ${breed.name} owners, generated from current partner coverage, product signals, internal links and commerce cluster data.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
author: "The PupWiki Team"
category: ${quote(titleCase(item.cluster))}
tags: ${yamlList(tags)}
postType: "product-roundup"
contentTier: "money"
cluster: ${quote(item.cluster)}
commerceCluster: ${quote(item.commerceCluster)}
productFamilies: ${yamlList([item.family, item.cluster, item.commerceCluster])}
awinTopicTags: ${yamlList(tags)}
amazonQueries: ${yamlList(item.amazonQueries)}
internalLinkTargets: ${yamlList(item.internalLinkTargets)}
generated: true
indexInBlog: false
reviewMethod: ${quote(normalizeReviewMethod('product-data-comparison'))}
claimSensitivity: ${quote(item.monetization?.claimSensitivity || 'medium')}
monetizationIntent: ${quote(normalizeMonetizationIntent(item.family))}
affiliateDisclosure: true
medicalDisclaimer: ${item.monetization?.claimSensitivity === 'high' ? 'true' : 'false'}
breedSlug: ${quote(breed.slug)}
breedName: ${quote(breed.name)}
canonicalUrl: ${quote(`https://pupwiki.com/blog/${item.suggestedSlug}`)}
---

${body}`;
}

const clusters = getClusters().sort((a, b) => b.priorityScore - a.priorityScore);
const breedPages = getBreedPages(clusters).sort((a, b) => Number(b.priorityScore || 0) - Number(a.priorityScore || 0));
const selected = [
  ...(MODE === 'clusters' || MODE === 'all' ? clusters : []),
  ...(MODE === 'breed-pages' || MODE === 'all' ? breedPages : []),
].filter((item) => INCLUDE_EXISTING || !existing.has(item.suggestedSlug || item.slug))
  .sort((a, b) => Number(b.priorityScore || 0) - Number(a.priorityScore || 0))
  .slice(0, LIMIT);

fs.mkdirSync(BLOG_DIR, { recursive: true });
const generated = [];
const skipped = [];
for (const item of selected) {
  try {
    const slug = item.suggestedSlug || item.slug;
    const markdown = sanitizePublicDogCopy(item.kind === 'breed' ? renderBreedPage(item) : renderCluster(item));
    if (APPLY) fs.writeFileSync(path.join(BLOG_DIR, `${slug}.md`), markdown, 'utf8');
    generated.push({ kind: item.kind || 'cluster', slug, path: `/blog/${slug}`, priorityScore: item.priorityScore, programmes: item.programs?.map((program) => program.name) || item.programmes || [] });
  } catch (error) {
    skipped.push({ slug: item.suggestedSlug || item.slug, reason: error.message });
  }
}
const summary = {
  generatedAt: new Date().toISOString(),
  apply: APPLY,
  mode: MODE,
  limit: LIMIT,
  minPrograms: MIN_PROGRAMS,
  activeProgramCount: programs.length,
  commerceClusterCount: clusters.length,
  breedPageOpportunityCount: breedPages.length,
  generatedCount: generated.length,
  skippedCount: skipped.length,
  generated,
  skipped,
  topClusters: clusters.slice(0, 10).map((cluster) => ({ slug: cluster.slug, score: cluster.priorityScore, programmes: cluster.programs.map((program) => program.name), products: cluster.products.length })),
};
writeJson(APPLY ? 'src/data/pseo-generation-summary.json' : 'src/data/pseo-generation-summary.preview.json', summary);
console.log(JSON.stringify(summary, null, 2));

