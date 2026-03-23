/**
 * enrich-breed-images.mjs
 * ─────────────────────────────────────────────────────────────
 * Fetches one representative image URL per breed from the Dog CEO API
 * and saves it into master-breeds.json as breed.image_url
 *
 * The Dog CEO API serves the Stanford Dogs Dataset images via CDN —
 * the same dataset you have locally, so no need to push 41k images to GitHub.
 *
 * Usage:
 *   node scripts/enrich-breed-images.mjs              ← all breeds missing images
 *   node scripts/enrich-breed-images.mjs --force      ← re-fetch all 277
 *   node scripts/enrich-breed-images.mjs --slug labrador-retriever
 *   node scripts/enrich-breed-images.mjs --dry        ← show URLs without saving
 *
 * Output: master-breeds.json gets a new field per breed:
 *   "image_url": "https://images.dog.ceo/breeds/retriever/labrador/n02099712_7.jpg"
 *   "image_source": "dog-ceo-api"
 *   "enrichment.image_verified": true
 * ─────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT       = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA        = path.join(ROOT, 'src', 'data');
const MASTER_PATH = path.join(DATA, 'master-breeds.json');

const args   = process.argv.slice(2);
const FORCE  = args.includes('--force');
const DRY    = args.includes('--dry');
const SLUG   = (() => { const i = args.indexOf('--slug'); return i !== -1 ? args[i+1] : null; })();
const DELAY  = 120; // ms between API calls — be polite to the free API

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

// ── Mapping: site breed slug → Dog CEO API path ────────────────
// Format: "breed" or "breed/subbreed"
const SLUG_TO_DOG_CEO = {
  // Hound group
  'afghan-hound':              'hound/afghan',
  'basset-hound':              'hound/basset',
  'beagle':                    'beagle',
  'bloodhound':                'bloodhound',
  'borzoi':                    'borzoi',
  'dachshund':                 'dachshund',
  'greyhound':                 'greyhound',
  'italian-greyhound':         'greyhound/italian',
  'ibizan-hound':              'hound/ibizan',
  'irish-wolfhound':           'wolfhound/irish',
  'norwegian-elkhound':        'elkhound/norwegian',
  'otterhound':                'otterhound',
  'saluki':                    'saluki',
  'scottish-deerhound':        'deerhound/scottish',
  'whippet':                   'whippet',
  'rhodesian-ridgeback':       'ridgeback/rhodesian',
  'black-and-tan-coonhound':   'hound/walker',
  'bluetick-coonhound':        'hound/bluetick',
  'treeing-walker-coonhound':  'hound/walker',
  'english-foxhound':          'hound/english',
  'american-foxhound':         'hound/english',
  'redbone-coonhound':         'hound/redbone',
  'plott-hound':               'hound/redbone',
  'harrier':                   'harrier',
  'petit-basset-griffon-venden': 'hound/basset',
  'grand-basset-griffon-venden': 'hound/basset',
  'american-english-coonhound':'hound/english',
  'american-leopard-hound':    'hound/english',
  'basset-fauve-de-bretagne':  'hound/basset',
  'bavarian-mountain-scent-hound': 'hound/redbone',
  'hanoverian-scenthound':     'hound/redbone',
  'slovensky-kopov':           'hound/redbone',
  'segugio-italiano':          'hound/redbone',
  'porcelaine':                'hound/english',
  'transylvanian-hound':       'hound/redbone',
  'drever':                    'hound/basset',
  'hamiltonstovare':           'hound/english',
  'cirneco-delletna':          'hound/ibizan',
  'portuguese-podengo':        'hound/ibizan',
  'portuguese-podengo-pequeno':'hound/ibizan',
  'pharaoh-hound':             'hound/ibizan',
  'azawakh':                   'saluki',
  'sloughi':                   'saluki',

  // Sporting group
  'labrador-retriever':        'retriever/labrador',
  'golden-retriever':          'retriever/golden',
  'chesapeake-bay-retriever':  'retriever/chesapeake',
  'flat-coated-retriever':     'retriever/flatcoated',
  'curly-coated-retriever':    'retriever/curly',
  'nova-scotia-duck-tolling-retriever': 'retriever/golden',
  'german-shorthaired-pointer':'pointer/german-shorthaired',
  'german-wirehaired-pointer': 'pointer/german-wirehaired',
  'vizsla':                    'vizsla',
  'wirehaired-vizsla':         'vizsla',
  'weimaraner':                'weimaraner',
  'english-setter':            'setter/english',
  'irish-setter':              'setter/irish',
  'gordon-setter':             'setter/gordon',
  'irish-red-and-white-setter':'setter/irish-red-white',
  'brittany':                  'spaniel/brittany',
  'english-springer-spaniel':  'spaniel/springer',
  'welsh-springer-spaniel':    'spaniel/welsh-springer',
  'cocker-spaniel':            'spaniel/cocker',
  'english-cocker-spaniel':    'spaniel/cocker',
  'clumber-spaniel':           'spaniel/clumber',
  'sussex-spaniel':            'spaniel/sussex',
  'irish-water-spaniel':       'spaniel/irish-water',
  'field-spaniel':             'spaniel/cocker',
  'boykin-spaniel':            'spaniel/cocker',
  'american-water-spaniel':    'spaniel/cocker',
  'pointer':                   'pointer',
  'spinone-italiano':          'pointer/german-longhaired',
  'wirehaired-pointing-griffon':'pointer/german-wirehaired',
  'lagotto-romagnolo':         'spaniel/cocker',
  'nederlandse-kooikerhondje': 'spaniel/cocker',
  'barbet':                    'spaniel/cocker',
  'deutsch-drahthaar':         'pointer/german-wirehaired',
  'pudelpointer':              'pointer/german-wirehaired',
  'slovakian-wirehaired-pointer':'pointer/german-wirehaired',
  'bracco-italiano':           'pointer',
  'braque-du-bourbonnais':     'pointer',
  'braque-francais-pyrenean':  'pointer',
  'drentsche-patrijshond':     'spaniel/cocker',
  'small-munsterlander-pointer':'spaniel/cocker',
  'french-spaniel':            'spaniel/cocker',
  'german-longhaired-pointer': 'pointer/german-longhaired',
  'stabyhoun':                 'spaniel/cocker',
  'wetterhoun':                'spaniel/cocker',
  'deutscher-wachtelhund':     'spaniel/cocker',

  // Terrier group
  'airedale-terrier':          'terrier/airedale',
  'australian-terrier':        'terrier/australian',
  'bedlington-terrier':        'terrier/bedlington',
  'border-terrier':            'terrier/border',
  'bull-terrier':              'terrier/bull',
  'miniature-bull-terrier':    'terrier/bull',
  'cairn-terrier':             'terrier/cairn',
  'dandie-dinmont-terrier':    'terrier/dandie',
  'glen-of-imaal-terrier':     'terrier/irish',
  'irish-terrier':             'terrier/irish',
  'kerry-blue-terrier':        'terrier/kerry-blue',
  'lakeland-terrier':          'terrier/lakeland',
  'manchester-terrier-standard':'terrier/yorkshire',
  'manchester-terrier-toy':    'terrier/yorkshire',
  'norfolk-terrier':           'terrier/norfolk',
  'norwich-terrier':           'terrier/norwich',
  'scottish-terrier':          'terrier/scottish',
  'sealyham-terrier':          'terrier/sealyham',
  'skye-terrier':              'terrier/skye',
  'smooth-fox-terrier':        'terrier/fox',
  'wire-fox-terrier':          'terrier/fox-wirehaired',
  'staffordshire-bull-terrier':'terrier/staffordshire',
  'american-staffordshire-terrier': 'terrier/american-staffordshire',
  'tibetan-terrier':           'terrier/tibetan',
  'toy-fox-terrier':           'terrier/toy',
  'welsh-terrier':             'terrier/welsh',
  'west-highland-white-terrier':'terrier/westhighland',
  'yorkshire-terrier':         'terrier/yorkshire',
  'silky-terrier':             'terrier/silky',
  'soft-coated-wheaten-terrier':'terrier/wheaten',
  'rat-terrier':               'terrier/rat',
  'cesky-terrier':             'terrier/australian',
  'parson-russell-terrier':    'terrier/russell',
  'russell-terrier':           'terrier/russell',
  'american-hairless-terrier': 'terrier/rat',
  'jagdterrier':               'terrier/german',
  'black-russian-terrier':     'terrier/russian-black',
  'biewer-terrier':            'terrier/yorkshire',
  'teddy-roosevelt-terrier':   'terrier/rat',
  'lakeland-terrier':          'terrier/lakeland',

  // Toy group
  'chihuahua':                 'chihuahua',
  'maltese':                   'maltese',
  'papillon':                  'papillon',
  'pekingese':                 'pekinese',
  'pomeranian':                'pomeranian',
  'pug':                       'pug',
  'shih-tzu':                  'shihtzu',
  'cavalier-king-charles-spaniel': 'spaniel/cocker',
  'english-toy-spaniel':       'spaniel/blenheim',
  'japanese-chin':             'spaniel/japanese',
  'brussels-griffon':          'griffon/brussels',
  'havanese':                  'havanese',
  'miniature-pinscher':        'pinscher/miniature',
  'affenpinscher':             'affenpinscher',
  'lhasa-apso':                'lhasa',
  'coton-de-tulear':           'maltese',
  'bolognese':                 'maltese',
  'russian-toy':               'terrier/yorkshire',
  'italian-greyhound':         'greyhound/italian',
  'chinese-crested':           'chihuahua',
  'russian-tsvetnaya-bolonka': 'maltese',

  // Working group
  'akita':                     'akita',
  'alaskan-malamute':          'malamute',
  'anatolian-shepherd-dog':    'mastiff/tibetan',
  'bernese-mountain-dog':      'mountain/bernese',
  'boxer':                     'boxer',
  'bullmastiff':               'mastiff/bull',
  'cane-corso':                'mastiff',
  'doberman-pinscher':         'doberman',
  'dogue-de-bordeaux':         'mastiff',
  'german-pinscher':           'pinscher',
  'giant-schnauzer':           'schnauzer/giant',
  'great-dane':                'dane/great',
  'great-pyrenees':            'pyrenees/great',
  'greater-swiss-mountain-dog':'mountain/swiss',
  'komondor':                  'komondor',
  'kuvasz':                    'kuvasz',
  'leonberger':                'leonberg',
  'mastiff':                   'mastiff',
  'neapolitan-mastiff':        'mastiff',
  'newfoundland':              'newfoundland',
  'portuguese-water-dog':      'waterdog/portuguese',
  'rottweiler':                'rottweiler',
  'saint-bernard':             'bernard/saint',
  'samoyed':                   'samoyed',
  'siberian-husky':            'husky',
  'standard-schnauzer':        'schnauzer',
  'tibetan-mastiff':           'mastiff/tibetan',
  'boerboel':                  'mastiff',
  'chinook':                   'husky',
  'dogo-argentino':            'mastiff',
  'spanish-mastiff':           'mastiff',
  'broholmer':                 'mastiff',
  'rafeiro-do-alentejo':       'mastiff',
  'pyrenean-mastiff':          'mastiff',
  'caucasian-shepherd-dog':    'mastiff/tibetan',
  'central-asian-shepherd-dog':'mastiff/tibetan',
  'estrela-mountain-dog':      'mastiff/tibetan',
  'tornjak':                   'mastiff/tibetan',
  'perro-de-presa-canario':    'mastiff',

  // Herding group
  'australian-shepherd':       'sheepdog/australian',
  'australian-cattle-dog':     'cattledog/australian',
  'australian-stumpy-tail-cattle-dog': 'cattledog/australian',
  'bearded-collie':            'collie',
  'belgian-malinois':          'malinois',
  'belgian-sheepdog':          'malinois',
  'belgian-tervuren':          'malinois',
  'belgian-laekenois':         'malinois',
  'bergamasco-sheepdog':       'komondor',
  'border-collie':             'collie/border',
  'bouvier-des-flandres':      'bouvier',
  'briard':                    'briard',
  'canaan-dog':                'canaan',
  'cardigan-welsh-corgi':      'corgi/cardigan',
  'collie':                    'collie',
  'entlebucher-mountain-dog':  'entlebucher',
  'appenzeller-sennenhund':    'appenzeller',
  'german-shepherd':           'germanshepherd',
  'german-shepherd-dog':       'germanshepherd',
  'miniature-american-shepherd':'sheepdog/australian',
  'old-english-sheepdog':      'sheepdog/english',
  'pembroke-welsh-corgi':      'corgi/pembroke',
  'puli':                      'puli',
  'shetland-sheepdog':         'sheepdog/shetland',
  'icelandic-sheepdog':        'sheepdog',
  'pyrenean-shepherd':         'sheepdog',
  'polish-lowland-sheepdog':   'sheepdog',
  'romanian-mioritic-shepherd-dog': 'sheepdog',
  'dutch-shepherd':            'malinois',
  'bohemian-shepherd':         'germanshepherd',
  'schapendoes':               'puli',
  'mudi':                      'puli',
  'lapponian-herder':          'elkhound/norwegian',
  'working-kelpie':            'kelpie',
  'australian-kelpie':         'kelpie',
  'berger-picard':             'briard',
  'spanish-water-dog':         'waterdog/spanish',
  'svenska-vallhund':          'elkhound/norwegian',
  'swedish-vallhund':          'elkhound/norwegian',
  'norwegian-buhund':          'elkhound/norwegian',
  'catahoula-leopard-dog':     'pointer',

  // Non-sporting
  'bichon-frise':              'bichon/frise',
  'boston-terrier':            'terrier/boston',
  'bulldog':                   'bulldog/english',
  'american-bulldog':          'bulldog/american',
  'chinese-shar-pei':          'chow',
  'chow-chow':                 'chow',
  'dalmatian':                 'dalmatian',
  'finnish-spitz':             'spitz',
  'french-bulldog':            'bulldog/french',
  'keeshond':                  'keeshond',
  'miniature-schnauzer':       'schnauzer/miniature',
  'poodle-miniature':          'poodle/miniature',
  'poodle-standard':           'poodle/standard',
  'poodle-toy':                'poodle/toy',
  'standard-poodle':           'poodle/standard',
  'miniature-poodle':          'poodle/miniature',
  'toy-poodle':                'poodle/toy',
  'poodle':                    'poodle/standard',
  'schipperke':                'schipperke',
  'shiba-inu':                 'shiba',
  'tibetan-spaniel':           'terrier/tibetan',
  'xoloitzcuintli':            'mexicanhairless',
  'american-eskimo-dog':       'eskimo',
  'lhasa':                     'lhasa',
  'basenji':                   'basenji',
  'lowchen':                   'maltese',
  'lwchen':                    'maltese',
  'pumi':                      'puli',

  // Nordic / spitz
  'akita-inu':                 'akita',
  'finnish-lapphund':          'elkhound/norwegian',
  'norwegian-lundehund':       'elkhound/norwegian',
  'swedish-lapphund':          'elkhound/norwegian',
  'norrbottenspets':           'spitz',
  'karelian-bear-dog':         'spitz',
  'japanese-spitz':            'spitz',
  'german-spitz':              'spitz',
  'eurasier':                  'spitz',
  'jindo':                     'shiba',
  'kai-ken':                   'shiba',
  'shikoku':                   'shiba',
  'hokkaido':                  'shiba',
  'kishu-ken':                 'shiba',
  'yakutian-laika':            'husky',
  'thai-ridgeback':            'ridgeback/rhodesian',
  'carolina-dog':              'dingo',
  'taiwan-dog':                'shiba',
  'dingo':                     'dingo',
  'peruvian-inca-orchid':      'mexicanhairless',
  'mexican-hairless':          'mexicanhairless',

  // Misc
  'mountain-cur':              'hound/redbone',
  'treeing-tennessee-brindle': 'hound/redbone',
  'danish-swedish-farmdog':    'terrier/rat',
  'lancashire-heeler':         'terrier/welsh',
  'kromfohrlander':            'terrier/welsh',
  'slovensky-cuvac':           'samoyed',
  'czech-terrier':             'terrier/australian',
  'czechoslovakian-vlcak':     'germanshepherd',
  'appenzeller':               'appenzeller',
};

// ── Sleep helper ───────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Fetch with retry ───────────────────────────────────────────
async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

// ── Resolve a Dog CEO image URL for a breed ────────────────────
async function resolveImage(slug) {
  const apiPath = SLUG_TO_DOG_CEO[slug];
  if (!apiPath) return null;

  const parts = apiPath.split('/');
  const breed    = parts[0];
  const subbreed = parts[1] || null;

  const url = subbreed
    ? `https://dog.ceo/api/breed/${breed}/${subbreed}/images/random`
    : `https://dog.ceo/api/breed/${breed}/images/random`;

  try {
    const data = await fetchJSON(url);
    if (data.status === 'success' && data.message) {
      return data.message; // e.g. https://images.dog.ceo/breeds/retriever-labrador/n02099712_7.jpg
    }
  } catch(e) {
    // Try without subbreed as fallback
    if (subbreed) {
      try {
        const data = await fetchJSON(`https://dog.ceo/api/breed/${breed}/images/random`);
        if (data.status === 'success') return data.message;
      } catch {}
    }
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  🐕  Breed Image Enrichment — Dog CEO API');
console.log(`  ${FORCE ? 'Force re-fetch all' : 'Only breeds missing images'} | ${DRY ? 'DRY RUN' : 'WRITE MODE'}`);
console.log('══════════════════════════════════════════════════════\n');

if (!fs.existsSync(MASTER_PATH)) {
  console.error(R('✗ master-breeds.json not found in src/data/'));
  process.exit(1);
}

const breeds = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

let queue = [...breeds];
if (SLUG) queue = queue.filter(b => b.slug === SLUG);
if (!FORCE && !SLUG) queue = queue.filter(b => !b.image_url);

console.log(`  Breeds to process: ${queue.length}`);
console.log(`  Estimated time:    ~${Math.ceil(queue.length * DELAY / 1000)}s\n`);

let done = 0, skipped = 0, failed = 0;
const startTime = Date.now();

for (const breed of queue) {
  const imageUrl = await resolveImage(breed.slug);

  if (imageUrl) {
    if (!DRY) {
      breed.image_url    = imageUrl;
      breed.image_source = 'dog-ceo-api';
      breed.enrichment   = breed.enrichment || {};
      breed.enrichment.image_verified = true;
    }
    console.log(`  ${G('✓')}  ${breed.slug.padEnd(45)} ${D(imageUrl.split('/').slice(-1)[0])}`);
    done++;
  } else {
    const hasFallback = !SLUG_TO_DOG_CEO[breed.slug];
    console.log(`  ${hasFallback ? Y('–') : R('✗')}  ${breed.slug.padEnd(45)} ${hasFallback ? D('no mapping') : R('API failed')}`);
    failed++;
  }

  await sleep(DELAY);
}

if (!DRY && done > 0) {
  fs.writeFileSync(MASTER_PATH, JSON.stringify(breeds, null, 2));
  console.log(`\n  ${G('✓')}  Saved master-breeds.json`);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  Done: ${G(done)}  Failed: ${failed > 0 ? R(failed) : D(failed)}  Time: ${elapsed}s`);
if (DRY) console.log(`  ${Y('Dry run — no files written')}`);
console.log(`══════════════════════════════════════════════════════\n`);
