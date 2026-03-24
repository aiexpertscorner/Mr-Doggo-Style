/**
 * import-brand-logos.mjs
 * ─────────────────────────────────────────────────────────────
 * Copies brand logos from your logos folder to public/images/brands/
 * Renames files to brand slugs so they match brands.json
 * Updates brands.json with verified logo_url fields
 *
 * Usage:
 *   node scripts/import-brand-logos.mjs --source "C:\Users\YourName\Downloads\Logos"
 *   node scripts/import-brand-logos.mjs --source "E:\Logos"
 *   node scripts/import-brand-logos.mjs --dry --source "E:\Logos"   (preview only)
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT       = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR    = path.join(ROOT, 'public', 'images', 'brands');
const BRANDS_PATH= path.join(ROOT, 'src', 'data', 'brands.json');
const PRODS_PATH = path.join(ROOT, 'src', 'data', 'products.json');

const args     = process.argv.slice(2);
const DRY      = args.includes('--dry');
const FORCE    = args.includes('--force');
const srcIdx   = args.indexOf('--source');
const SRC_DIR  = srcIdx !== -1 ? args[srcIdx + 1] : null;

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;
const B = s => `\x1b[1m${s}\x1b[0m`;

if (!SRC_DIR) {
  console.error(R('\n✗ Please provide --source path to your logos folder'));
  console.error('  Example: node scripts/import-brand-logos.mjs --source "C:\\Users\\You\\Downloads\\Logos"\n');
  process.exit(1);
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(R(`\n✗ Source folder not found: ${SRC_DIR}\n`));
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Filename → brand slug mapping ────────────────────────────
// Maps logo filename prefix (without extension) to the brand slug used in brands.json
// Add more entries here as you get more logos
const LOGO_TO_SLUG = {
  // From your current logo folder
  '1st-Choice-Logo':          '1st-choice',
  '1st-choice-logo':          '1st-choice',
  'Alleva-Logo':              'alleva',
  'alleva-logo':              'alleva',
  'Barking-Heads-Logo':       'barking-heads',
  'barking-heads-logo':       'barking-heads',
  'Blue-Buffalo-logo':        'blue-buffalo',
  'blue-buffalo-logo':        'blue-buffalo',
  'Brit-Logo':                'brit',
  'brit-logo':                'brit',
  'Canagan-Logo':             'canagan',
  'canagan-logo':             'canagan',
  'Dukes-Farm-Logo':          'dukes-farm',
  'dukes-farm-logo':          'dukes-farm',
  'Eukanuba-Logo':            'eukanuba',
  'eukanuba-logo':            'eukanuba',
  'Fancy-Feast-Logo':         'fancy-feast',
  'fancy-feast-logo':         'fancy-feast',
  'Farmina-Logo':             'farmina',
  'farmina-logo':             'farmina',
  'Friskies-Logo':            'friskies',
  'friskies-logo':            'friskies',
  'Go-solutions-logo':        'go-solutions',
  'go-solutions-logo':        'go-solutions',
  'Grandorf-Logo':            'grandorf',
  'grandorf-logo':            'grandorf',
  'Greenies-Logo':            'greenies',
  'greenies-logo':            'greenies',
  'Hills-Logo':               'hills-science-diet',
  'hills-logo':               'hills-science-diet',
  'Hills-Science-Diet-Logo':  'hills-science-diet',
  'Kennels-Favourite-Logo':   'kennels-favourite',
  'kennels-favourite-logo':   'kennels-favourite',
  'Nutri-Paw-Logo':           'nutri-paw',
  'nutri-paw-logo':           'nutri-paw',
  'Orijen-Logo':              'orijen',
  'orijen-logo':              'orijen',
  'Orkin-logo':               'orkin',
  'orkin-logo':               'orkin',
  'Pedigree-logo':            'pedigree',
  'pedigree-logo':            'pedigree',
  'Pedigree-Logo':            'pedigree',
  'Petco-Logo':               'petco',
  'petco-logo':               'petco',
  'Primordial-Logo':          'primordial',
  'primordial-logo':          'primordial',
  'Profine-Logo':             'profine',
  'profine-logo':             'profine',
  'Purina-Logo':              'purina-pro-plan',
  'purina-logo':              'purina-pro-plan',
  'Purina-Pro-Plan-Logo':     'purina-pro-plan',
  'Rachael-Ray-Nutrish-Logo': 'rachael-ray',
  'rachael-ray-nutrish-logo': 'rachael-ray',
  'Royal-Canin-Logo':         'royal-canin',
  'royal-canin-logo':         'royal-canin',
  'San-Diego-Zoo-Logo':       'san-diego-zoo',
  'san-diego-zoo-logo':       'san-diego-zoo',
  'Solid-Gold-logo':          'solid-gold',
  'solid-gold-logo':          'solid-gold',
  'Wag-logo':                 'wag',
  'wag-logo':                 'wag',
  'Whiskas-logo':             'whiskas',
  'whiskas-logo':             'whiskas',
  'Whole-Paws-Logo':          'whole-paws',
  'whole-paws-logo':          'whole-paws',

  // Common brands you may add logos for later:
  'KONG-Logo':                'kong',
  'kong-logo':                'kong',
  'Ruffwear-Logo':            'ruffwear',
  'ruffwear-logo':            'ruffwear',
  'Zesty-Paws-Logo':          'zesty-paws',
  'zesty-paws-logo':          'zesty-paws',
  'Embark-Logo':              'embark',
  'embark-logo':              'embark',
  'Chewy-Logo':               'chewy',
  'chewy-logo':               'chewy',
  'Big-Barker-Logo':          'big-barker',
  'big-barker-logo':          'big-barker',
  'Merrick-Logo':             'merrick',
  'merrick-logo':             'merrick',
  'Instinct-Logo':            'instinct',
  'instinct-logo':            'instinct',
  'Blue-Buffalo-Logo':        'blue-buffalo',
  'Nutramax-Logo':            'nutramax',
  'nutramax-logo':            'nutramax',
  'FURminator-Logo':          'furminator',
  'furminator-logo':          'furminator',
  'West-Paw-Logo':            'west-paw',
  'west-paw-logo':            'west-paw',
  'Orijen-Logo':              'orijen',
  'Acana-Logo':               'acana',
  'acana-logo':               'acana',
  'Ollie-Logo':               'ollie',
  'ollie-logo':               'ollie',
  'Farmers-Dog-Logo':         'the-farmers-dog',
  'the-farmers-dog-logo':     'the-farmers-dog',
  'Wellness-Logo':            'wellness-core',
  'wellness-logo':            'wellness-core',
  'Taste-Wild-Logo':          'taste-of-the-wild',
  'taste-of-the-wild-logo':   'taste-of-the-wild',
  'Iams-Logo':                'iams',
  'iams-logo':                'iams',
};

// ── Fuzzy matcher (fallback when exact match fails) ───────────
function slugify(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findSlug(filename) {
  const base = path.parse(filename).name;

  // Skip thumbnail versions
  if (base.toLowerCase().endsWith('-tumb') || base.toLowerCase().endsWith('-thumb')) {
    return null;
  }

  // Exact match
  if (LOGO_TO_SLUG[base]) return LOGO_TO_SLUG[base];

  // Case-insensitive match
  const lower = base.toLowerCase();
  for (const [k, v] of Object.entries(LOGO_TO_SLUG)) {
    if (k.toLowerCase() === lower) return v;
  }

  // Fuzzy: strip Logo/logo suffix and try slug match
  const stripped = base.replace(/-?[Ll]ogo$/, '').replace(/-?[Ll]ogo-?/, '');
  const fuzzy = slugify(stripped);

  // Try to find a brand in brands.json with similar slug
  return fuzzy || null;
}

// ── Load data ─────────────────────────────────────────────────
if (!fs.existsSync(BRANDS_PATH)) {
  console.error(R('✗ brands.json not found. Run from project root.'));
  process.exit(1);
}

const brands      = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8'));
const brandsBySlug = Object.fromEntries(brands.map(b => [b.slug, b]));
const srcFiles    = fs.readdirSync(SRC_DIR);

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  🏷️   Brand Logo Importer`);
console.log(`  Source: ${SRC_DIR}`);
console.log(`  Output: public/images/brands/`);
console.log(`  Files found: ${srcFiles.length} | ${DRY ? 'DRY RUN' : 'WRITE MODE'}`);
console.log(`══════════════════════════════════════════════════════\n`);

let copied = 0, skipped = 0, unknown = 0, noMatch = 0;
const updated = new Set();

// Sort: prefer PNG over JPG, prefer non-thumb
const sorted = srcFiles.sort((a, b) => {
  const aIsPng  = a.toLowerCase().endsWith('.png');
  const bIsPng  = b.toLowerCase().endsWith('.png');
  const aIsThumb= a.toLowerCase().includes('tumb') || a.toLowerCase().includes('thumb');
  const bIsThumb= b.toLowerCase().includes('tumb') || b.toLowerCase().includes('thumb');
  if (!aIsThumb && bIsThumb) return -1;
  if (aIsThumb && !bIsThumb) return 1;
  if (aIsPng && !bIsPng) return -1;
  if (!aIsPng && bIsPng) return 1;
  return 0;
});

for (const file of sorted) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext)) continue;

  const slug = findSlug(file);

  if (!slug) {
    // Skip thumbnail files silently
    if (file.toLowerCase().includes('tumb') || file.toLowerCase().includes('thumb')) continue;
    console.log(`  ${Y('?')}  ${file.padEnd(45)} ${D('no mapping found — add to LOGO_TO_SLUG')}`);
    unknown++;
    continue;
  }

  // Determine output filename (always save as .png if possible, else keep original ext)
  const outExt  = ext === '.jpg' || ext === '.jpeg' ? '.jpg' : ext;
  const outFile = `${slug}${outExt}`;
  const outPath = path.join(OUT_DIR, outFile);

  // Skip if already exists (unless --force)
  if (!FORCE && fs.existsSync(outPath)) {
    // Still update brands.json pointer
    if (brandsBySlug[slug] && !brandsBySlug[slug].logo_verified) {
      brandsBySlug[slug].logo_url      = `/images/brands/${outFile}`;
      brandsBySlug[slug].logo_verified = true;
      updated.add(slug);
    }
    skipped++;
    continue;
  }

  if (!DRY) {
    fs.copyFileSync(path.join(SRC_DIR, file), outPath);
    // Update brands.json
    if (brandsBySlug[slug]) {
      brandsBySlug[slug].logo_url      = `/images/brands/${outFile}`;
      brandsBySlug[slug].logo_verified = true;
      updated.add(slug);
      console.log(`  ${G('✓')}  ${file.padEnd(45)} → brands/${outFile}`);
    } else {
      // Brand not yet in brands.json — log for reference
      console.log(`  ${Y('+')}  ${file.padEnd(45)} → ${outFile} ${D('(brand not in brands.json yet)')}`);
    }
    copied++;
  } else {
    console.log(`  ${D('→')}  ${file.padEnd(45)} would copy as brands/${outFile}${brandsBySlug[slug] ? '' : Y(' [new brand]')}`);
    copied++;
  }
}

// ── Save updated brands.json ───────────────────────────────────
if (!DRY && updated.size > 0) {
  fs.writeFileSync(BRANDS_PATH, JSON.stringify(brands, null, 2));
  console.log(`\n  ${G('✓')}  brands.json updated — ${updated.size} brands got logo_url`);
}

// ── Also update products.json with brand_logo field ───────────
if (!DRY && fs.existsSync(PRODS_PATH)) {
  const products = JSON.parse(fs.readFileSync(PRODS_PATH, 'utf8'));
  let prodUpdated = 0;

  for (const category of Object.values(products)) {
    if (!Array.isArray(category)) continue;
    for (const prod of category) {
      const name = (prod.name || '').toLowerCase();
      for (const brand of brands) {
        const bname = brand.name.toLowerCase();
        if (name.includes(bname) || bname.includes(name.split(' ')[0])) {
          if (brand.logo_verified && brand.logo_url) {
            prod.brand_logo  = brand.logo_url;
            prod.brand_slug  = brand.slug;
            prod.brand_name  = brand.name;
            prodUpdated++;
          }
          break;
        }
      }
    }
  }

  if (prodUpdated > 0) {
    fs.writeFileSync(PRODS_PATH, JSON.stringify(products, null, 2));
    console.log(`  ${G('✓')}  products.json updated — ${prodUpdated} products got brand_logo`);
  }
}

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  Copied:  ${G(copied)}`);
console.log(`  Skipped: ${D(skipped)} (already existed)`);
console.log(`  Unknown: ${unknown > 0 ? Y(unknown) : D(unknown)} (no mapping — add to LOGO_TO_SLUG)`);
if (!DRY) {
  console.log(`\n  Next steps:`);
  console.log(`    npm run build`);
  console.log(`    git add public/images/brands src/data/brands.json`);
  console.log(`    git commit -m "brand logos: local images imported"`);
  console.log(`    git push`);
}
if (DRY) console.log(`\n  ${Y('Dry run — no files written. Remove --dry to copy.')}`);
console.log(`══════════════════════════════════════════════════════\n`);
