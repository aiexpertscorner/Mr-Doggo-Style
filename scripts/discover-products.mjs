/**
 * discover-products.mjs
 * ─────────────────────────────────────────────────────────────
 * Analyses the products.json against breeds.json to identify:
 *  - Which breed × product combinations have no suitable product
 *  - Which size/life-stage combinations are under-served
 *  - Which high-volume keywords have no matching product
 *  - High-potential products worth adding next
 *
 * Usage:
 *   node scripts/discover-products.mjs              ← full report
 *   node scripts/discover-products.mjs --gaps       ← gaps only
 *   node scripts/discover-products.mjs --suggest    ← suggestions only
 *   node scripts/discover-products.mjs --cat food   ← one category
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.resolve(__dirname, '../src/data/products.json');
const BREEDS_PATH   = path.resolve(__dirname, '../src/data/breeds.json');

const GAPS_ONLY    = process.argv.includes('--gaps');
const SUGGEST_ONLY = process.argv.includes('--suggest');
const CAT_FILTER   = (() => {
  const idx = process.argv.indexOf('--cat');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// High-potential products to add (curated research)
const SUGGESTIONS = [
  // FOOD — high priority gaps
  { category: 'dog-food', priority: 'P1', name: 'The Farmer\'s Dog Fresh Food Subscription', brand: 'The Farmer\'s Dog', asin: 'N/A (subscription)', why: 'Recurring commission, AOV €80-140/mo, trending premium segment', search_volume: 4800, affiliate: 'Direct/CJ', commission: 'High % first order + recurring' },
  { category: 'dog-food', priority: 'P1', name: 'Ollie Fresh Dog Food', brand: 'Ollie', asin: 'N/A (subscription)', why: 'Premium fresh food, strong conversion on comparison posts', search_volume: 2200, affiliate: 'Impact.com', commission: 'Per first order' },
  { category: 'dog-food', priority: 'P2', name: 'Orijen Original Dog Food', brand: 'Orijen', asin: 'B07F8T6D51', why: 'Premium grain-free, fills high-end segment gap', search_volume: 1100, affiliate: 'Amazon + Chewy', commission: '4-15%' },
  { category: 'dog-food', priority: 'P2', name: 'Purina Pro Plan Small Breed Adult', brand: 'Purina', asin: 'B01JKEXFEY', why: 'Small breed segment unrepresented — 63 breeds in breeds.json', search_volume: 1400, affiliate: 'Amazon + Chewy', commission: '4-15%' },
  { category: 'dog-food', priority: 'P2', name: 'Stella & Chewy\'s Freeze-Dried Raw', brand: 'Stella & Chewy', asin: 'B00YXQIIJ0', why: 'Raw/freeze-dried category completely absent', search_volume: 1800, affiliate: 'Chewy affiliate', commission: '4-15%' },

  // HEALTH — highest commission per sale
  { category: 'health', priority: 'P1', name: 'Frontline Plus Flea & Tick', brand: 'Merial', asin: 'B004HMGXQ8', why: 'Most searched flea product — NexGard chewable gap', search_volume: 8900, affiliate: 'Amazon + Chewy', commission: '4-15%' },
  { category: 'health', priority: 'P1', name: 'Bravecto Chewables Flea & Tick', brand: 'MSD', asin: 'B01G3GCXFY', why: '3-month coverage — content angle: "best long-duration flea control"', search_volume: 6200, affiliate: 'Amazon', commission: '4%' },
  { category: 'health', priority: 'P2', name: 'Dermoscent Essential 6 Spot-On', brand: 'LDCA', asin: 'B00KPSCX5U', why: 'Skin/coat spot-on — fills "dry skin" problem post gap', search_volume: 890, affiliate: 'Amazon', commission: '4%' },

  // SERVICES — highest commission overall
  { category: 'services', priority: 'P1', name: 'Lemonade Pet Insurance', brand: 'Lemonade', asin: 'N/A (service)', why: 'Pet insurance = $15-30 per signup. "Best pet insurance" = 12K/mo searches', search_volume: 12000, affiliate: 'Impact.com', commission: '$15-30 per signup' },
  { category: 'services', priority: 'P1', name: 'Healthy Paws Pet Insurance', brand: 'Healthy Paws', asin: 'N/A (service)', why: '#1 consumer rated — comparison post with Lemonade = high AOV', search_volume: 8800, affiliate: 'Commission Junction', commission: '$15-25 per signup' },
  { category: 'services', priority: 'P1', name: 'Trupanion Pet Insurance', brand: 'Trupanion', asin: 'N/A (service)', why: 'Vet-recommended insurance — high trust factor content', search_volume: 4400, affiliate: 'CJ Affiliate', commission: 'Per qualified lead' },
  { category: 'services', priority: 'P2', name: 'Fuzzy Vet Telehealth', brand: 'Fuzzy', asin: 'N/A (service)', why: 'Telehealth vet visits — "ask a vet online" = 6K/mo searches', search_volume: 6000, affiliate: 'Direct', commission: 'Per signup' },
  { category: 'services', priority: 'P2', name: 'Rover Dog Walking', brand: 'Rover', asin: 'N/A (service)', why: 'Affiliate program — "dog walker near me" = 90K/mo searches', search_volume: 90000, affiliate: 'Rover affiliate', commission: 'Per booking' },

  // BEDS — gaps identified
  { category: 'beds', priority: 'P2', name: 'Molly Mutt Dog Duvet Cover', brand: 'Molly Mutt', asin: 'B004JZ94HC', why: 'Eco/sustainable bed angle — fill stuffed with old clothes', search_volume: 600, affiliate: 'ShareASale', commission: '10%' },
  { category: 'beds', priority: 'P2', name: 'Casper Dog Bed', brand: 'Casper', asin: 'B07P3J5QWZ', why: 'Premium brand recognition — "best luxury dog bed" search gap', search_volume: 1200, affiliate: 'Amazon', commission: '4%' },

  // TOYS — gaps identified
  { category: 'toys', priority: 'P2', name: 'iFetch Interactive Ball Launcher', brand: 'iFetch', asin: 'B00BMGCALC', why: 'Automatic fetch machine — unique product angle, high dwell time', search_volume: 2800, affiliate: 'Amazon', commission: '4%' },
  { category: 'toys', priority: 'P2', name: 'Snuffle Mat for Dogs', brand: 'Various', asin: 'B07RRQ3TDG', why: 'Trending enrichment toy — "snuffle mat" = 6K/mo searches', search_volume: 6000, affiliate: 'Amazon + Chewy', commission: '4-15%' },
  { category: 'toys', priority: 'P3', name: 'KONG Puppy Toy', brand: 'KONG', asin: 'B000Y7QUPK', why: 'Puppy segment currently unrepresented in toys', search_volume: 3200, affiliate: 'Amazon + Chewy', commission: '4-15%' },

  // TRAVEL — gaps
  { category: 'travel', priority: 'P2', name: 'Sleepypod Air Carrier', brand: 'Sleepypod', asin: 'B001UBQ2Q4', why: 'Premium airline carrier — crash tested, $160+ AOV', search_volume: 900, affiliate: 'Amazon', commission: '4%' },
  { category: 'travel', priority: 'P2', name: 'BarksBar Dog Car Seat Cover', brand: 'BarksBar', asin: 'B01AOPIXGU', why: 'High-volume search term — more affordable Kurgo alternative', search_volume: 4200, affiliate: 'Amazon', commission: '4%' },
];

// ── Analysis functions ────────────────────────────────────────

function analyzeGaps(products, breeds) {
  const gaps = [];

  // Build lookup: what breed sizes and life stages do we have products for?
  const coverage = {};
  for (const [cat, items] of Object.entries(products)) {
    coverage[cat] = {
      sizes:      new Set(items.flatMap(p => p.breed_size_fit || [])),
      lifeStages: new Set(items.flatMap(p => p.life_stage || [])),
      count:      items.length
    };
  }

  // Check each breed against product coverage
  const breedSizeCounts = { small: 0, medium: 0, large: 0, giant: 0 };
  const breedLifeStageCounts = { puppy: 0, adult: 0, senior: 0 };
  let totalBreeds = 0;

  for (const breed of breeds) {
    totalBreeds++;
    const size = breed.size_category?.toLowerCase();
    if (size && breedSizeCounts.hasOwnProperty(size)) breedSizeCounts[size]++;
  }

  // Find category + size combinations with no products
  const CATS_TO_CHECK = ['dog-food', 'toys', 'beds', 'supplements', 'grooming', 'training', 'health', 'travel'];
  const SIZES = ['small', 'medium', 'large', 'giant'];
  const STAGES = ['puppy', 'adult', 'senior'];

  for (const cat of CATS_TO_CHECK) {
    if (CAT_FILTER && cat !== CAT_FILTER) continue;
    const cov = coverage[cat] || { sizes: new Set(), lifeStages: new Set(), count: 0 };

    for (const size of SIZES) {
      if (!cov.sizes.has(size)) {
        gaps.push({
          type: 'size-gap',
          category: cat,
          size,
          impact: breedSizeCounts[size] || 0,
          msg: `No ${size} breed products in ${cat}`
        });
      }
    }

    for (const stage of STAGES) {
      if (!cov.lifeStages.has(stage)) {
        gaps.push({
          type: 'life-stage-gap',
          category: cat,
          lifeStage: stage,
          impact: stage === 'puppy' ? 30 : stage === 'senior' ? 40 : 100,
          msg: `No ${stage} products in ${cat}`
        });
      }
    }

    if (cov.count < 3) {
      gaps.push({
        type: 'thin-category',
        category: cat,
        count: cov.count,
        impact: 100,
        msg: `Only ${cov.count} products in ${cat} — too thin for proper review posts`
      });
    }
  }

  return { gaps, breedSizeCounts, totalBreeds, coverage };
}

// ── Main ──────────────────────────────────────────────────────
async function run() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  let breeds = [];
  if (fs.existsSync(BREEDS_PATH)) {
    breeds = JSON.parse(fs.readFileSync(BREEDS_PATH, 'utf8'));
  }

  const Y = s => `\x1b[33m${s}\x1b[0m`;
  const G = s => `\x1b[32m${s}\x1b[0m`;
  const R = s => `\x1b[31m${s}\x1b[0m`;
  const B = s => `\x1b[34m${s}\x1b[0m`;
  const W = s => `\x1b[1m${s}\x1b[0m`;

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🔬  Product Discovery & Gap Analysis');
  console.log('══════════════════════════════════════════════════════\n');

  // Current inventory
  if (!GAPS_ONLY && !SUGGEST_ONLY) {
    console.log(B('── CURRENT INVENTORY ──'));
    let totalProducts = 0;
    for (const [cat, items] of Object.entries(products)) {
      if (CAT_FILTER && cat !== CAT_FILTER) continue;
      totalProducts += items.length;
      const withScore   = items.filter(p => p.score).length;
      const withVerdicts = items.filter(p => p.verdict).length;
      const allImages   = items.every(p => p.image);
      console.log(`  ${allImages ? G('✓') : Y('⚠')}  ${cat.padEnd(15)} ${String(items.length).padStart(3)} products  ${withScore}/${items.length} scored  ${allImages ? G('all images') : Y('missing images')}`);
    }
    console.log(`\n     Total: ${W(totalProducts)} products\n`);
  }

  // Gap analysis
  if (!SUGGEST_ONLY) {
    const { gaps, breedSizeCounts, totalBreeds, coverage } = analyzeGaps(products, breeds);

    console.log(B('── GAP ANALYSIS ──'));
    if (breeds.length > 0) {
      console.log(`  Breed database: ${totalBreeds} breeds`);
      console.log(`  Size distribution: small=${breedSizeCounts.small} medium=${breedSizeCounts.medium} large=${breedSizeCounts.large} giant=${breedSizeCounts.giant}`);
    }

    if (gaps.length === 0) {
      console.log(G('  ✓ No major gaps found'));
    } else {
      const sorted = gaps.sort((a, b) => (b.impact || 0) - (a.impact || 0));
      sorted.forEach(g => {
        const icon = g.impact >= 50 ? R('✗') : Y('⚠');
        console.log(`  ${icon}  [${g.category}] ${g.msg} (impact: ${g.impact} breeds)`);
      });
    }
    console.log();
  }

  // Suggestions
  if (!GAPS_ONLY) {
    console.log(B('── HIGH-PRIORITY PRODUCT ADDITIONS ──'));

    const filtered = SUGGESTIONS.filter(s => !CAT_FILTER || s.category === CAT_FILTER);
    const p1 = filtered.filter(s => s.priority === 'P1');
    const p2 = filtered.filter(s => s.priority === 'P2');
    const p3 = filtered.filter(s => s.priority === 'P3');

    const printGroup = (label, items) => {
      if (items.length === 0) return;
      console.log(`\n  ${W(label)}:`);
      items.forEach(s => {
        console.log(`  ┌─ ${W(s.name)}`);
        console.log(`  │  Category: ${s.category}  |  Brand: ${s.brand}`);
        console.log(`  │  ASIN: ${s.asin}`);
        console.log(`  │  Search vol: ~${s.search_volume.toLocaleString()}/mo`);
        console.log(`  │  Affiliate: ${s.affiliate}  |  Commission: ${s.commission}`);
        console.log(`  └─ Why: ${s.why}\n`);
      });
    };

    printGroup('🔴 P1 — Add immediately', p1);
    printGroup('🟡 P2 — Add this month', p2);
    if (p3.length > 0) printGroup('⚪ P3 — Add when ready', p3);
  }

  // SEO keyword gaps
  if (!GAPS_ONLY) {
    console.log(B('── SEO KEYWORD GAPS (no matching product) ──'));
    const KEYWORD_GAPS = [
      { kw: 'fresh dog food delivery',          vol: 8200,  cat: 'dog-food',  status: 'MISSING' },
      { kw: 'best pet insurance for dogs',      vol: 12000, cat: 'services',  status: 'MISSING' },
      { kw: 'dog dna test',                     vol: 8800,  cat: 'health',    status: '✓ Covered' },
      { kw: 'snuffle mat for dogs',             vol: 6000,  cat: 'toys',      status: 'MISSING' },
      { kw: 'dog car seat',                     vol: 5600,  cat: 'travel',    status: 'PARTIAL' },
      { kw: 'best calming dog bed',             vol: 3200,  cat: 'beds',      status: '✓ Covered' },
      { kw: 'automatic dog ball launcher',      vol: 2800,  cat: 'toys',      status: 'MISSING' },
      { kw: 'raw dog food',                     vol: 4400,  cat: 'dog-food',  status: 'MISSING' },
      { kw: 'dog cooling mat',                  vol: 2100,  cat: 'beds',      status: 'MISSING' },
      { kw: 'puppy food large breed',           vol: 1900,  cat: 'dog-food',  status: '✓ Covered' },
      { kw: 'best dog carrier for flights',     vol: 2800,  cat: 'travel',    status: 'PARTIAL' },
      { kw: 'online vet consultation dog',      vol: 6000,  cat: 'services',  status: 'MISSING' },
    ];

    const missing  = KEYWORD_GAPS.filter(k => k.status === 'MISSING');
    const partial  = KEYWORD_GAPS.filter(k => k.status === 'PARTIAL');
    const covered  = KEYWORD_GAPS.filter(k => k.status.startsWith('✓'));

    missing.concat(partial).forEach(k => {
      const icon = k.status === 'MISSING' ? R('✗ MISSING') : Y('⚠ PARTIAL');
      console.log(`  ${icon}  ${k.kw.padEnd(38)} ~${k.vol.toLocaleString()}/mo  [${k.cat}]`);
    });
    covered.forEach(k => {
      console.log(`  ${G('✓ Covered')}  ${k.kw.padEnd(38)} ~${k.vol.toLocaleString()}/mo`);
    });
  }

  // Save suggestions as JSON
  const outputPath = path.resolve(__dirname, '../discovery-report.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    suggestions: SUGGESTIONS,
    totalCurrent: Object.values(products).reduce((a, b) => a + b.length, 0),
    totalTarget: Object.values(products).reduce((a, b) => a + b.length, 0) + SUGGESTIONS.length,
  }, null, 2));

  console.log('\n  💾  Report saved to discovery-report.json');
  console.log('══════════════════════════════════════════════════════\n');
}

run().catch(console.error);
