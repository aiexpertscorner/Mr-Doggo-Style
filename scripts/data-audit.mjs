/**
 * data-audit.mjs
 * Full audit of all data files: completeness, cross-references, PSEO readiness.
 * Run: node scripts/data-audit.mjs
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

function load(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.error(`  ✗ Parse error in ${file}: ${e.message}`); return null; }
}

function pct(n, total) {
  return `${Math.round(n * 100 / total)}%`;
}

function bar(score) {
  const p   = Math.round(score * 100);
  const col = p >= 90 ? G : p >= 60 ? Y : R;
  const filled = Math.round(p / 5);
  return col('█'.repeat(filled) + '░'.repeat(20 - filled));
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  📊  MrDoggoStyle Data Architecture Audit');
console.log('══════════════════════════════════════════════════════\n');

// ── Load all datasets ──────────────────────────────────────────
const masterBreeds       = load('master-breeds.json');
const products           = load('products.json');
const productIndex       = load('product-index.json');
const contentStatus      = load('content-status.json');
const clusterDefs        = load('cluster-definitions.json');
const breedLinkMap       = load('breed-link-map.json');
const dogNames           = load('dog-names.json');
const breedNameMap       = load('breed-name-map.json');
const fciTaxonomy        = load('fci_taxonomy.json');
const categoryTaxonomy   = load('category-taxonomy.json');

// ── File presence ──────────────────────────────────────────────
console.log(B('── DATA FILES ──'));

const FILES = [
  ['master-breeds.json',        masterBreeds,     'Core breed database — single source of truth'],
  ['products.json',             products,         'Product database (125 products, 10 categories)'],
  ['product-index.json',        productIndex,     'Flat product lookup index'],
  ['cluster-definitions.json',  clusterDefs,      '10 PSEO page type definitions'],
  ['content-status.json',       contentStatus,    'Page generation tracker per breed'],
  ['breed-link-map.json',       breedLinkMap,     'Internal link URLs per breed'],
  ['dog-names.json',            dogNames,         'Dog name database (7,267 names)'],
  ['breed-name-map.json',       breedNameMap,     'Breed → name style mapping'],
  ['fci_taxonomy.json',         fciTaxonomy,      'FCI classification (364 breeds)'],
  ['category-taxonomy.json',    categoryTaxonomy, 'AKC/FCI group → content angle mapping'],
  ['dogs-ranking-dataset.csv',  fs.existsSync(path.join(DATA,'dogs-ranking-dataset.csv')) ? true : null, 'Ranking data (87 breeds)'],
  ['dog-breeds-by-country-2025.csv', fs.existsSync(path.join(DATA,'dog-breeds-by-country-2025.csv')) ? true : null, 'Country origin data'],
];

let missingCount = 0;
for (const [name, data, desc] of FILES) {
  if (!data) {
    console.log(`  ${R('✗ MISSING')}  ${name.padEnd(38)} ${D(desc)}`);
    missingCount++;
  } else {
    const raw  = typeof data === 'object' ? JSON.stringify(data) : '';
    const size = raw.length > 1000 ? D(`${(raw.length/1024).toFixed(0)}KB`) : D('—');
    console.log(`  ${G('✓')}         ${name.padEnd(38)} ${size.padStart(8)}  ${D(desc)}`);
  }
}

// ── Master breeds audit ────────────────────────────────────────
if (masterBreeds) {
  const breeds = masterBreeds;
  const total  = breeds.length;
  console.log(B(`\n── MASTER-BREEDS.JSON  (${total} breeds) ──`));

  const checks = [
    ['slug',                   breeds.filter(b => b.slug).length],
    ['name',                   breeds.filter(b => b.name).length],
    ['size_category',          breeds.filter(b => b.size_category).length],
    ['coat_type (non-medium)', breeds.filter(b => b.coat_type && b.coat_type !== 'medium').length],
    ['energy_level',           breeds.filter(b => b.energy_level).length],
    ['training_level',         breeds.filter(b => b.training_level).length],
    ['fci_group',              breeds.filter(b => b.fci_group).length],
    ['name_styles',            breeds.filter(b => b.name_styles?.length).length],
    ['product_picks ≥5 cats',  breeds.filter(b => Object.keys(b.product_picks || {}).length >= 5).length],
    ['product_picks ≥8 cats',  breeds.filter(b => Object.keys(b.product_picks || {}).length >= 8).length],
    ['seo.title',              breeds.filter(b => b.seo?.title).length],
    ['care_tips',              breeds.filter(b => b.care_tips?.length).length],
    ['life_expectancy',        breeds.filter(b => b.life_expectancy?.max).length],
    ['ranking_data',           breeds.filter(b => b.enrichment?.has_ranking_data).length],
    ['country_data',           breeds.filter(b => b.enrichment?.has_country_data).length],
    ['fci_status',             breeds.filter(b => b.fci_status).length],
  ];

  for (const [field, count] of checks) {
    const score = count / total;
    console.log(`  ${bar(score)}  ${pct(count, total).padStart(4)}  ${String(count).padStart(3)}/${total}  ${field}`);
  }

  // Distributions
  const coatDist = {}, energyDist = {}, sizeDist = {}, trainDist = {};
  for (const b of breeds) {
    coatDist[b.coat_type]        = (coatDist[b.coat_type]        || 0) + 1;
    energyDist[b.energy_level]   = (energyDist[b.energy_level]   || 0) + 1;
    sizeDist[b.size_category]    = (sizeDist[b.size_category]    || 0) + 1;
    trainDist[b.training_level]  = (trainDist[b.training_level]  || 0) + 1;
  }

  const fmt = obj => Object.entries(obj)
    .sort((a,b) => b[1]-a[1])
    .map(([k,v]) => `${k}(${v})`).join(' · ');

  console.log(`\n  ${D('Coat types:')}   ${fmt(coatDist)}`);
  console.log(`  ${D('Energy:')}       ${fmt(energyDist)}`);
  console.log(`  ${D('Size:')}         ${fmt(sizeDist)}`);
  console.log(`  ${D('Trainability:')} ${fmt(trainDist)}`);
}

// ── Products audit ─────────────────────────────────────────────
if (products) {
  console.log(B('\n── PRODUCTS.JSON AUDIT ──'));
  let totalProds = 0;
  for (const [cat, items] of Object.entries(products)) {
    totalProds += items.length;
    const withImg    = items.filter(p => p.image?.includes('media-amazon')).length;
    const withScore  = items.filter(p => p.score).length;
    const withVerdict= items.filter(p => p.verdict).length;
    const needsAsin  = items.filter(p => p.needs_asin).length;
    const allGood    = withImg === items.length && needsAsin === 0;
    const icon       = allGood ? G('✓') : needsAsin > 0 ? Y('⚠') : G('✓');
    console.log(
      `  ${icon}  ${cat.padEnd(14)} ${String(items.length).padStart(3)} prods  ` +
      `img:${withImg}/${items.length}  score:${withScore}/${items.length}  verdict:${withVerdict}/${items.length}  ` +
      (needsAsin > 0 ? Y(`${needsAsin} need ASIN`) : G('ASINs ok'))
    );
  }
  console.log(`\n  ${W('Total:')} ${totalProds} products`);
}

// ── Dog names audit ────────────────────────────────────────────
if (dogNames) {
  const enriched = dogNames.filter(n => n.enriched).length;
  const boys     = dogNames.filter(n => n.gender === 'boy').length;
  const girls    = dogNames.filter(n => n.gender === 'girl').length;
  console.log(B('\n── DOG-NAMES.JSON AUDIT ──'));
  console.log(`  Total names:   ${W(dogNames.length.toLocaleString())}`);
  console.log(`  Enriched:      ${enriched} (${pct(enriched, dogNames.length)}) — with category + inspiration`);
  console.log(`  Boys/Girls:    ${boys} / ${girls}`);
  if (breedNameMap) {
    console.log(`  Breed mappings: ${Object.keys(breedNameMap).length} breeds with style overrides`);
  }
}

// ── FCI taxonomy audit ─────────────────────────────────────────
if (fciTaxonomy) {
  const fciBreeds = fciTaxonomy.breeds || [];
  const recog  = fciBreeds.filter(b => b.fci_status === 'recognized').length;
  const prov   = fciBreeds.filter(b => b.fci_status === 'provisional').length;
  const unrec  = fciBreeds.filter(b => b.fci_status === 'unrecognized').length;
  console.log(B('\n── FCI-TAXONOMY.JSON AUDIT ──'));
  console.log(`  Total:       ${fciBreeds.length} breeds`);
  console.log(`  Recognized:  ${recog}  Provisional: ${prov}  Unrecognized: ${unrec}`);
  console.log(`  With groups: ${fciBreeds.filter(b => b.fci_group).length}`);
  console.log(`  With coats:  ${fciBreeds.filter(b => b.coat_hint && b.coat_hint !== 'medium').length}`);
}

// ── Cross-dataset consistency ──────────────────────────────────
if (masterBreeds && products) {
  console.log(B('\n── CROSS-DATASET CONSISTENCY ──'));

  // Check: all product_picks in master-breeds resolve to valid products
  const productIds = new Set(
    Object.values(products).flat().map(p => p.id)
  );
  let brokenRefs = 0;
  for (const breed of masterBreeds) {
    for (const [cat, prodId] of Object.entries(breed.product_picks || {})) {
      if (!productIds.has(prodId)) {
        brokenRefs++;
        if (brokenRefs <= 5) {
          console.log(`  ${R('✗')}  ${breed.slug} → ${cat}: "${prodId}" not found in products.json`);
        }
      }
    }
  }
  if (brokenRefs === 0) {
    console.log(`  ${G('✓')}  All product_picks resolve to valid product IDs`);
  } else {
    console.log(`  ${R('✗')}  ${brokenRefs} broken product references`);
  }

  // Check: master-breeds slugs match content-status keys
  if (contentStatus) {
    const statusSlugs = new Set(Object.keys(contentStatus));
    const breedSlugs  = new Set(masterBreeds.map(b => b.slug));
    const missing = [...breedSlugs].filter(s => !statusSlugs.has(s));
    const extra   = [...statusSlugs].filter(s => !breedSlugs.has(s));
    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ${G('✓')}  content-status.json in sync with master-breeds slugs`);
    } else {
      if (missing.length) console.log(`  ${Y('⚠')}  ${missing.length} breeds missing from content-status`);
      if (extra.length)   console.log(`  ${Y('⚠')}  ${extra.length} orphan entries in content-status`);
    }
  }
}

// ── PSEO readiness score ───────────────────────────────────────
if (masterBreeds && products && contentStatus) {
  console.log(B('\n── PSEO READINESS SCORE ──'));

  const pageTypes    = Object.keys(Object.values(contentStatus)[0] || {});
  const totalPages   = Object.keys(contentStatus).length * pageTypes.length;
  const donePages    = Object.values(contentStatus)
    .reduce((acc, pages) => acc + Object.values(pages).filter(Boolean).length, 0);

  const scores = {
    'Breed signals complete':  masterBreeds.filter(b => b.size_category && b.coat_type && b.energy_level).length / masterBreeds.length,
    'Products matched (≥8)':  masterBreeds.filter(b => Object.keys(b.product_picks||{}).length >= 8).length / masterBreeds.length,
    'FCI data linked':        masterBreeds.filter(b => b.fci_group).length / masterBreeds.length,
    'Name styles assigned':   masterBreeds.filter(b => b.name_styles?.length).length / masterBreeds.length,
    'SEO metadata present':   masterBreeds.filter(b => b.seo?.title).length / masterBreeds.length,
    'Product images OK':      Object.values(products).flat().filter(p => p.image?.includes('media-amazon')).length /
                              Object.values(products).flat().length,
    'Ranking data loaded':    masterBreeds.filter(b => b.enrichment?.has_ranking_data).length / masterBreeds.length,
    'Country data loaded':    masterBreeds.filter(b => b.enrichment?.has_country_data).length / masterBreeds.length,
    'Content generated':      donePages / totalPages,
  };

  let totalScore = 0;
  for (const [label, score] of Object.entries(scores)) {
    const p = Math.round(score * 100);
    console.log(`  ${bar(score)}  ${String(p).padStart(3)}%  ${label}`);
    totalScore += score;
  }

  const overall = Math.round((totalScore / Object.keys(scores).length) * 100);
  const ocol    = overall >= 80 ? G : overall >= 60 ? Y : R;
  console.log(`\n  ${W('Overall PSEO readiness:')} ${ocol(overall + '%')}`);

  console.log(B('\n── CONTENT PIPELINE STATUS ──'));
  console.log(`  Page types:      ${W(pageTypes.length)} types × ${masterBreeds.length} breeds`);
  console.log(`  Total potential: ${W(totalPages.toLocaleString())} pages`);
  console.log(`  Generated:       ${G(donePages.toLocaleString())} (${pct(donePages, totalPages)})`);
  console.log(`  Remaining:       ${Y((totalPages - donePages).toLocaleString())} pages to build`);

  // Priority breakdown
  if (clusterDefs) {
    console.log(B('\n── PRIORITY QUEUE ──'));
    const p1 = Object.entries(clusterDefs).filter(([,c]) => c.priority === 1);
    const p2 = Object.entries(clusterDefs).filter(([,c]) => c.priority === 2);
    const p3 = Object.entries(clusterDefs).filter(([,c]) => c.priority === 3);
    for (const [type, cfg] of p1) {
      const done = Object.values(contentStatus).filter(s => s[type]).length;
      console.log(`  ${G('P1')}  ${String(done).padStart(3)}/${masterBreeds.length}  ${type.padEnd(18)}  ${D(cfg.url_pattern)}`);
    }
    for (const [type, cfg] of p2) {
      const done = Object.values(contentStatus).filter(s => s[type]).length;
      console.log(`  ${Y('P2')}  ${String(done).padStart(3)}/${masterBreeds.length}  ${type.padEnd(18)}  ${D(cfg.url_pattern)}`);
    }
    for (const [type, cfg] of p3) {
      const done = Object.values(contentStatus).filter(s => s[type]).length;
      console.log(`  ${D('P3')}  ${String(done).padStart(3)}/${masterBreeds.length}  ${type.padEnd(18)}  ${D(cfg.url_pattern)}`);
    }
  }
}

// ── Next actions ───────────────────────────────────────────────
console.log(B('\n── RECOMMENDED NEXT ACTIONS ──'));
const actions = [];

if (!masterBreeds) {
  actions.push([R('CRITICAL'), 'master-breeds.json missing — copy from mds-data-architecture.zip → src/data/']);
}
if (masterBreeds && masterBreeds.filter(b => b.enrichment?.has_ranking_data).length === 0) {
  actions.push([Y('ACTION'),  'Copy dogs-ranking-dataset.csv → src/data/ then run: node scripts/enrich-breeds.mjs --step ranking']);
}
if (masterBreeds && masterBreeds.filter(b => b.enrichment?.has_country_data).length === 0) {
  actions.push([Y('ACTION'),  'Copy dog-breeds-by-country-2025.csv → src/data/ then run: node scripts/enrich-breeds.mjs --step country']);
}
if (products) {
  const needAsin = Object.values(products).flat().filter(p => p.needs_asin).length;
  if (needAsin > 0) {
    actions.push([Y('ACTION'), `${needAsin} products need real ASINs — run: node scripts/populate-product-images.mjs`]);
  }
}
if (actions.length === 0) {
  actions.push([G('READY'), 'All data files present — run: node generate-content.mjs --type food --top50']);
}

for (const [label, msg] of actions) {
  console.log(`  [${label}]  ${msg}`);
}

console.log('\n══════════════════════════════════════════════════════\n');
