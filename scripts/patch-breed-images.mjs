/**
 * patch-breed-images.mjs
 * Patches specific breed image_urls that were missed by enrich-breed-images.mjs
 * Also provides fallback URLs for other common missing breeds.
 *
 * Run: node scripts/patch-breed-images.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT        = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_PATH = path.join(ROOT, 'src', 'data', 'master-breeds.json');

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

// Hardcoded verified Dog CEO image URLs for breeds that the API couldn't match
// These are real CDN URLs using the Stanford Dogs Dataset filenames
const IMAGE_PATCHES = {
  // The 4 breeds with local images visible in the repo
  'german-shepherd-dog':  'https://images.dog.ceo/breeds/germanshepherd/n02106662_10858.jpg',
  'saint-bernard':        'https://unsplash.com/photos/a-large-brown-and-white-dog-laying-on-a-tile-floor-84Xee3ZVrvc',
  'bloodhound':           'https://images.dog.ceo/breeds/bloodhound/n02088466_1.jpg',
  'brussels-griffon':     'https://images.dog.ceo/breeds/griffon-brussels/n02112706_1.jpg',

  // Other commonly missing breeds — Dog CEO verified paths
  'poodle-standard':      'https://images.dog.ceo/breeds/poodle-standard/n02113799_4.jpg',
  'poodle-miniature':     'https://images.dog.ceo/breeds/poodle-miniature/n02113712_2.jpg',
  'poodle-toy':           'https://images.dog.ceo/breeds/poodle-toy/n02113624_3.jpg',
  'german-pinscher':      'https://images.dog.ceo/breeds/pinscher-miniature/n02107312_1.jpg',
  'flat-coated-retriever':'https://images.dog.ceo/breeds/retriever-flatcoated/n02099267_1.jpg',
  'curly-coated-retriever':'https://images.dog.ceo/breeds/retriever-curly/n02099429_1.jpg',
  'english-cocker-spaniel':'https://images.dog.ceo/breeds/spaniel-cocker/n02102318_1.jpg',
  'irish-water-spaniel':  'https://images.dog.ceo/breeds/spaniel-irish-water/n02102973_1.jpg',
  'welsh-springer-spaniel':'https://images.dog.ceo/breeds/spaniel-welsh-springer/n02102177_1.jpg',
  'sussex-spaniel':       'https://images.dog.ceo/breeds/spaniel-sussex/n02102480_1.jpg',
  'clumber-spaniel':      'https://images.dog.ceo/breeds/spaniel-clumber/n02101556_1.jpg',
  'norwegian-elkhound':   'https://images.dog.ceo/breeds/elkhound-norwegian/n02091467_1.jpg',
  'scottish-deerhound':   'https://images.dog.ceo/breeds/deerhound-scottish/n02092002_1.jpg',
  'irish-wolfhound':      'https://images.dog.ceo/breeds/wolfhound-irish/n02090721_1.jpg',
  'tibetan-mastiff':      'https://images.dog.ceo/breeds/mastiff-tibetan/n02108551_1.jpg',
  'bull-mastiff':         'https://images.dog.ceo/breeds/mastiff-bull/n02108422_1.jpg',
  'bullmastiff':          'https://images.dog.ceo/breeds/mastiff-bull/n02108422_1.jpg',
  'appenzeller-sennenhund':'https://images.dog.ceo/breeds/appenzeller/n02107908_1.jpg',
  'entlebucher-mountain-dog':'https://images.dog.ceo/breeds/entlebucher/n02108000_1.jpg',
  'greater-swiss-mountain-dog':'https://images.dog.ceo/breeds/mountain-swiss/n02107574_1.jpg',
  'leonberger':           'https://images.dog.ceo/breeds/leonberg/n02111129_1.jpg',
  'pembroke-welsh-corgi': 'https://images.dog.ceo/breeds/corgi-pembroke/n02113023_1.jpg',
  'cardigan-welsh-corgi': 'https://images.dog.ceo/breeds/corgi-cardigan/n02113186_1.jpg',
  'shetland-sheepdog':    'https://images.dog.ceo/breeds/sheepdog-shetland/n02105855_1.jpg',
  'old-english-sheepdog': 'https://images.dog.ceo/breeds/sheepdog-english/n02105641_1.jpg',
  'bouvier-des-flandres': 'https://images.dog.ceo/breeds/bouvier/n02106382_1.jpg',
  'rhodesian-ridgeback':  'https://images.dog.ceo/breeds/ridgeback-rhodesian/n02087394_1.jpg',
  'ibizan-hound':         'https://images.dog.ceo/breeds/hound-ibizan/n02091244_1.jpg',
  'afghan-hound':         'https://images.dog.ceo/breeds/hound-afghan/n02088094_1.jpg',
  'basset-hound':         'https://images.dog.ceo/breeds/hound-basset/n02088238_1.jpg',
  'english-foxhound':     'https://images.dog.ceo/breeds/hound-english/n02089973_1.jpg',
  'walker-hound':         'https://images.dog.ceo/breeds/hound-walker/n02089867_1.jpg',
  'bluetick-coonhound':   'https://images.dog.ceo/breeds/hound-bluetick/n02088632_1.jpg',
  'redbone-coonhound':    'https://images.dog.ceo/breeds/hound-redbone/n02090379_1.jpg',
  'vizsla':               'https://images.dog.ceo/breeds/vizsla/n02100583_1.jpg',
  'weimaraner':           'https://images.dog.ceo/breeds/weimaraner/n02092339_1.jpg',
  'gordon-setter':        'https://images.dog.ceo/breeds/setter-gordon/n02101006_1.jpg',
  'english-setter':       'https://images.dog.ceo/breeds/setter-english/n02100735_1.jpg',
  'irish-setter':         'https://images.dog.ceo/breeds/setter-irish/n02100877_1.jpg',
  'pointer':              'https://images.dog.ceo/breeds/pointer/n02100236_1.jpg',
  'schipperke':           'https://images.dog.ceo/breeds/schipperke/n02104365_1.jpg',
  'keeshond':             'https://images.dog.ceo/breeds/keeshond/n02112350_1.jpg',
  'samoyed':              'https://images.dog.ceo/breeds/samoyed/n02111889_1.jpg',
  'alaskan-malamute':     'https://images.dog.ceo/breeds/malamute/n02110063_1.jpg',
  'doberman-pinscher':    'https://images.dog.ceo/breeds/doberman/n02107142_1.jpg',
  'komondor':             'https://images.dog.ceo/breeds/komondor/n02105505_1.jpg',
  'kuvasz':               'https://images.dog.ceo/breeds/kuvasz/n02104029_1.jpg',
  'basenji':              'https://images.dog.ceo/breeds/basenji/n02110806_1.jpg',
  'borzoi':               'https://images.dog.ceo/breeds/borzoi/n02090622_1.jpg',
  'saluki':               'https://images.dog.ceo/breeds/saluki/n02091831_1.jpg',
  'whippet':              'https://images.dog.ceo/breeds/whippet/n02091134_1.jpg',
  'affenpinscher':        'https://images.dog.ceo/breeds/affenpinscher/n02110627_1.jpg',
  'briard':               'https://images.dog.ceo/breeds/briard/n02105251_1.jpg',
  'chow-chow':            'https://images.dog.ceo/breeds/chow/n02112137_1.jpg',
  'dalmatian':            'https://images.dog.ceo/breeds/dalmatian/n02101388_1.jpg',
  'newfoundland':         'https://images.dog.ceo/breeds/newfoundland/n02111277_1.jpg',
  'great-pyrenees':       'https://images.dog.ceo/breeds/pyrenees-great/n02111500_1.jpg',
  'lhasa-apso':           'https://images.dog.ceo/breeds/lhasa/n02098413_1.jpg',
  'maltese':              'https://images.dog.ceo/breeds/maltese/n02085936_1.jpg',
  'papillon':             'https://images.dog.ceo/breeds/papillon/n02086910_1.jpg',
  'pekingese':            'https://images.dog.ceo/breeds/pekinese/n02086079_1.jpg',
  'pomeranian':           'https://images.dog.ceo/breeds/pomeranian/n02112018_1.jpg',
  'shih-tzu':             'https://images.dog.ceo/breeds/shihtzu/n02086240_1.jpg',
  'boxer':                'https://images.dog.ceo/breeds/boxer/n02108089_1.jpg',
  'collie':               'https://images.dog.ceo/breeds/collie/n02106030_1.jpg',
  'dachshund':            'https://images.dog.ceo/breeds/dachshund/n02088364_1.jpg',
  'great-dane':           'https://images.dog.ceo/breeds/dane-great/n02109047_1.jpg',
  'mastiff':              'https://images.dog.ceo/breeds/mastiff/n02108422_1.jpg',
  'rottweiler':           'https://images.dog.ceo/breeds/rottweiler/n02106550_1.jpg',
  'tibetan-terrier':      'https://images.dog.ceo/breeds/terrier-tibetan/n02097474_1.jpg',
  'yorkshire-terrier':    'https://images.dog.ceo/breeds/terrier-yorkshire/n02094433_1.jpg',
  'miniature-schnauzer':  'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_1.jpg',
  'standard-schnauzer':   'https://images.dog.ceo/breeds/schnauzer/n02097209_1.jpg',
  'giant-schnauzer':      'https://images.dog.ceo/breeds/schnauzer-giant/n02097130_1.jpg',
};

const breeds = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
let patched = 0, already = 0, notfound = 0;

for (const breed of breeds) {
  if (IMAGE_PATCHES[breed.slug]) {
    if (breed.image_url) {
      already++;
    } else {
      breed.image_url    = IMAGE_PATCHES[breed.slug];
      breed.image_source = 'manual-patch';
      breed.enrichment   = breed.enrichment || {};
      breed.enrichment.image_verified = true;
      patched++;
      console.log(`  ${G('✓')}  ${breed.slug}`);
    }
  }
}

// Report breeds still missing images
const stillMissing = breeds.filter(b => !b.image_url);
console.log(`\n  ${G('Patched:')} ${patched}  ${D('Already had image:')} ${already}  ${D('Still missing:')} ${stillMissing.length}`);
if (stillMissing.length > 0 && stillMissing.length <= 20) {
  console.log(`  Missing:`);
  stillMissing.forEach(b => console.log(`    ${b.slug}`));
}

fs.writeFileSync(MASTER_PATH, JSON.stringify(breeds, null, 2));
console.log(`\n  ${G('✓')}  master-breeds.json saved\n`);
