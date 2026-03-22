/**
 * fetch-breed-images.mjs
 *
 * Haalt echte hondenfoto's op via de Dog CEO API (https://dog.ceo/dog-api/)
 * en voegt ze toe aan breeds.json.
 *
 * Dog CEO API is 100% gratis, geen API key nodig, 20.000+ foto's.
 *
 * Gebruik:
 *   node fetch-breed-images.mjs              (alle 277 breeds)
 *   node fetch-breed-images.mjs --top50      (alleen top 50 populairste)
 *   node fetch-breed-images.mjs --test       (alleen eerste 10, snel testen)
 *
 * Locatie: zet dit in E:\2026_Github\mrdoggostyle_site\
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BREEDS_PATH = path.resolve(__dirname, 'src/data/breeds.json');
const TOP50_ONLY  = process.argv.includes('--top50');
const TEST_MODE   = process.argv.includes('--test');
const DELAY_MS    = 200;

// ── BREED NAME → Dog CEO API MAPPING ─────────────────────────────────────────
// Dog CEO uses lowercase, simple names. We map from AKC names to their format.
// Format: "breed/sub-breed" or just "breed"
const BREED_MAP = {
  // Sporting
  'labrador retriever':           'labrador',
  'golden retriever':             'retriever/golden',
  'german shorthaired pointer':   'pointer/germanlonghair',
  'cocker spaniel':               'spaniel/cocker',
  'english springer spaniel':     'spaniel/springer',
  'vizsla':                       'vizsla',
  'weimaraner':                   'weimaraner',
  'irish setter':                 'setter/irish',
  'english setter':               'setter/english',
  'brittany':                     'spaniel/brittany',
  'chesapeake bay retriever':     'retriever/chesapeake',
  'flat-coated retriever':        'retriever/flatcoated',
  'gordon setter':                'setter/gordon',
  'irish water spaniel':          'spaniel/irish',
  'nova scotia duck tolling retriever': 'retriever/nova',

  // Herding
  'german shepherd dog':          'germanshepherd',
  'border collie':                'collie/border',
  'australian shepherd':          'australian-shepherd',
  'pembroke welsh corgi':         'corgi/cardigan',
  'cardigan welsh corgi':         'corgi/cardigan',
  'shetland sheepdog':            'sheepdog/shetland',
  'australian cattle dog':        'cattledog/australian',
  'belgian malinois':             'malinois',
  'collie':                       'collie',
  'old english sheepdog':         'sheepdog/english',
  'belgian tervuren':             'tervuren',

  // Non-Sporting
  'french bulldog':               'bulldog/french',
  'bulldog':                      'bulldog/english',
  'poodle (standard)':            'poodle/standard',
  'poodle (miniature)':           'poodle/miniature',
  'poodle (toy)':                 'poodle/toy',
  'boston terrier':               'terrier/boston',
  'shiba inu':                    'shiba',
  'bichon frise':                 'bichon',
  'dalmatian':                    'dalmatian',
  'chow chow':                    'chow',

  // Working
  'rottweiler':                   'rottweiler',
  'german shepherd':              'germanshepherd',
  'doberman pinscher':            'doberman',
  'great dane':                   'dane/great',
  'siberian husky':               'husky',
  'alaskan malamute':             'malamute',
  'saint bernard':                'stbernard',
  'bernese mountain dog':         'mountain/bernese',
  'boxer':                        'boxer',
  'mastiff':                      'mastiff/bull',
  'great pyrenees':               'pyrenees',
  'newfoundland':                 'newfoundland',
  'portuguese water dog':         'waterdog/portuguese',
  'standard schnauzer':           'schnauzer/standard',
  'giant schnauzer':              'schnauzer/giant',
  'black russian terrier':        'terrier/blackrussian',

  // Hound
  'beagle':                       'beagle',
  'basset hound':                 'basset',
  'bloodhound':                   'bloodhound',
  'greyhound':                    'greyhound',
  'whippet':                      'whippet',
  'dachshund':                    'dachshund',
  'irish wolfhound':              'wolfhound/irish',
  'rhodesian ridgeback':          'ridgeback/rhodesian',
  'afghan hound':                 'hound/afghan',
  'pharaoh hound':                'hound/pharaoh',
  'borzoi':                       'borzoi',
  'norwegian elkhound':           'elkhound/norwegian',
  'otterhound':                   'otterhound',
  'plott':                        'plott',
  'scottish deerhound':           'deerhound/scottish',

  // Toy
  'chihuahua':                    'chihuahua',
  'pomeranian':                   'pomeranian',
  'yorkshire terrier':            'terrier/yorkshire',
  'maltese':                      'maltese',
  'shih tzu':                     'shihtzu',
  'pug':                          'pug',
  'havanese':                     'havanese',
  'miniature pinscher':           'pinscher/miniature',
  'cavalier king charles spaniel':'spaniel/cocker',
  'toy fox terrier':              'terrier/toy',

  // Terrier
  'bull terrier':                 'terrier/bull',
  'airedale terrier':             'terrier/airedale',
  'west highland white terrier':  'terrier/westhighland',
  'scottish terrier':             'terrier/scottish',
  'cairn terrier':                'terrier/cairn',
  'wire fox terrier':             'terrier/fox',
  'smooth fox terrier':           'terrier/fox',
  'miniature schnauzer':          'schnauzer/miniature',
  'rat terrier':                  'terrier/rat',
  'australian terrier':           'terrier/australian',
  'bedlington terrier':           'terrier/bedlington',
  'border terrier':               'terrier/border',
  'dandie dinmont terrier':       'terrier/dandie',
  'irish terrier':                'terrier/irish',
  'kerry blue terrier':           'terrier/kerryblue',
  'norfolk terrier':              'terrier/norfolk',
  'norwich terrier':              'terrier/norwich',
  'skye terrier':                 'terrier/skye',
  'staffordshire bull terrier':   'terrier/staffordshire',
  'welsh terrier':                'terrier/welsh',
};

// Generic fallback queries by group
const GROUP_FALLBACK = {
  'Sporting Group':    'setter/irish',
  'Herding Group':     'collie/border',
  'Non-Sporting Group':'poodle/standard',
  'Working Group':     'rottweiler',
  'Hound Group':       'greyhound',
  'Toy Group':         'chihuahua',
  'Terrier Group':     'terrier/airedale',
  'Foundation Stock Service': 'husky',
  'Miscellaneous Class': 'labrador',
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function getBreedImage(breedName, group) {
  const key = breedName.toLowerCase().trim();

  // Try exact match first
  let apiBreed = BREED_MAP[key];

  // Try partial match
  if (!apiBreed) {
    for (const [mapKey, mapVal] of Object.entries(BREED_MAP)) {
      if (key.includes(mapKey) || mapKey.includes(key.split(' ')[0])) {
        apiBreed = mapVal;
        break;
      }
    }
  }

  // Fallback to group
  if (!apiBreed) {
    apiBreed = GROUP_FALLBACK[group] || 'labrador';
  }

  try {
    const url = `https://dog.ceo/api/breed/${apiBreed}/images/random`;
    const data = await fetchJson(url);
    if (data.status === 'success' && data.message) {
      return { image: data.message, source: 'dog-ceo', apiBreed };
    }
  } catch (e) {
    // Silent fail, try fallback
  }

  // Last resort: random dog image
  try {
    const data = await fetchJson('https://dog.ceo/api/breeds/image/random');
    if (data.status === 'success') {
      return { image: data.message, source: 'dog-ceo-random', apiBreed: 'random' };
    }
  } catch (e) {}

  return { image: '', source: 'failed', apiBreed };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  🐕   Breed Images Fetcher — Dog CEO API');
  console.log('════════════════════════════════════════════════════\n');

  if (!fs.existsSync(BREEDS_PATH)) {
    console.error(`❌ breeds.json niet gevonden:\n   ${BREEDS_PATH}`);
    process.exit(1);
  }

  const breeds = JSON.parse(fs.readFileSync(BREEDS_PATH, 'utf8'));

  // Filter which breeds to process
  let toProcess = breeds;
  if (TOP50_ONLY) {
    toProcess = breeds.filter(b => b.popularity && b.popularity <= 50);
    console.log(`  Mode: TOP 50 populairste breeds (${toProcess.length} breeds)`);
  } else if (TEST_MODE) {
    toProcess = breeds.slice(0, 10);
    console.log(`  Mode: TEST — eerste 10 breeds`);
  } else {
    console.log(`  Mode: ALLE ${breeds.length} breeds`);
  }

  console.log(`  Bron: Dog CEO API (gratis, geen API key)\n`);

  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (let i = 0; i < breeds.length; i++) {
    const breed = breeds[i];

    // Only process breeds in our target list
    if (!toProcess.find(b => b.slug === breed.slug)) continue;

    // Skip if already has image
    if (breed.image && breed.image.length > 0) {
      skipped++;
      continue;
    }

    process.stdout.write(`  [${String(i+1).padStart(3,'0')}/${breeds.length}] ${breed.name.padEnd(35, '.')} `);

    const result = await getBreedImage(breed.name, breed.group);

    if (result.image) {
      breed.image = result.image;
      breed.imageSource = result.source;
      updated++;
      console.log(`✓  ${result.apiBreed}`);
    } else {
      failed++;
      console.log(`✗  (no image found)`);
    }

    await sleep(DELAY_MS);
  }

  // Save
  fs.writeFileSync(BREEDS_PATH, JSON.stringify(breeds, null, 2));

  console.log('\n════════════════════════════════════════════════════');
  console.log('  📊  Resultaat');
  console.log('────────────────────────────────────────────────────');
  console.log(`  ✅ Bijgewerkt:    ${updated} breeds`);
  console.log(`  ⏭  Al had image: ${skipped} breeds`);
  console.log(`  ❌ Mislukt:       ${failed} breeds`);
  console.log(`\n  💾 Opgeslagen:   ${BREEDS_PATH}`);
  console.log('\n  ✅  Volgende stap:');
  console.log('      npm run dev  →  bekijk breed pages met echte fotos');
  if (!TOP50_ONLY && !TEST_MODE && breeds.length > 50) {
    console.log('\n  💡  Tip: run met --top50 voor alleen de populairste breeds eerst');
  }
  console.log('════════════════════════════════════════════════════\n');
}

run().catch(console.error);
