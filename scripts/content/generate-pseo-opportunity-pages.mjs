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
  return Number(pct.min) === Number(pct.max) ? `${pct.max}% commission` : `${pct.min}%–${pct.max}% commission`;
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
    title: 'Dog Food, Broth and Nutrition Partners',
    tags: ['food', 'nutrition', 'feeding', 'fresh-food', 'raw-food', 'sensitive-stomach', 'broth', 'allergies', 'appliances'],
    amazonQueries: ['dog food storage container', 'slow feeder dog bowl', 'dog broth topper', 'freeze dried raw dog food'],
    internalTargets: ['/categories/dog-food', '/categories/puppy', '/categories/senior-dogs', '/breeds', '/cost-calculator'],
    sensitivity: 'high',
    intro: 'Food and nutrition pages convert best when they help readers compare feeding style, ingredient fit, life stage, budget and preparation time without making medical claims.',
  },
  {
    slug: 'dog-training-gear-safety-partners',
    title: 'Dog Training, Recall, Harness and Safety Gear Partners',
    tags: ['training', 'behavior', 'obedience', 'recall', 'leash', 'harness', 'working', 'active', 'gear', 'safety', 'fence'],
    amazonQueries: ['no pull dog harness', 'long leash recall training', 'dog training treats', 'dog training clicker'],
    internalTargets: ['/categories/training', '/categories/puppy', '/categories/travel', '/breeds'],
    sensitivity: 'medium',
    intro: 'Training and safety pages should connect product choices to recall, leash manners, containment, active-dog routines and safer outings.',
  },
  {
    slug: 'personalized-dog-gifts-lifestyle-partners',
    title: 'Personalized Dog Gifts, Portraits and Lifestyle Partners',
    tags: ['gift', 'lifestyle', 'portrait', 'memorial', 'dog-names', 'apparel', 'accessories', 'id', 'license'],
    amazonQueries: ['personalized dog gifts', 'custom dog portrait', 'dog owner gifts', 'personalized dog id tag'],
    internalTargets: ['/categories/lifestyle', '/dog-names', '/categories/pupwiki-partners', '/breeds'],
    sensitivity: 'low',
    intro: 'Lifestyle and gift pages work best when they match emotional intent around dog names, memorials, portraits, IDs, accessories and breed-inspired gifts.',
  },
  {
    slug: 'dog-beds-comfort-home-partners',
    title: 'Dog Beds, Comfort and Home Setup Partners',
    tags: ['beds', 'bed', 'comfort', 'home', 'sleep', 'orthopedic', 'senior-dog'],
    amazonQueries: ['orthopedic dog bed washable cover', 'washable dog crate bed', 'senior dog bed', 'cooling dog bed'],
    internalTargets: ['/categories/beds', '/categories/senior-dogs', '/categories/puppy', '/breeds'],
    sensitivity: 'medium',
    intro: 'Bed and home comfort pages should help readers compare sizing, washable covers, senior comfort, crate fit, temperature and household setup.',
  },
  {
    slug: 'dog-health-wellness-adjacent-partners',
    title: 'Dog Health, Wellness and Vet-Adjacent Partner Resources',
    tags: ['health', 'wellness', 'care', 'nutrition', 'supplements', 'vet', 'insurance'],
    amazonQueries: ['dog first aid kit', 'dog dental care kit', 'senior dog comfort supplies'],
    internalTargets: ['/categories/health', '/categories/senior-dogs', '/categories/insurance', '/disclosure'],
    sensitivity: 'high',
    intro: 'Health-adjacent pages need conservative language and should never present products or services as diagnosis or treatment.',
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
  return sanitizePublicDogCopy(`- **${product.name}** from ${product.merchant || 'brand'}${price}. ${clean(product.description).slice(0, 150)}${product.url ? ` [Review current details](${product.url})` : ''}`);
}
function partnerLine(program) {
  const details = [
    program.primarySector,
    program.hasLogo ? 'clear brand information' : '',
    program.hasProductFeed ? 'current product details available' : 'brand details available',
  ].filter(Boolean).join(' - ');
  return sanitizePublicDogCopy(`- **${program.name}** - ${details}. [Visit brand](${program.deeplink || program.clickThroughUrl})`);
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
  const relatedLinks = cluster.internalLinkTargets.map((href) => `- [${titleCase(href.replace(/^\//, '').replace(/\//g, ' › '))}](${href})`).join('\n');
  const body = `> **Affiliate disclosure:** PupWiki may earn from qualifying partner links. Partner availability, offers, product feeds and terms can change.
${sensitive ? '\n> **Health-sensitive note:** This page is for comparison and planning only. It does not provide veterinary, medical, insurance, or financial advice.\n' : ''}
## What this partner cluster covers

${cluster.rule.intro}

This page is generated from current active AWIN programme data, product rows, topic tags and conversion signals. It combines multiple relevant partners into one useful PupWiki commerce guide.

## Active partners in this cluster

${cluster.programs.map(partnerLine).join('\n')}

## Product and service signals

${cluster.products.length ? cluster.products.slice(0, 8).map(productLine).join('\n') : '- No detailed product-feed rows were available for this cluster yet, so PupWiki uses programme deeplinks, logos, topic tags and partner metadata as the initial commerce signal.'}

## How to compare these options

- Match the product or service to the dog’s life stage, size, activity level and owner goal.
- Confirm shipping, availability, formula, sizing, subscription terms, return policy or service terms on the partner site.
- Treat price and availability as dynamic; do not rely on older imported data.

## Related PupWiki pages

${relatedLinks}

## Amazon.com fallback search coverage

${cluster.amazonQueries.map((query) => `- ${query}`).join('\n')}
`;
  return `---
title: ${quote(`${cluster.title} — PupWiki Partner Guide`)}
seoTitle: ${quote(`${cluster.title} — Partner Guide, Product Signals and Deeplinks`)}
displayTitle: ${quote(cluster.title)}
description: ${quote(`Compare PupWiki partner resources for ${cluster.title.toLowerCase()}, including active AWIN programmes, product/service signals, deeplinks, Amazon.com fallback searches and related guides.`)}
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
monetizationIntent: ${quote(normalizeMonetizationIntent(cluster.rule.tags[0] || 'service'))}
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

${item.internalLinkTargets.map((href) => `- [${titleCase(href.replace(/^\//, '').replace(/\//g, ' › '))}](${href})`).join('\n')}
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
