/**
 * fetch-breed-images.mjs
 * ─────────────────────────────────────────────────────────────
 * Downloads one photo per breed from Dog CEO API (free, no API key)
 * For unmapped breeds: uses Picsum Photos with breed-seeded ID (always works)
 *
 * Output:
 *   public/images/breeds/{slug}.jpg  ← used by breed hubs, blog cards, product cards
 *
 * Run:
 *   node scripts/fetch-breed-images.mjs
 *   node scripts/fetch-breed-images.mjs --force   (re-download all)
 *   node scripts/fetch-breed-images.mjs --dry     (preview only)
 * ─────────────────────────────────────────────────────────────
 */

import fs    from 'fs';
import path  from 'path';
import https from 'https';
import http  from 'http';
import { fileURLToPath } from 'url';

const ROOT      = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR   = path.join(ROOT, 'public', 'images', 'breeds');
const DATA_PATH = path.join(ROOT, 'src', 'data', 'master-breeds.json');
const FORCE     = process.argv.includes('--force');
const DRY       = process.argv.includes('--dry');

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Dog CEO breed path mapping ────────────────────────────────
const DOG_CEO_MAP = {
  'labrador-retriever': 'labrador',
  'golden-retriever': 'retriever/golden',
  'german-shepherd-dog': 'german-shepherd',
  'french-bulldog': 'bulldog/french',
  'bulldog': 'bulldog/english',
  'poodle': 'poodle/standard',
  'poodle-standard': 'poodle/standard',
  'poodle-miniature': 'poodle/miniature',
  'poodle-toy': 'poodle/toy',
  'beagle': 'beagle',
  'rottweiler': 'rottweiler',
  'german-shorthaired-pointer': 'pointer/germanlonghair',
  'dachshund': 'dachshund',
  'dachshund-miniature': 'dachshund/miniature',
  'pembroke-welsh-corgi': 'corgi/cardigan',
  'cardigan-welsh-corgi': 'corgi/cardigan',
  'australian-shepherd': 'australian/shepherd',
  'yorkshire-terrier': 'terrier/yorkshire',
  'boxer': 'boxer',
  'doberman-pinscher': 'dobermann',
  'great-dane': 'dane/great',
  'miniature-schnauzer': 'schnauzer/miniature',
  'standard-schnauzer': 'schnauzer',
  'giant-schnauzer': 'schnauzer/giant',
  'siberian-husky': 'husky',
  'bernese-mountain-dog': 'mountain/bernese',
  'shih-tzu': 'shihtzu',
  'shiba-inu': 'shiba',
  'boston-terrier': 'terrier/boston',
  'shetland-sheepdog': 'sheepdog/shetland',
  'old-english-sheepdog': 'sheepdog/english',
  'pomeranian': 'pomeranian',
  'cocker-spaniel': 'spaniel/cocker',
  'english-cocker-spaniel': 'spaniel/cocker',
  'american-cocker-spaniel': 'spaniel/cocker',
  'english-springer-spaniel': 'spaniel/springer',
  'weimaraner': 'weimaraner',
  'maltese': 'maltese',
  'bichon-frise': 'bichon',
  'vizsla': 'vizsla',
  'belgian-malinois': 'malinois',
  'chihuahua': 'chihuahua',
  'whippet': 'whippet',
  'basenji': 'basenji',
  'akita': 'akita',
  'mastiff': 'mastiff/english',
  'english-mastiff': 'mastiff/english',
  'tibetan-mastiff': 'mastiff/tibetan',
  'bullmastiff': 'mastiff/bull',
  'neapolitan-mastiff': 'mastiff/english',
  'saint-bernard': 'stbernard',
  'irish-setter': 'setter/irish',
  'english-setter': 'setter/english',
  'gordon-setter': 'setter/gordon',
  'pug': 'pug',
  'chow-chow': 'chow',
  'chinese-shar-pei': 'chow',
  'newfoundland': 'newfoundland',
  'airedale-terrier': 'terrier/airedale',
  'bull-terrier': 'terrier/bull',
  'miniature-bull-terrier': 'terrier/bull',
  'staffordshire-bull-terrier': 'terrier/staffordshire',
  'american-staffordshire-terrier': 'terrier/american',
  'american-pit-bull-terrier': 'terrier/american',
  'scottish-terrier': 'terrier/scottish',
  'cairn-terrier': 'terrier/cairn',
  'border-terrier': 'terrier/border',
  'west-highland-white-terrier': 'terrier/westhighland',
  'soft-coated-wheaten-terrier': 'terrier/wheaten',
  'irish-terrier': 'terrier/irish',
  'welsh-terrier': 'terrier/welsh',
  'norfolk-terrier': 'terrier/norfolk',
  'norwich-terrier': 'terrier/norwich',
  'samoyed': 'samoyed',
  'alaskan-malamute': 'malamute',
  'greyhound': 'greyhound/italian',
  'italian-greyhound': 'greyhound/italian',
  'bloodhound': 'bloodhound',
  'basset-hound': 'basset',
  'border-collie': 'collie/border',
  'collie': 'collie',
  'havanese': 'havanese',
  'cavalier-king-charles-spaniel': 'spaniel/cocker',
  'dalmatian': 'dalmatian',
  'papillon': 'papillon',
  'lhasa-apso': 'lhasa',
  'coton-de-tulear': 'cotondetulear',
  'rhodesian-ridgeback': 'ridgeback/rhodesian',
  'great-pyrenees': 'pyrenees',
  'leonberger': 'leonberg',
  'greater-swiss-mountain-dog': 'mountain/swiss',
  'australian-cattle-dog': 'cattledog/australian',
  'ibizan-hound': 'hound/ibizan',
  'pharaoh-hound': 'hound/ibizan',
  'belgian-tervuren': 'tervuren',
  'belgian-sheepdog': 'groenendael',
  'bouvier-des-flandres': 'bouvier',
  'briard': 'briard',
  'kuvasz': 'kuvasz',
  'komondor': 'komondor',
  'puli': 'puli',
  'pumi': 'pumi',
  'american-eskimo-dog': 'eskimo',
  'finnish-spitz': 'spitz/finnish',
  'keeshond': 'keeshond',
  'schipperke': 'schipperke',
  'pointer': 'pointer',
  'wirehaired-pointing-griffon': 'pointer/germanlonghair',
  'flat-coated-retriever': 'retriever/flatcoated',
  'chesapeake-bay-retriever': 'retriever/chesapeake',
  'curly-coated-retriever': 'retriever/curly',
  'nova-scotia-duck-tolling-retriever': 'retriever/golden',
  'portuguese-water-dog': 'waterdog/spanish',
  'spanish-water-dog': 'waterdog/spanish',
  'irish-wolfhound': 'wolfhound/irish',
  'scottish-deerhound': 'deerhound/scottish',
  'borzoi': 'borzoi',
  'saluki': 'saluki',
  'afghan-hound': 'hound/afghan',
  'norwegian-elkhound': 'elkhound/norwegian',
  'otterhound': 'otterhound',
  'plott': 'hound/plott',
  'treeing-walker-coonhound': 'hound/walker',
  'black-and-tan-coonhound': 'hound/black',
  'bluetick-coonhound': 'hound/bluetick',
  'redbone-coonhound': 'hound/redbone',
  'english-foxhound': 'hound/english',
  'american-foxhound': 'hound/english',
  'xoloitzcuintli': 'mexicanhairless',
  'pekingese': 'pekinese',
  'japanese-chin': 'pekinese',
  'affenpinscher': 'affenpinscher',
  'miniature-pinscher': 'pinscher/miniature',
  'lakeland-terrier': 'terrier/lakeland',
  'bedlington-terrier': 'terrier/bedlington',
  'kerry-blue-terrier': 'terrier/kerryblue',
  'dandie-dinmont-terrier': 'terrier/dandie',
  'sealyham-terrier': 'terrier/sealyham',
  'australian-terrier': 'terrier/australian',
  'silky-terrier': 'terrier/silky',
  'russell-terrier': 'terrier/russell',
  'wire-fox-terrier': 'terrier/fox',
  'dogue-de-bordeaux': 'mastiff/bull',
  'cane-corso': 'mastiff/english',
  'appenzeller-mountain-dog': 'mountain/appenzeller',
  'entlebucher-mountain-dog': 'mountain/entlebucher',
  'swedish-vallhund': 'corgi/cardigan',
  'miniature-american-shepherd': 'australian/shepherd',
  'goldendoodle': 'retriever/golden',
  'labradoodle': 'labrador',
  'cockapoo': 'spaniel/cocker',
  'bernedoodle': 'mountain/bernese',
  'aussiedoodle': 'australian/shepherd',
  'pomsky': 'husky',
  'puggle': 'pug',
  'american-bulldog': 'bulldog/english',
  'english-bulldog': 'bulldog/english',
  'brittany': 'setter/english',
  'harrier': 'beagle',
  'bolognese': 'bichon',
  'lowchen': 'bichon',
};

// ── HTTP helpers ──────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 8000, headers: { 'User-Agent': 'MrDoggoStyleBot/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const mod  = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 10000, headers: { 'User-Agent': 'MrDoggoStyleBot/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); try { fs.unlinkSync(dest); } catch {}
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close(); try { fs.unlinkSync(dest); } catch {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', e => { file.close(); try { fs.unlinkSync(dest); } catch {}; reject(e); });
  });
}

function isValid(p, min = 10000) {
  try { return fs.existsSync(p) && fs.statSync(p).size >= min; } catch { return false; }
}

// Simple hash for Picsum seed
function hashSlug(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return (h % 900) + 100; // 100–999 range
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────
if (!fs.existsSync(DATA_PATH)) {
  console.error(R('✗ master-breeds.json not found at src/data/master-breeds.json'));
  process.exit(1);
}

const breeds = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  🐕  Breed Image Downloader`);
console.log(`  Breeds: ${breeds.length} | ${FORCE ? 'Force' : 'Skip existing'} | ${DRY ? 'DRY RUN' : 'WRITE'}`);
console.log(`  Dog CEO API: ${Object.keys(DOG_CEO_MAP).length} breeds mapped`);
console.log(`  Fallback: Picsum Photos (seeded, consistent)`);
console.log(`══════════════════════════════════════════════════════\n`);

let fromApi = 0, fromFallback = 0, skipped = 0, failed = 0;

for (const breed of breeds) {
  const dest = path.join(OUT_DIR, `${breed.slug}.jpg`);

  if (!FORCE && isValid(dest)) {
    skipped++;
    continue;
  }

  if (DRY) {
    const src = DOG_CEO_MAP[breed.slug] ? 'Dog CEO API' : 'Picsum fallback';
    console.log(`  ${D('→')}  ${breed.name.padEnd(35)} [${src}]`);
    continue;
  }

  let ok = false;

  // Try 1: Dog CEO API (real dog breed photos)
  const dceoBreed = DOG_CEO_MAP[breed.slug];
  if (dceoBreed && !ok) {
    try {
      const apiUrl = `https://dog.ceo/api/breed/${dceoBreed}/images/random`;
      const body   = await get(apiUrl);
      const parsed = JSON.parse(body);
      if (parsed.status === 'success' && parsed.message) {
        await downloadFile(parsed.message, dest);
        if (isValid(dest)) {
          console.log(`  ${G('✓')}  ${breed.name.padEnd(35)} ${D('← Dog CEO')}`);
          fromApi++;
          ok = true;
        } else {
          try { fs.unlinkSync(dest); } catch {}
        }
      }
    } catch {}
    await sleep(80); // polite delay
  }

  // Try 2: Picsum Photos (consistent per breed, always available)
  if (!ok) {
    const seed = hashSlug(breed.slug);
    const fallbackUrl = `https://picsum.photos/seed/${breed.slug}-dog/640/400.jpg`;
    try {
      await downloadFile(fallbackUrl, dest);
      if (isValid(dest, 5000)) {
        console.log(`  ${Y('◎')}  ${breed.name.padEnd(35)} ${D('← Picsum fallback')}`);
        fromFallback++;
        ok = true;
      } else {
        try { fs.unlinkSync(dest); } catch {}
      }
    } catch {}
    await sleep(50);
  }

  if (!ok) {
    console.log(`  ${R('✗')}  ${breed.name} — failed`);
    failed++;
  }
}

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  Dog CEO photos:  ${G(fromApi)}`);
console.log(`  Picsum fallback: ${Y(fromFallback)}`);
console.log(`  Skipped:         ${D(skipped)}`);
console.log(`  Failed:          ${failed > 0 ? R(failed) : D(0)}`);
console.log(`\n  Images saved to: public/images/breeds/`);
if (!DRY) {
  console.log(`\n  Next: npm run build && git add public/images/breeds && git push`);
}
console.log(`══════════════════════════════════════════════════════\n`);
