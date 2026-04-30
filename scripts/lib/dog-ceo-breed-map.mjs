/**
 * scripts/lib/dog-ceo-breed-map.mjs
 *
 * Runtime Dog CEO resolver helpers.
 * Keep overrides intentionally small: the resolver first validates against
 * https://dog.ceo/api/breeds/list/all and can discover most breed/sub-breed
 * paths automatically.
 */

/**
 * Explicit site slug → Dog CEO API path overrides.
 * Path format:
 * - "beagle"
 * - "retriever/golden"
 * - "german/shepherd"
 */
export const DOG_CEO_OVERRIDES = {
  // Critical current fix
  'german-shepherd-dog': 'german/shepherd',
  'german-shepherd': 'german/shepherd',
  'bohemian-shepherd': 'german/shepherd',
  'czechoslovakian-vlcak': 'german/shepherd',

  // Common retrievers
  'golden-retriever': 'retriever/golden',
  'labrador-retriever': 'retriever/labrador',
  'chesapeake-bay-retriever': 'retriever/chesapeake',
  'curly-coated-retriever': 'retriever/curly',
  'flat-coated-retriever': 'retriever/flatcoated',
  'nova-scotia-duck-tolling-retriever': 'retriever/golden',

  // Hounds
  'afghan-hound': 'hound/afghan',
  'basset-hound': 'hound/basset',
  'bloodhound': 'hound/blood',
  'english-foxhound': 'hound/english',
  'american-foxhound': 'hound/english',
  'ibizan-hound': 'hound/ibizan',
  'plott-hound': 'hound/plott',
  'treeing-walker-coonhound': 'hound/walker',
  'black-and-tan-coonhound': 'hound/walker',
  'redbone-coonhound': 'redbone',
  'bluetick-coonhound': 'bluetick',
  'rhodesian-ridgeback': 'ridgeback/rhodesian',
  'irish-wolfhound': 'wolfhound/irish',
  'italian-greyhound': 'greyhound/italian',
  'scottish-deerhound': 'deerhound/scottish',
  'norwegian-elkhound': 'elkhound/norwegian',

  // Herding
  'australian-shepherd': 'australian/shepherd',
  'australian-cattle-dog': 'cattledog/australian',
  'australian-kelpie': 'australian/kelpie',
  'working-kelpie': 'kelpie',
  'border-collie': 'collie/border',
  'rough-collie': 'rough/collie',
  'old-english-sheepdog': 'sheepdog/english',
  'shetland-sheepdog': 'sheepdog/shetland',
  'belgian-malinois': 'malinois',
  'belgian-tervuren': 'tervuren',
  'belgian-sheepdog': 'groenendael',
  'bouvier-des-flandres': 'bouvier',
  'briard': 'briard',
  'cardigan-welsh-corgi': 'corgi/cardigan',
  'pembroke-welsh-corgi': 'pembroke',
  'entlebucher-mountain-dog': 'entlebucher',
  'appenzeller-sennenhund': 'appenzeller',

  // Mountain / working
  'bernese-mountain-dog': 'mountain/bernese',
  'greater-swiss-mountain-dog': 'mountain/swiss',
  'saint-bernard': 'stbernard',
  'st-bernard': 'stbernard',
  'great-dane': 'dane/great',
  'great-pyrenees': 'pyrenees',
  'alaskan-malamute': 'malamute',
  'siberian-husky': 'husky',
  'doberman-pinscher': 'doberman',
  'miniature-pinscher': 'pinscher/miniature',
  'bullmastiff': 'mastiff/bull',
  'bull-mastiff': 'mastiff/bull',
  'english-mastiff': 'mastiff/english',
  'tibetan-mastiff': 'mastiff/tibetan',
  'caucasian-shepherd-dog': 'ovcharka/caucasian',
  'spanish-water-dog': 'waterdog/spanish',
  'portuguese-water-dog': 'waterdog/spanish',

  // Poodles / doodles
  'standard-poodle': 'poodle/standard',
  'poodle-standard': 'poodle/standard',
  'miniature-poodle': 'poodle/miniature',
  'poodle-miniature': 'poodle/miniature',
  'toy-poodle': 'poodle/toy',
  'poodle-toy': 'poodle/toy',
  'goldendoodle': 'labradoodle',
  'labradoodle': 'labradoodle',
  'cockapoo': 'cockapoo',
  'cavapoo': 'cavapoo',
  'puggle': 'puggle',

  // Bulldogs / companion
  'bulldog': 'bulldog/english',
  'english-bulldog': 'bulldog/english',
  'french-bulldog': 'bulldog/french',
  'boston-terrier': 'terrier/boston',
  'shih-tzu': 'shihtzu',
  'lhasa-apso': 'lhasa',
  'coton-de-tulear': 'cotondetulear',
  'brussels-griffon': 'brabancon',
  'pekingese': 'pekinese',
  'xoloitzcuintli': 'mexicanhairless',
  'mexican-hairless': 'mexicanhairless',
  'bichon-frise': 'frise/bichon',

  // Spaniels / setters / pointers
  'cavalier-king-charles-spaniel': 'spaniel/blenheim',
  'english-toy-spaniel': 'spaniel/blenheim',
  'japanese-chin': 'spaniel/japanese',
  'brittany': 'spaniel/brittany',
  'cocker-spaniel': 'spaniel/cocker',
  'english-cocker-spaniel': 'spaniel/cocker',
  'irish-water-spaniel': 'spaniel/irish',
  'welsh-springer-spaniel': 'spaniel/welsh',
  'english-springer-spaniel': 'springer/english',
  'sussex-spaniel': 'spaniel/sussex',
  'clumber-spaniel': 'clumber',
  'english-setter': 'setter/english',
  'gordon-setter': 'setter/gordon',
  'irish-setter': 'setter/irish',
  'german-shorthaired-pointer': 'pointer/german',
  'german-wirehaired-pointer': 'pointer/german',
  'german-longhaired-pointer': 'pointer/germanlonghair',

  // Terriers
  'airedale-terrier': 'airedale',
  'american-staffordshire-terrier': 'bullterrier/staffordshire',
  'staffordshire-bull-terrier': 'bullterrier/staffordshire',
  'australian-terrier': 'terrier/australian',
  'bedlington-terrier': 'terrier/bedlington',
  'border-terrier': 'terrier/border',
  'cairn-terrier': 'terrier/cairn',
  'dandie-dinmont-terrier': 'terrier/dandie',
  'fox-terrier': 'terrier/fox',
  'irish-terrier': 'terrier/irish',
  'kerry-blue-terrier': 'terrier/kerryblue',
  'lakeland-terrier': 'terrier/lakeland',
  'norfolk-terrier': 'terrier/norfolk',
  'norwich-terrier': 'terrier/norwich',
  'parson-russell-terrier': 'terrier/russell',
  'russell-terrier': 'terrier/russell',
  'scottish-terrier': 'terrier/scottish',
  'sealyham-terrier': 'terrier/sealyham',
  'silky-terrier': 'terrier/silky',
  'soft-coated-wheaten-terrier': 'terrier/wheaten',
  'tibetan-terrier': 'terrier/tibetan',
  'toy-fox-terrier': 'terrier/toy',
  'welsh-terrier': 'terrier/welsh',
  'west-highland-white-terrier': 'terrier/westhighland',
  'yorkshire-terrier': 'terrier/yorkshire',

  // Spitz / misc
  'american-eskimo-dog': 'eskimo',
  'chow-chow': 'chow',
  'shiba-inu': 'shiba',
  'japanese-spitz': 'spitz/japanese',
  'finnish-lapphund': 'finnish/lapphund',
  'norwegian-buhund': 'buhund/norwegian',
};

export function normalizeBreedKey(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\band\b/g, '')
    .replace(/\bdog\b/g, '')
    .replace(/\bstandard\b/g, '')
    .replace(/\bminiature\b/g, 'miniature')
    .replace(/\btoy\b/g, 'toy')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function compactKey(value = '') {
  return normalizeBreedKey(value).replace(/-/g, '');
}

export function splitTokens(value = '') {
  return normalizeBreedKey(value)
    .split('-')
    .filter(Boolean)
    .filter((token) => token !== 'dog');
}

export function isValidDogCeoPath(path, breedList) {
  if (!path || !breedList) return false;

  const [breed, sub] = String(path).split('/');

  if (!sub) {
    return Object.prototype.hasOwnProperty.call(breedList, breed);
  }

  return Array.isArray(breedList[breed]) && breedList[breed].includes(sub);
}

export function resolveDogCeoPath({ slug = '', name = '' }, breedList) {
  const normalizedSlug = normalizeBreedKey(slug);
  const normalizedName = normalizeBreedKey(name);

  const override = DOG_CEO_OVERRIDES[normalizedSlug] || DOG_CEO_OVERRIDES[normalizedName];

  if (override && isValidDogCeoPath(override, breedList)) {
    return override;
  }

  const tokens = new Set([...splitTokens(slug), ...splitTokens(name)]);
  const compactSlug = compactKey(slug);
  const compactName = compactKey(name);

  // Exact compact breed match, e.g. "shihtzu", "cotondetulear".
  for (const breed of Object.keys(breedList)) {
    if (compactSlug === breed || compactName === breed) return breed;
  }

  // Token contains direct breed, e.g. "great-pyrenees" → "pyrenees".
  for (const breed of Object.keys(breedList)) {
    if (tokens.has(breed) && (!breedList[breed] || breedList[breed].length === 0)) {
      return breed;
    }
  }

  // Discover parent/sub-breed pair, e.g. german + shepherd → german/shepherd,
  // retriever + golden → retriever/golden, hound + afghan → hound/afghan.
  for (const [breed, subBreeds] of Object.entries(breedList)) {
    if (!Array.isArray(subBreeds) || subBreeds.length === 0) continue;

    for (const sub of subBreeds) {
      const subTokens = String(sub).split(/[^a-z0-9]+/).filter(Boolean);
      const hasParent = tokens.has(breed);
      const hasSub = subTokens.every((token) => tokens.has(token)) || tokens.has(sub);

      if (hasParent && hasSub) {
        return `${breed}/${sub}`;
      }
    }
  }

  // Last fallback: if the name contains a known parent+sub in any order.
  const combined = `${compactSlug} ${compactName}`.replace(/\s+/g, '');
  for (const [breed, subBreeds] of Object.entries(breedList)) {
    if (!Array.isArray(subBreeds)) continue;

    for (const sub of subBreeds) {
      if (combined.includes(`${sub}${breed}`) || combined.includes(`${breed}${sub}`)) {
        return `${breed}/${sub}`;
      }
    }
  }

  return null;
}

export function buildDogCeoRandomImagesUrl(path, count = 5) {
  const [breed, sub] = String(path).split('/');
  const safeCount = Math.max(1, Math.min(Number(count) || 5, 10));

  return sub
    ? `https://dog.ceo/api/breed/${breed}/${sub}/images/random/${safeCount}`
    : `https://dog.ceo/api/breed/${breed}/images/random/${safeCount}`;
}
