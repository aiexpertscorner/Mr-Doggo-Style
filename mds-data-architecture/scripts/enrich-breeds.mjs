/**
 * enrich-breeds.mjs
 * ─────────────────────────────────────────────────────────────
 * Enrichment pipeline for master-breeds.json.
 *
 * Run sequentially or pick a specific step:
 *   node scripts/enrich-breeds.mjs                  ← all steps
 *   node scripts/enrich-breeds.mjs --step ranking   ← ranking data only
 *   node scripts/enrich-breeds.mjs --step country   ← country origin only
 *   node scripts/enrich-breeds.mjs --step products  ← re-run product matching
 *   node scripts/enrich-breeds.mjs --step names     ← re-run name styles
 *   node scripts/enrich-breeds.mjs --step seo       ← regenerate SEO fields
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT        = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA        = path.join(ROOT, 'src', 'data');
const MASTER_PATH = path.join(DATA, 'master-breeds.json');
const PROD_PATH   = path.join(DATA, 'products.json');

const STEP = (() => {
  const idx = process.argv.indexOf('--step');
  return idx !== -1 ? process.argv[idx + 1] : 'all';
})();

const G = s => `\x1b[32m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

// ── Load data ──────────────────────────────────────────────────
const breeds   = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
const products = JSON.parse(fs.readFileSync(PROD_PATH,  'utf8'));

const breedBySlug = Object.fromEntries(breeds.map(b => [b.slug, b]));

// ── Helpers ────────────────────────────────────────────────────
const ENERGY_MAP = {
  'Needs Lots of Activity': 'active',
  'Energetic':              'active',
  'Regular Exercise':       'regular',
  'Calm':                   'calm',
  'Couch Potato':           'calm',
};

const SHEDDING_MAP = {
  'Frequent':     'heavy',
  'Regularly':    'heavy',
  'Seasonal':     'seasonal',
  'Occasional':   'low',
  'Occasionally': 'low',
  'Infrequent':   'minimal',
};

function matchProducts(breed) {
  const size     = breed.size_category;
  const energy   = breed.energy_level;
  const coat     = breed.coat_type;
  const lifeMax  = breed.life_expectancy?.max ?? 15;
  const shedding = breed.shedding_level;

  const healthSignals = [];
  if (lifeMax <= 10)                        healthSignals.push('joint');
  if (['heavy','seasonal'].includes(shedding)) healthSignals.push('coat');
  if (energy === 'active')                  healthSignals.push('joint');

  const matched: Record<string, string> = {};
  for (const [cat, items] of Object.entries(products) as [string, any[]][]) {
    const scored: [number, any][] = [];
    for (const p of items) {
      let score = 0;
      const psizes  = p.breed_size_fit   ?? [];
      const penergy = p.energy_level_fit ?? [];
      const phealth = p.health_focus     ?? [];
      const pcoat   = p.coat_type_fit    ?? [];

      if (psizes.includes(size))   score += 4;
      else if (psizes.includes('medium')) score += 1;
      if (penergy.includes(energy)) score += 3;
      else if (penergy.length)      score += 1;
      for (const h of healthSignals) if (phealth.includes(h)) score += 2;
      if (cat === 'grooming' && pcoat.includes(coat)) score += 3;

      if (score > 0) scored.push([score, p]);
    }
    if (scored.length) {
      scored.sort((a, b) => b[0] - a[0]);
      matched[cat] = scored[0][1].id;
    }
  }
  return matched;
}

// ── Step: re-run product matching ─────────────────────────────
function stepProducts() {
  console.log(B('── Refreshing product picks ──'));
  let updated = 0;
  for (const breed of breeds) {
    const newPicks = matchProducts(breed);
    breed.product_picks = newPicks;
    updated++;
  }
  console.log(`  ${G('✓')}  Updated ${updated} breeds`);
}

// ── Step: load ranking CSV data ───────────────────────────────
function stepRanking() {
  console.log(B('── Loading ranking dataset ──'));
  const rankPath = path.join(DATA, 'dogs-ranking-dataset.csv');
  if (!fs.existsSync(rankPath)) {
    console.log(`  ${Y('⚠')}  dogs-ranking-dataset.csv not found in src/data/`);
    console.log(`      Copy it from your uploads and run: node scripts/enrich-breeds.mjs --step ranking`);
    return;
  }

  const lines = fs.readFileSync(rankPath, 'utf8').split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
  let matched = 0, missing = 0;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const row  = Object.fromEntries(headers.map((h, i) => [h, cols[i]?.trim()]));
    // Try to match by breed name
    const slug = row.breed?.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    if (!slug) continue;
    const breed = breedBySlug[slug];
    if (!breed) { missing++; continue; }

    breed.ranking_data = {
      intelligence_rank:    parseInt(row.intelligence_rank)   || null,
      lifetime_cost_usd:    parseInt(row.lifetime_cost_usd)   || null,
      annual_cost_usd:      parseInt(row.annual_cost_usd)     || null,
      purchase_price_usd:   parseInt(row.purchase_price_usd)  || null,
      genetic_ailments:     parseInt(row.genetic_ailments)    || null,
      children_score:       parseFloat(row.children_score)    || null,
    };
    breed.enrichment.has_ranking_data = true;
    matched++;
  }
  console.log(`  ${G('✓')}  Matched ${matched} breeds | ${missing} unmatched`);
}

// ── Step: load country origin CSV ─────────────────────────────
function stepCountry() {
  console.log(B('── Loading country origin data ──'));
  const countryPath = path.join(DATA, 'dog-breeds-by-country-2025.csv');
  if (!fs.existsSync(countryPath)) {
    console.log(`  ${Y('⚠')}  dog-breeds-by-country-2025.csv not found in src/data/`);
    console.log(`      Copy it from your uploads and run: node scripts/enrich-breeds.mjs --step country`);
    return;
  }

  const lines   = fs.readFileSync(countryPath, 'utf8').split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  let matched = 0;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const row  = Object.fromEntries(headers.map((h, i) => [h, cols[i]?.trim()]));
    const slug = row.breed?.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    if (!slug) continue;
    const breed = breedBySlug[slug];
    if (!breed) continue;

    breed.origin_country = row.country || row.origin_country || null;
    breed.origin_region  = row.region || null;
    breed.enrichment.has_country_data = true;
    matched++;
  }
  console.log(`  ${G('✓')}  Matched ${matched} breeds with country data`);
}

// ── Step: regenerate SEO fields ────────────────────────────────
function stepSeo() {
  console.log(B('── Regenerating SEO metadata ──'));
  for (const breed of breeds) {
    const n  = breed.name;
    const sz = breed.size_category;
    breed.seo = {
      title:       `Best Products for ${n}s 2026 — Size-Matched Expert Picks`,
      description: `Complete ${n} care guide: best food, toys, beds and grooming for ${sz} ${breed.energy_level} breeds. Updated March 2026 with vet-guided recommendations.`,
      og_title:    `${n} Care Guide 2026 — Best Products & Expert Tips`,
      keywords:    [
        `best dog food for ${n.toLowerCase()}`,
        `best toys for ${n.toLowerCase()}`,
        `${n.toLowerCase()} care guide`,
        `${n.toLowerCase()} products`,
      ],
    };
  }
  console.log(`  ${G('✓')}  Updated SEO for all ${breeds.length} breeds`);
}

// ── Run steps ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  🔬  Breed Enrichment Pipeline');
console.log(`  Step: ${STEP}`);
console.log('══════════════════════════════════════════════════════\n');

if (STEP === 'all' || STEP === 'products') stepProducts();
if (STEP === 'all' || STEP === 'ranking')  stepRanking();
if (STEP === 'all' || STEP === 'country')  stepCountry();
if (STEP === 'all' || STEP === 'seo')      stepSeo();

// Save
fs.writeFileSync(MASTER_PATH, JSON.stringify(breeds, null, 2));
console.log(`\n  ${G('✓')}  Saved master-breeds.json`);
console.log('══════════════════════════════════════════════════════\n');
