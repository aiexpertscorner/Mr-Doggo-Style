/**
 * enrich-products.mjs
 * ─────────────────────────────────────────────────────────────
 * Enriches existing products.json entries with missing fields:
 *  - breed_size_fit (inferred from name/features/category)
 *  - life_stage     (inferred from name/tags)
 *  - coat_type_fit  (inferred for grooming products)
 *  - subcategory    (inferred from category + features)
 *  - search_volume  (curated lookup table)
 *  - price_updated  (sets today if missing)
 *  - active         (defaults to true if missing)
 *
 * Does NOT overwrite fields that already have values.
 *
 * Usage:
 *   node scripts/enrich-products.mjs            ← dry run (preview)
 *   node scripts/enrich-products.mjs --write    ← apply changes
 *   node scripts/enrich-products.mjs --cat beds ← one category only
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname     = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH     = path.resolve(__dirname, '../src/data/products.json');
const WRITE         = process.argv.includes('--write');
const CAT_FILTER    = (() => {
  const idx = process.argv.indexOf('--cat');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const TODAY         = new Date().toISOString().split('T')[0];

// ── Inference rules ───────────────────────────────────────────

function inferBreedSizeFit(product) {
  const text = `${product.name} ${(product.features || []).join(' ')} ${(product.tags || []).join(' ')}`.toLowerCase();

  if (text.includes('giant') || text.includes('extra large') || text.includes('xxl')) {
    return ['large', 'giant'];
  }
  if (text.includes('large breed') || text.includes('large dog')) {
    return ['large', 'giant'];
  }
  if (text.includes('small breed') || text.includes('small dog') || text.includes('toy breed')) {
    return ['small'];
  }
  if (text.includes('medium breed') || text.includes('medium dog')) {
    return ['medium', 'large'];
  }
  if (text.includes('all size') || text.includes('all breed') || text.includes('any size')) {
    return ['small', 'medium', 'large', 'giant'];
  }
  if (text.includes('puppy') && !text.includes('large')) {
    return ['small', 'medium'];
  }

  // Category defaults
  const catDefaults = {
    'dog-food':    ['large', 'giant'],   // original products were large-breed focused
    'toys':        ['small', 'medium', 'large'],
    'beds':        ['medium', 'large'],
    'training':    ['small', 'medium', 'large'],
    'grooming':    ['small', 'medium', 'large'],
    'supplements': ['small', 'medium', 'large', 'giant'],
    'health':      ['small', 'medium', 'large', 'giant'],
    'travel':      ['small', 'medium'],
  };
  return catDefaults[product.category] || ['small', 'medium', 'large'];
}

function inferLifeStage(product) {
  const text = `${product.name} ${(product.tags || []).join(' ')} ${product.subcategory || ''}`.toLowerCase();

  if (text.includes('puppy') || text.includes('junior')) return ['puppy'];
  if (text.includes('senior') || text.includes('geriatric') || text.includes('aging')) return ['senior'];
  if (text.includes('adult') && !text.includes('puppy') && !text.includes('senior')) return ['adult'];
  if (text.includes('all age') || text.includes('all life')) return ['puppy', 'adult', 'senior'];

  // Default to adult for most products
  return ['adult'];
}

function inferCoatTypeFit(product) {
  if (product.category !== 'grooming') return null;
  const text = `${product.name} ${(product.features || []).join(' ')}`.toLowerCase();

  if (text.includes('deshed') || text.includes('undercoat')) return ['double-coat', 'heavy-shed'];
  if (text.includes('detangle') || text.includes('mat') || text.includes('long')) return ['long-coat', 'double-coat'];
  if (text.includes('slicker')) return ['short-coat', 'medium-coat', 'long-coat'];
  if (text.includes('curly') || text.includes('poodle')) return ['curly-coat', 'wavy-coat'];
  if (text.includes('short') || text.includes('smooth')) return ['short-coat'];
  return null; // can't infer — leave empty
}

function inferSubcategory(product) {
  const text = `${product.name} ${(product.tags || []).join(' ')}`.toLowerCase();

  const subcatMap = {
    'dog-food': [
      { keywords: ['fresh', 'delivery', 'subscription', 'farm'], sub: 'fresh-food' },
      { keywords: ['raw', 'freeze-dried', 'frozen'], sub: 'raw-food' },
      { keywords: ['wet', 'canned', 'pate'], sub: 'wet-food' },
      { keywords: ['grain-free'], sub: 'grain-free' },
      { keywords: ['puppy'], sub: 'puppy-food' },
      { keywords: ['senior'], sub: 'senior-food' },
      { keywords: ['sensitive', 'digestive', 'stomach'], sub: 'sensitive-food' },
      { keywords: ['weight', 'diet', 'metabolic'], sub: 'weight-management' },
    ],
    'toys': [
      { keywords: ['puzzle', 'enrichment', 'mental'], sub: 'puzzle-toys' },
      { keywords: ['fetch', 'ball', 'flying', 'frisbee'], sub: 'fetch-toys' },
      { keywords: ['tug', 'rope', 'flossy'], sub: 'tug-toys' },
      { keywords: ['plush', 'squirrel', 'squeaky'], sub: 'plush-toys' },
      { keywords: ['chew', 'bone', 'nylabone', 'benebone', 'kong', 'goughnuts'], sub: 'chew-toys' },
      { keywords: ['lick', 'snuffle', 'slow feeder'], sub: 'enrichment-toys' },
    ],
    'beds': [
      { keywords: ['ortho', 'foam', 'joint', 'barker'], sub: 'orthopedic' },
      { keywords: ['elevat', 'raised', 'coolaroo'], sub: 'elevated' },
      { keywords: ['cool', 'mesh', 'summer'], sub: 'cooling' },
      { keywords: ['heat', 'warm', 'self-warm'], sub: 'heated' },
      { keywords: ['donut', 'calming', 'cave', 'curl'], sub: 'calming' },
      { keywords: ['crate', 'kennel', 'pad', 'mat'], sub: 'crate-mats' },
    ],
    'health': [
      { keywords: ['dna', 'genetic', 'embark', 'wisdom'], sub: 'dna-tests' },
      { keywords: ['flea', 'tick', 'parasite', 'frontline', 'nexgard', 'seresto'], sub: 'parasite-prevention' },
      { keywords: ['dental', 'tooth', 'teeth', 'greenies', 'oral'], sub: 'dental-care' },
      { keywords: ['ear', 'zymox'], sub: 'ear-care' },
      { keywords: ['wound', 'skin', 'vetericyn'], sub: 'wound-care' },
      { keywords: ['eye', 'vision'], sub: 'eye-care' },
    ],
    'training': [
      { keywords: ['gps', 'tracker', 'fi ', 'whistle', 'location'], sub: 'gps-trackers' },
      { keywords: ['harness', 'no-pull', 'front-clip'], sub: 'harnesses' },
      { keywords: ['leash', 'lead', 'bungee', 'retract'], sub: 'leashes' },
      { keywords: ['collar', 'martingale'], sub: 'collars' },
      { keywords: ['head collar', 'halti', 'gentle leader'], sub: 'training-aids' },
      { keywords: ['treat', 'clicker', 'whistle'], sub: 'training-aids' },
    ],
    'grooming': [
      { keywords: ['deshed', 'furminator', 'undercoat'], sub: 'deshedding' },
      { keywords: ['brush', 'slicker', 'pin'], sub: 'combs-brushes' },
      { keywords: ['comb', 'detangl', 'mat'], sub: 'combs-brushes' },
      { keywords: ['nail', 'trimmer', 'grinder', 'clipper'], sub: 'nail-care' },
      { keywords: ['shampoo', 'conditioner', 'wash', 'bath'], sub: 'shampoos' },
      { keywords: ['clipper', 'groomer', 'electric'], sub: 'clippers' },
      { keywords: ['wipe', 'spray', 'deodor'], sub: 'wipes-sprays' },
    ],
    'supplements': [
      { keywords: ['joint', 'hip', 'glucosamine', 'cosequin'], sub: 'joint' },
      { keywords: ['probiotic', 'digestive', 'gut', 'fortiflora'], sub: 'probiotic' },
      { keywords: ['omega', 'fish oil', 'salmon'], sub: 'omega-3' },
      { keywords: ['calming', 'anxiety', 'composure', 'stress', 'relax'], sub: 'calming' },
      { keywords: ['vitamin', 'multivit', 'immune', 'general'], sub: 'multivitamin' },
    ],
    'travel': [
      { keywords: ['carrier', 'bag', 'airline'], sub: 'carriers' },
      { keywords: ['car seat', 'seat cover', 'hammock'], sub: 'car-accessories' },
      { keywords: ['bowl', 'collapsible', 'portable'], sub: 'travel-bowls' },
      { keywords: ['crate', 'kennel', 'cage'], sub: 'crates' },
      { keywords: ['harness', 'restraint', 'crash', 'seat belt'], sub: 'car-safety' },
    ],
  };

  const rules = subcatMap[product.category] || [];
  for (const rule of rules) {
    if (rule.keywords.some(k => text.includes(k))) return rule.sub;
  }
  return null;
}

// Search volume lookup table (curated)
const SEARCH_VOLUMES = {
  'kong-extreme':             2200,
  'chuckit-ultra-ball':       4500,
  'furminator-deshedding':    7200,
  'hertzko-slicker-brush':    4800,
  'big-barker-orthopedic':    1200,
  'ruffwear-front-range':     3200,
  'rabbitgoo-no-pull-harness':5600,
  'nutramax-cosequin':        3400,
  'zesty-paws-salmon-oil':    3800,
  'fortiflora-probiotic':     2600,
  'seresto-flea-collar':      12000,
  'embark-dna-test':          8800,
  'wisdom-panel-essential':   6200,
  'greenies-dental-treats':   6700,
  'best-friends-donut-bed':   3200,
};

// ── Main ──────────────────────────────────────────────────────
async function run() {
  const data    = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  let enriched  = 0;
  let unchanged = 0;
  const changes = [];

  const G = s => `\x1b[32m${s}\x1b[0m`;
  const Y = s => `\x1b[33m${s}\x1b[0m`;
  const B = s => `\x1b[34m${s}\x1b[0m`;

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  🔧  Product Enricher — ${WRITE ? 'WRITE MODE' : 'DRY RUN'}`);
  if (!WRITE) console.log('  Run with --write to apply changes');
  console.log('══════════════════════════════════════════════════════\n');

  for (const [cat, products] of Object.entries(data)) {
    if (CAT_FILTER && cat !== CAT_FILTER) continue;
    console.log(B(`── ${cat.toUpperCase()} ──`));

    for (const p of products) {
      const productChanges = [];

      // 1. price_updated — set today if missing
      if (!p.price_updated) {
        productChanges.push({ field: 'price_updated', from: undefined, to: TODAY });
        if (WRITE) p.price_updated = TODAY;
      }

      // 2. active — default true
      if (p.active === undefined) {
        productChanges.push({ field: 'active', from: undefined, to: true });
        if (WRITE) p.active = true;
      }

      // 3. breed_size_fit — infer if missing
      if (!p.breed_size_fit || p.breed_size_fit.length === 0) {
        const inferred = inferBreedSizeFit(p);
        productChanges.push({ field: 'breed_size_fit', from: p.breed_size_fit, to: inferred });
        if (WRITE) p.breed_size_fit = inferred;
      }

      // 4. life_stage — infer if missing
      if (!p.life_stage || p.life_stage.length === 0) {
        const inferred = inferLifeStage(p);
        productChanges.push({ field: 'life_stage', from: p.life_stage, to: inferred });
        if (WRITE) p.life_stage = inferred;
      }

      // 5. coat_type_fit — infer for grooming
      if (cat === 'grooming' && p.coat_type_fit === undefined) {
        const inferred = inferCoatTypeFit(p);
        if (inferred) {
          productChanges.push({ field: 'coat_type_fit', from: undefined, to: inferred });
          if (WRITE) p.coat_type_fit = inferred;
        }
      }

      // 6. subcategory — infer if missing
      if (!p.subcategory) {
        const inferred = inferSubcategory(p);
        if (inferred) {
          productChanges.push({ field: 'subcategory', from: undefined, to: inferred });
          if (WRITE) p.subcategory = inferred;
        }
      }

      // 7. search_volume — lookup table
      if (!p.search_volume && SEARCH_VOLUMES[p.id]) {
        productChanges.push({ field: 'search_volume', from: undefined, to: SEARCH_VOLUMES[p.id] });
        if (WRITE) p.search_volume = SEARCH_VOLUMES[p.id];
      }

      // 8. brand — infer from name if missing
      if (!p.brand) {
        const brandMap = {
          'purina': 'Purina', 'kong': 'KONG', 'furminator': 'FURminator',
          'ruffwear': 'Ruffwear', 'chuckit': 'Chuckit', 'zesty paws': 'Zesty Paws',
          'nutramax': 'Nutramax', 'burt': "Burt's Bees", 'hill': "Hill's",
          'royal canin': 'Royal Canin', 'blue buffalo': 'Blue Buffalo',
          'west paw': 'West Paw', 'benebone': 'Benebone', 'nylabone': 'Nylabone',
          'big barker': 'Big Barker', 'coolaroo': 'Coolaroo', 'k&h': 'K&H',
          'safari': 'Safari', 'wahl': 'Wahl', 'andis': 'Andis',
          'flexi': 'Flexi', 'lupine': 'Lupine', 'petsafe': 'PetSafe',
          'whistle': 'Whistle', 'embark': 'Embark', 'wisdom panel': 'Wisdom Panel',
          'seresto': 'Elanco', 'nexgard': 'Boehringer Ingelheim',
          'greenies': 'Mars Petcare', 'fortiflora': 'Purina',
          'vetri': 'VetriScience', 'grizzly': 'Grizzly', 'zymox': 'Zymox',
        };
        const nameLower = p.name.toLowerCase();
        const found = Object.entries(brandMap).find(([k]) => nameLower.includes(k));
        if (found) {
          productChanges.push({ field: 'brand', from: undefined, to: found[1] });
          if (WRITE) p.brand = found[1];
        }
      }

      if (productChanges.length > 0) {
        enriched++;
        changes.push({ product: p.id || p.asin, cat, changes: productChanges });
        const summary = productChanges.map(c => c.field).join(', ');
        console.log(`  ${G('+')}  ${(p.name).substring(0, 42).padEnd(42)}  → ${Y(summary)}`);
      } else {
        unchanged++;
        console.log(`  ·  ${(p.name).substring(0, 42).padEnd(42)}  ${G('already complete')}`);
      }
    }
  }

  // Save enriched data
  if (WRITE) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`\n  💾  Saved changes to products.json`);
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Products enriched: ${G(enriched)}`);
  console.log(`  Already complete:  ${unchanged}`);
  if (!WRITE && enriched > 0) {
    console.log(`\n  ${Y('Run with --write to apply these changes')}`);
  }
  console.log('══════════════════════════════════════════════════════\n');
}

run().catch(console.error);
