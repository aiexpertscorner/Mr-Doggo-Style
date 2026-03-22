/**
 * data-audit.mjs
 * ─────────────────────────────────────────────────────────────
 * Full audit of all data files: completeness, consistency,
 * cross-references, and PSEO readiness score.
 *
 * Run:  node scripts/data-audit.mjs
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');

const G = s => `\x1b[32m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const W = s => `\x1b[1m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

function load(file: string) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function pct(n: number, total: number) {
  return `${Math.round(n * 100 / total)}%`;
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  📊  MrDoggoStyle Data Architecture Audit');
console.log('══════════════════════════════════════════════════════\n');

// ── Load all datasets ──────────────────────────────────────────
const masterBreeds       = load('master-breeds.json');
const products           = load('products.json');
const productIndex       = load('product-index.json');
const contentStatus      = load('content-status.json');
const clusterDefinitions = load('cluster-definitions.json');
const breedLinkMap       = load('breed-link-map.json');
const dogNames           = load('dog-names.json');
const breedNameMap       = load('breed-name-map.json');
const fciTaxonomy        = load('fci_taxonomy.json');
const categoryTaxonomy   = load('category-taxonomy.json');

// ── File presence ──────────────────────────────────────────────
console.log(B('── DATA FILES ──'));
const FILES = [
  ['master-breeds.json',       masterBreeds,       'Core breed database — single source of truth'],
  ['products.json',            products,           'Product database (125 products, 10 categories)'],
  ['product-index.json',       productIndex,       'Flat product lookup index'],
  ['cluster-definitions.json', clusterDefinitions, '10 PSEO page type definitions'],
  ['content-status.json',      contentStatus,      'Page generation tracker per breed'],
  ['breed-link-map.json',      breedLinkMap,       'Internal link URLs per breed'],
  ['dog-names.json',           dogNames,           'Dog name database (7,267 names)'],
  ['breed-name-map.json',      breedNameMap,       'Breed → name style mapping'],
  ['fci_taxonomy.json',        fciTaxonomy,        'FCI classification (364 breeds)'],
  ['category-taxonomy.json',   categoryTaxonomy,   'AKC/FCI group → content angle mapping'],
];

for (const [name, data, desc] of FILES) {
  const icon = data ? G('✓') : R('✗ MISSING');
  const size = data ? D(`${JSON.stringify(data).length > 100000
    ? (JSON.stringify(data).length / 1024).toFixed(0) + 'KB'
    : (JSON.stringify(data).length / 1024).toFixed(1) + 'KB'}`) : '';
  console.log(`  ${icon}  ${name.padEnd(35)} ${size.padStart(8)}  ${D(desc)}`);
}

// ── Master breeds audit ────────────────────────────────────────
if (masterBreeds) {
  console.log(B('\n── MASTER-BREEDS.JSON AUDIT ──'));
  const breeds = masterBreeds;
  const total  = breeds.length;

  const checks = [
    ['slug',           breeds.filter((b: any) => b.slug).length],
    ['name',           breeds.filter((b: any) => b.name).length],
    ['size_category',  breeds.filter((b: any) => b.size_category).length],
    ['coat_type',      breeds.filter((b: any) => b.coat_type && b.coat_type !== 'medium').length],
    ['energy_level',   breeds.filter((b: any) => b.energy_level).length],
    ['fci_group',      breeds.filter((b: any) => b.fci_group).length],
    ['name_styles',    breeds.filter((b: any) => b.name_styles?.length).length],
    ['product_picks',  breeds.filter((b: any) => Object.keys(b.product_picks || {}).length >= 5).length],
    ['seo.title',      breeds.filter((b: any) => b.seo?.title).length],
    ['care_tips',      breeds.filter((b: any) => b.care_tips?.length).length],
    ['ranking_data',   breeds.filter((b: any) => b.enrichment?.has_ranking_data).length],
    ['country_data',   breeds.filter((b: any) => b.enrichment?.has_country_data).length],
  ];

  for (const [field, count] of checks) {
    const p = Math.round(count * 100 / total);
    const bar = '█'.repeat(Math.round(p / 5)) + '░'.repeat(20 - Math.round(p / 5));
    const color = p >= 90 ? G : p >= 60 ? Y : R;
    console.log(`  ${color(bar)}  ${pct(count, total).padStart(4)}  ${field}`);
  }

  // Coat type distribution
  const coatDist: Record<string, number> = {};
  for (const b of breeds as any[]) {
    coatDist[b.coat_type] = (coatDist[b.coat_type] || 0) + 1;
  }
  console.log(`\n  Coat types: ${Object.entries(coatDist).map(([k,v]) => `${k}(${v})`).join(' · ')}`);

  // Energy distribution
  const energyDist: Record<string, number> = {};
  for (const b of breeds as any[]) {
    energyDist[b.energy_level] = (energyDist[b.energy_level] || 0) + 1;
  }
  console.log(`  Energy:     ${Object.entries(energyDist).map(([k,v]) => `${k}(${v})`).join(' · ')}`);
}

// ── Products audit ─────────────────────────────────────────────
if (products) {
  console.log(B('\n── PRODUCTS.JSON AUDIT ──'));
  for (const [cat, items] of Object.entries(products) as [string, any[]][]) {
    const withImg   = items.filter(p => p.image?.includes('media-amazon')).length;
    const withScore = items.filter(p => p.score).length;
    const needsAsin = items.filter(p => p.needs_asin).length;
    const icon = withImg === items.length ? G('✓') : Y('⚠');
    console.log(`  ${icon}  ${cat.padEnd(15)} ${String(items.length).padStart(3)} products  ${withImg}/${items.length} images  ${withScore}/${items.length} scored  ${needsAsin > 0 ? Y(`${needsAsin} need ASIN`) : G('all ASINs ok')}`);
  }
  const total = Object.values(products as Record<string, any[]>).reduce((a, b) => a + b.length, 0);
  console.log(`\n  Total: ${W(total)} products`);
}

// ── PSEO readiness score ───────────────────────────────────────
if (masterBreeds && products && contentStatus) {
  console.log(B('\n── PSEO READINESS SCORE ──'));

  const totalPages = Object.keys(contentStatus).length * Object.keys(Object.values(contentStatus)[0] as object).length;
  const donePages  = Object.values(contentStatus as Record<string, Record<string, boolean>>)
    .reduce((acc, pages) => acc + Object.values(pages).filter(Boolean).length, 0);

  const scores = {
    'Breed data complete':    masterBreeds.filter((b: any) => b.size_category && b.coat_type && b.energy_level).length / masterBreeds.length,
    'Products matched':       masterBreeds.filter((b: any) => Object.keys(b.product_picks || {}).length >= 5).length / masterBreeds.length,
    'FCI data linked':        masterBreeds.filter((b: any) => b.fci_group).length / masterBreeds.length,
    'Name styles assigned':   masterBreeds.filter((b: any) => b.name_styles?.length).length / masterBreeds.length,
    'SEO metadata present':   masterBreeds.filter((b: any) => b.seo?.title).length / masterBreeds.length,
    'Ranking data loaded':    masterBreeds.filter((b: any) => b.enrichment?.has_ranking_data).length / masterBreeds.length,
    'Country data loaded':    masterBreeds.filter((b: any) => b.enrichment?.has_country_data).length / masterBreeds.length,
    'Content generated':      donePages / totalPages,
  };

  let total_score = 0;
  for (const [label, score] of Object.entries(scores)) {
    const p   = Math.round(score * 100);
    const bar = '█'.repeat(Math.round(p / 5)) + '░'.repeat(20 - Math.round(p / 5));
    const col = score >= 0.9 ? G : score >= 0.5 ? Y : R;
    console.log(`  ${col(bar)}  ${String(p).padStart(3)}%  ${label}`);
    total_score += score;
  }
  const overall = Math.round((total_score / Object.keys(scores).length) * 100);
  const ocol    = overall >= 80 ? G : overall >= 60 ? Y : R;
  console.log(`\n  ${W('Overall PSEO readiness:')} ${ocol(overall + '%')}`);

  console.log(B('\n── CONTENT PIPELINE STATUS ──'));
  console.log(`  Total pages:     ${W(totalPages.toLocaleString())}`);
  console.log(`  Generated:       ${G(donePages.toLocaleString())} (${pct(donePages, totalPages)})`);
  console.log(`  Remaining:       ${Y((totalPages - donePages).toLocaleString())} (${pct(totalPages - donePages, totalPages)})`);
}

console.log('\n══════════════════════════════════════════════════════\n');
