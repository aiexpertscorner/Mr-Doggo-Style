/**
 * src/lib/breeds/normalizeBreed.ts
 *
 * Canonical breed normalization layer for PupWiki.
 *
 * Purpose:
 * - Convert raw master-breeds / master-crossbreeds records into one stable shape.
 * - Make breed search, filtering, cards, guide links and SEO sections resilient.
 * - Centralize field-name fallbacks so Astro pages do not depend on fragile raw data keys.
 *
 * Designed for static Astro pages: no browser APIs, no external dependencies.
 */

export type BreedType = 'purebred' | 'mixed';
export type BreedSizeKey = 'small' | 'medium' | 'large' | 'giant' | 'unknown';
export type BreedEnergyKey = 'calm' | 'regular' | 'active' | 'unknown';
export type BreedSheddingKey = 'minimal' | 'low' | 'seasonal' | 'heavy' | 'unknown';
export type BreedTrainingKey = 'easy' | 'moderate' | 'difficult' | 'unknown';
export type BreedCoatKey =
  | 'short'
  | 'medium'
  | 'long'
  | 'double'
  | 'silky'
  | 'wiry'
  | 'wavy'
  | 'curly'
  | 'rough'
  | 'corded'
  | 'hairless'
  | 'unknown';

export type BreedGuideKey =
  | 'profile'
  | 'cost'
  | 'food'
  | 'toys'
  | 'health'
  | 'training'
  | 'grooming'
  | 'beds'
  | 'supplements'
  | 'names';

export type BreedRawRecord = Record<string, any>;

export interface BreedRange {
  min: number | null;
  max: number | null;
  label: string | null;
}

export interface BreedFacetValue<T extends string = string> {
  key: T;
  label: string;
  raw: string | null;
}

export interface BreedImageCandidate {
  url: string;
  source: string;
  role?: string;
}

export interface BreedGuideLink {
  key: BreedGuideKey;
  label: string;
  href: string;
  available: boolean;
  monetizable: boolean;
}

export interface BreedGuideAvailability {
  profile: boolean;
  cost: boolean;
  food: boolean;
  toys: boolean;
  health: boolean;
  training: boolean;
  grooming: boolean;
  beds: boolean;
  supplements: boolean;
  names: boolean;
}

export interface NormalizedBreed {
  raw: BreedRawRecord;
  id: string;
  slug: string;
  name: string;
  displayName: string;
  type: BreedType;
  isCrossbreed: boolean;
  parentBreeds: { name: string; slug?: string }[];

  size: BreedFacetValue<BreedSizeKey>;
  energy: BreedFacetValue<BreedEnergyKey>;
  shedding: BreedFacetValue<BreedSheddingKey>;
  training: BreedFacetValue<BreedTrainingKey>;
  coat: BreedFacetValue<BreedCoatKey>;
  group: BreedFacetValue;
  origin: BreedFacetValue;

  popularityRank: number;
  intelligenceRank: number | null;
  ownerDifficulty: number | null;
  weight: BreedRange;
  height: BreedRange;
  lifespan: BreedRange & { mid: number | null; bucket: string };

  temperament: string;
  description: string;
  aliases: string[];
  dominantTraits: string[];

  images: BreedImageCandidate[];
  primaryImage: string;
  fallbackEmoji: string;
  imageAlt: string;

  guideAvailability: BreedGuideAvailability;
  guideLinks: BreedGuideLink[];
  monetizationTags: string[];
  searchText: string;

  flags: {
    isSmall: boolean;
    isLarge: boolean;
    isGiant: boolean;
    isCalm: boolean;
    isActive: boolean;
    isLowShedding: boolean;
    isEasyToTrain: boolean;
    isHardToTrain: boolean;
    isApartmentFriendly: boolean;
    isWorkingHeritage: boolean;
    isLongLiving: boolean;
    hasHealthContext: boolean;
    hasCostCalculator: boolean;
    hasFoodGuide: boolean;
    hasHealthGuide: boolean;
    hasTrainingGuide: boolean;
    hasMonetizableGuides: boolean;
  };
}

export interface NormalizeBreedOptions {
  breedLinkMap?: Record<string, Record<string, string | boolean | null | undefined>>;
  contentStatus?: Record<string, Record<string, boolean | string | null | undefined>>;
  siteUrl?: string;
}

export const BREED_SIZE_LABELS: Record<BreedSizeKey, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  giant: 'Giant',
  unknown: 'Unknown',
};

export const BREED_ENERGY_LABELS: Record<BreedEnergyKey, string> = {
  calm: 'Calm',
  regular: 'Regular',
  active: 'Active',
  unknown: 'Unknown',
};

export const BREED_SHEDDING_LABELS: Record<BreedSheddingKey, string> = {
  minimal: 'Minimal',
  low: 'Low',
  seasonal: 'Seasonal',
  heavy: 'Heavy',
  unknown: 'Unknown',
};

export const BREED_TRAINING_LABELS: Record<BreedTrainingKey, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  difficult: 'Hard',
  unknown: 'Unknown',
};

export const BREED_COAT_LABELS: Record<BreedCoatKey, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  double: 'Double',
  silky: 'Silky',
  wiry: 'Wiry',
  wavy: 'Wavy',
  curly: 'Curly',
  rough: 'Rough',
  corded: 'Corded',
  hairless: 'Hairless',
  unknown: 'Unknown',
};

export const BREED_GROUPS = [
  { key: 'herding', label: 'Herding', emoji: '🐑' },
  { key: 'hound', label: 'Hound', emoji: '🐕' },
  { key: 'sporting', label: 'Sporting', emoji: '🦆' },
  { key: 'non-sporting', label: 'Non-Sporting', emoji: '🏠' },
  { key: 'terrier', label: 'Terrier', emoji: '🦊' },
  { key: 'toy', label: 'Toy', emoji: '🧸' },
  { key: 'working', label: 'Working', emoji: '💪' },
  { key: 'fss', label: 'FSS', emoji: '📋' },
  { key: 'misc', label: 'Misc.', emoji: '✨' },
] as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  germany: '🇩🇪',
  'united-kingdom': '🇬🇧',
  england: '🇬🇧',
  scotland: '🏴',
  france: '🇫🇷',
  'united-states': '🇺🇸',
  switzerland: '🇨🇭',
  china: '🇨🇳',
  japan: '🇯🇵',
  ireland: '🇮🇪',
  netherlands: '🇳🇱',
  russia: '🇷🇺',
  australia: '🇦🇺',
  belgium: '🇧🇪',
  italy: '🇮🇹',
  spain: '🇪🇸',
  canada: '🇨🇦',
  zimbabwe: '🇿🇼',
  mexico: '🇲🇽',
  norway: '🇳🇴',
  sweden: '🇸🇪',
  finland: '🇫🇮',
  denmark: '🇩🇰',
  portugal: '🇵🇹',
  turkey: '🇹🇷',
  tibet: '🏔️',
};

const GUIDE_CONFIG: Record<Exclude<BreedGuideKey, 'profile' | 'cost'>, { linkKey: string; label: string; monetizable: boolean }> = {
  food: { linkKey: 'food_post', label: 'Food guide', monetizable: true },
  toys: { linkKey: 'toy_post', label: 'Toy guide', monetizable: true },
  health: { linkKey: 'health_post', label: 'Health guide', monetizable: true },
  training: { linkKey: 'training_post', label: 'Training guide', monetizable: true },
  grooming: { linkKey: 'grooming_post', label: 'Grooming guide', monetizable: true },
  beds: { linkKey: 'bed_post', label: 'Bed guide', monetizable: true },
  supplements: { linkKey: 'supplement_post', label: 'Supplement guide', monetizable: true },
  names: { linkKey: 'names_page', label: 'Name ideas', monetizable: false },
};

export function slugify(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeForSearch(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleCase(value: unknown): string {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function compact<T>(items: T[]): NonNullable<T>[] {
  return items.filter(Boolean) as NonNullable<T>[];
}

function uniqueStrings(items: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const value = String(item ?? '').trim();
    if (!value) continue;
    const key = normalizeForSearch(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeSize(value: unknown): BreedSizeKey {
  const key = slugify(value);
  if (!key) return 'unknown';
  if (key.includes('giant') || key.includes('xlarge') || key.includes('extra-large') || key.includes('xl')) return 'giant';
  if (key.includes('large')) return 'large';
  if (key.includes('small') || key.includes('toy') || key.includes('miniature')) return 'small';
  if (key.includes('medium') || key.includes('midsize') || key.includes('mid-size')) return 'medium';
  return 'unknown';
}

function normalizeEnergy(value: unknown): BreedEnergyKey {
  const key = slugify(value);
  if (!key) return 'unknown';
  if (['active', 'high', 'very-active', 'energetic', 'athletic'].some((term) => key.includes(term))) return 'active';
  if (['calm', 'low', 'lazy', 'relaxed'].some((term) => key.includes(term))) return 'calm';
  if (['regular', 'moderate', 'medium', 'average'].some((term) => key.includes(term))) return 'regular';
  return 'unknown';
}

function normalizeShedding(value: unknown): BreedSheddingKey {
  const key = slugify(value);
  if (!key) return 'unknown';
  if (['heavy', 'high', 'constant'].some((term) => key.includes(term))) return 'heavy';
  if (['seasonal', 'moderate', 'medium'].some((term) => key.includes(term))) return 'seasonal';
  if (['minimal', 'none', 'very-low'].some((term) => key.includes(term))) return 'minimal';
  if (['low', 'light'].some((term) => key.includes(term))) return 'low';
  return 'unknown';
}

function normalizeTraining(value: unknown): BreedTrainingKey {
  const key = slugify(value);
  if (!key) return 'unknown';
  if (['easy', 'eager', 'high', 'highly-trainable'].some((term) => key.includes(term))) return 'easy';
  if (['difficult', 'hard', 'stubborn', 'challenging', 'independent'].some((term) => key.includes(term))) return 'difficult';
  if (['moderate', 'medium', 'regular', 'average'].some((term) => key.includes(term))) return 'moderate';
  return 'unknown';
}

function normalizeCoat(value: unknown): BreedCoatKey {
  const key = slugify(value);
  if (!key) return 'unknown';
  if (key.includes('hairless')) return 'hairless';
  if (key.includes('corded')) return 'corded';
  if (key.includes('curly')) return 'curly';
  if (key.includes('wavy')) return 'wavy';
  if (key.includes('wiry') || key.includes('wire')) return 'wiry';
  if (key.includes('silky')) return 'silky';
  if (key.includes('double')) return 'double';
  if (key.includes('rough')) return 'rough';
  if (key.includes('long')) return 'long';
  if (key.includes('short') || key.includes('smooth')) return 'short';
  if (key.includes('medium')) return 'medium';
  return 'unknown';
}

export function normalizeGroup(value: unknown): string {
  const raw = String(value ?? '').trim();
  const key = slugify(raw)
    .replace(/-group$/, '')
    .replace(/-class$/, '')
    .replace(/-service$/, '')
    .replace('foundation-stock', 'fss')
    .replace('miscellaneous', 'misc');

  if (!key) return 'unknown';
  if (key.includes('non-sporting')) return 'non-sporting';
  if (key.includes('sporting')) return 'sporting';
  if (key.includes('herding')) return 'herding';
  if (key.includes('hound')) return 'hound';
  if (key.includes('terrier')) return 'terrier';
  if (key.includes('toy')) return 'toy';
  if (key.includes('working')) return 'working';
  if (key.includes('fss') || key.includes('foundation')) return 'fss';
  if (key.includes('misc')) return 'misc';
  return key;
}

function groupLabel(key: string, raw: string | null): string {
  const known = BREED_GROUPS.find((group) => group.key === key);
  if (known) return known.label;
  if (raw) return raw.replace(/ Group| Class| Service/g, '').trim();
  return 'Unknown';
}

function getRange(raw: BreedRawRecord, path: string, aliases: string[]): BreedRange {
  const source = raw[path] || {};
  const min = toNumber(source.min ?? source.min_lbs ?? source.min_in ?? source.min_years ?? aliases.map((key) => raw[key]).find((v) => v !== undefined));
  const max = toNumber(source.max ?? source.max_lbs ?? source.max_in ?? source.max_years ?? aliases.map((key) => raw[key]).find((v) => v !== undefined));

  let label: string | null = null;
  if (min !== null && max !== null) label = min === max ? `${min}` : `${min}–${max}`;
  else if (min !== null) label = `${min}+`;
  else if (max !== null) label = `up to ${max}`;

  return { min, max, label };
}

function getWeightRange(raw: BreedRawRecord): BreedRange {
  const range = getRange(raw, 'weight', ['weight_min_lbs', 'min_weight_lbs', 'weight_max_lbs', 'max_weight_lbs']);
  return { ...range, label: range.label ? `${range.label} lbs` : null };
}

function getHeightRange(raw: BreedRawRecord): BreedRange {
  const range = getRange(raw, 'height', ['height_min_in', 'min_height_in', 'height_max_in', 'max_height_in']);
  return { ...range, label: range.label ? `${range.label} in` : null };
}

function getLifespanRange(raw: BreedRawRecord): BreedRange & { mid: number | null; bucket: string } {
  const life = raw.life_expectancy || {};
  const rank = raw.ranking_data || {};
  const rankLongevity = toNumber(rank.longevity_years);
  const min = rankLongevity ?? toNumber(life.min ?? life.min_years ?? raw.life_min ?? raw.min_life_years);
  const max = rankLongevity ?? toNumber(life.max ?? life.max_years ?? raw.life_max ?? raw.max_life_years);
  const mid = min !== null && max !== null ? (min + max) / 2 : min ?? max;

  let label: string | null = null;
  if (rankLongevity !== null) label = `${rankLongevity} yrs avg`;
  else if (min !== null && max !== null) label = `${min}–${max} yrs`;
  else if (max !== null) label = `up to ${max} yrs`;
  else if (min !== null) label = `${min}+ yrs`;

  let bucket = 'unknown';
  if (mid !== null) {
    if (mid < 10) bucket = 'lt10';
    else if (mid <= 12) bucket = '10-12';
    else if (mid <= 14) bucket = '12-14';
    else bucket = 'gt14';
  }

  return { min, max, mid, label, bucket };
}

function collectImageCandidates(raw: BreedRawRecord): BreedImageCandidate[] {
  const candidates: BreedImageCandidate[] = [];
  const seen = new Set<string>();

  const add = (value: unknown, source: string, role?: string) => {
    let url = '';
    if (typeof value === 'string') url = value;
    else if (value && typeof value === 'object') {
      const item = value as Record<string, any>;
      url = item.url || item.image_url || item.src || item.href || '';
    }

    if (!/^https?:\/\//.test(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    candidates.push({ url, source, role });
  };

  add(raw.image_url, 'image_url', 'primary');
  add(raw.main_image, 'main_image', 'primary');
  add(raw.photoURL, 'photoURL', 'primary');

  if (Array.isArray(raw.image_urls)) raw.image_urls.forEach((url: unknown) => add(url, 'image_urls', 'gallery'));
  if (Array.isArray(raw.images)) raw.images.forEach((url: unknown) => add(url, 'images', 'gallery'));
  if (Array.isArray(raw.image_gallery)) raw.image_gallery.forEach((item: unknown) => add(item, 'image_gallery', 'gallery'));
  if (Array.isArray(raw.image_url_candidates)) raw.image_url_candidates.forEach((item: unknown) => add(item, 'image_url_candidates', 'candidate'));

  add(raw.image_url_parent_1, 'image_url_parent_1', 'parent');
  add(raw.image_url_parent_2, 'image_url_parent_2', 'parent');

  return candidates;
}

function parseParentBreeds(raw: BreedRawRecord): { name: string; slug?: string }[] {
  const parents = Array.isArray(raw.parent_breeds) ? raw.parent_breeds : [];
  const parsed = parents
    .map((parent: any) => {
      if (typeof parent === 'string') return { name: parent, slug: slugify(parent) };
      if (!parent) return null;
      const name = parent.name || parent.label || parent.breed || '';
      if (!name) return null;
      return { name: String(name), slug: parent.slug || slugify(name) };
    })
    .filter(Boolean) as { name: string; slug?: string }[];

  return parsed;
}

function parseTraits(raw: BreedRawRecord): string[] {
  const fromArray = Array.isArray(raw.dominant_traits) ? raw.dominant_traits : [];
  const temperament = String(raw.temperament || raw.personality || '').split(',');
  const traits = uniqueStrings([...fromArray, ...temperament]);
  return traits.slice(0, 6);
}

function sizeEmoji(size: BreedSizeKey): string {
  return { small: '🐕', medium: '🐕‍🦺', large: '🐕‍🦺', giant: '🦮', unknown: '🐾' }[size];
}

function guideHref(slug: string, links: Record<string, any>, linkKey: string, fallback: string): string {
  const mapped = links?.[linkKey];
  return typeof mapped === 'string' && mapped.startsWith('/') ? mapped : fallback;
}

function getGuideLinks(slug: string, options: NormalizeBreedOptions): BreedGuideLink[] {
  const links = options.breedLinkMap?.[slug] ?? {};
  const status = options.contentStatus?.[slug] ?? {};

  const out: BreedGuideLink[] = [
    { key: 'profile', label: 'Breed profile', href: `/breeds/${slug}`, available: true, monetizable: false },
    { key: 'cost', label: 'Cost calculator', href: `/cost-calculator/${slug}`, available: true, monetizable: true },
  ];

  for (const [key, config] of Object.entries(GUIDE_CONFIG) as [Exclude<BreedGuideKey, 'profile' | 'cost'>, (typeof GUIDE_CONFIG)[Exclude<BreedGuideKey, 'profile' | 'cost'>]][]) {
    const available = Boolean(status?.[config.linkKey] || links?.[config.linkKey]);
    out.push({
      key,
      label: config.label,
      href: guideHref(slug, links, config.linkKey, `/breeds/${slug}`),
      available,
      monetizable: config.monetizable,
    });
  }

  return out;
}

function getGuideAvailability(links: BreedGuideLink[]): BreedGuideAvailability {
  const value: BreedGuideAvailability = {
    profile: true,
    cost: true,
    food: false,
    toys: false,
    health: false,
    training: false,
    grooming: false,
    beds: false,
    supplements: false,
    names: false,
  };

  for (const link of links) value[link.key] = link.available;
  return value;
}

function isWorkingHeritage(groupKey: string): boolean {
  return ['sporting', 'herding', 'working', 'hound', 'terrier'].includes(groupKey);
}

function getOwnerDifficulty(raw: BreedRawRecord, energy: BreedEnergyKey, training: BreedTrainingKey, coat: BreedCoatKey, shedding: BreedSheddingKey): number | null {
  const explicit = toNumber(raw.owner_difficulty ?? raw.profile?.owner_difficulty);
  if (explicit !== null) return Math.max(1, Math.min(10, Math.round(explicit)));

  const energyScore = { active: 4, regular: 2, calm: 1, unknown: 2 }[energy];
  const trainingScore = { difficult: 3, moderate: 2, easy: 1, unknown: 2 }[training];
  const coatScore: Record<BreedCoatKey, number> = {
    short: 0,
    hairless: 1,
    medium: 1,
    double: 2,
    wavy: 2,
    silky: 2,
    long: 2,
    rough: 2,
    wiry: 3,
    curly: 3,
    corded: 3,
    unknown: 1,
  };
  const sheddingScore = { heavy: 2, seasonal: 1, low: 0, minimal: 0, unknown: 1 }[shedding];

  return Math.max(1, Math.min(10, Math.round(((energyScore + trainingScore + coatScore[coat] + sheddingScore) / 12) * 10)));
}

function getAliases(raw: BreedRawRecord, parents: { name: string; slug?: string }[]): string[] {
  const explicit = compact([
    raw.alias,
    raw.alternate_name,
    raw.alternative_name,
    raw.common_name,
    ...(Array.isArray(raw.aliases) ? raw.aliases : []),
    ...(Array.isArray(raw.alternate_names) ? raw.alternate_names : []),
    ...(Array.isArray(raw.other_names) ? raw.other_names : []),
  ]);

  const parentNames = parents.map((parent) => parent.name);
  return uniqueStrings([...explicit, ...parentNames]);
}

function buildSearchText(parts: unknown[]): string {
  return normalizeForSearch(uniqueStrings(parts.flatMap((part) => {
    if (Array.isArray(part)) return part;
    return [part];
  })).join(' '));
}

function getMonetizationTags(breed: NormalizedBreed): string[] {
  const tags = uniqueStrings([
    'breed',
    'dog-owner',
    breed.slug,
    breed.name,
    breed.type,
    breed.size.key,
    breed.energy.key,
    breed.coat.key,
    breed.group.key,
    breed.shedding.key,
    breed.training.key,
    breed.flags.isLowShedding ? 'low-shedding' : null,
    breed.flags.isEasyToTrain ? 'easy-training' : null,
    breed.flags.isActive ? 'active-dog' : null,
    breed.flags.isApartmentFriendly ? 'apartment' : null,
    breed.guideAvailability.food ? 'food' : null,
    breed.guideAvailability.health ? 'health' : null,
    breed.guideAvailability.training ? 'training' : null,
    breed.guideAvailability.grooming ? 'grooming' : null,
    breed.guideAvailability.beds ? 'beds' : null,
    breed.guideAvailability.supplements ? 'supplements' : null,
  ]);

  return tags.map(slugify).filter(Boolean);
}

export function normalizeBreed(raw: BreedRawRecord, options: NormalizeBreedOptions = {}): NormalizedBreed {
  const name = firstString(raw.name, raw.breed_name, raw.title) || 'Unknown breed';
  const slug = firstString(raw.slug, raw.id, slugify(name)) || slugify(name);
  const parentBreeds = parseParentBreeds(raw);
  const isCrossbreed = parentBreeds.length > 0 || Boolean(raw.is_crossbreed || raw.is_mixed_breed || raw.is_poodle_mix || raw.type === 'mixed');
  const type: BreedType = isCrossbreed ? 'mixed' : 'purebred';

  const sizeKey = normalizeSize(raw.size_category ?? raw.size ?? raw.sizeCategory);
  const energyKey = normalizeEnergy(raw.energy_level ?? raw.energy ?? raw.activity_level ?? raw.activityLevel);
  const sheddingKey = normalizeShedding(raw.shedding_level ?? raw.shedding ?? raw.sheddingLevel);
  const trainingKey = normalizeTraining(raw.training_level ?? raw.trainability ?? raw.training ?? raw.trainingLevel);
  const coatKey = normalizeCoat(raw.coat_type ?? raw.coat ?? raw.coatType);

  const rawGroup = firstString(raw.akc_group, raw.group, raw.breed_group, raw.fci_group_name);
  const groupKey = normalizeGroup(rawGroup);

  const rawOrigin = firstString(raw.origin_country, raw.country_of_origin, raw.origin, raw.originCountry);
  const originKey = rawOrigin ? slugify(rawOrigin) : 'unknown';

  const weight = getWeightRange(raw);
  const height = getHeightRange(raw);
  const lifespan = getLifespanRange(raw);
  const images = collectImageCandidates(raw);
  const guideLinks = getGuideLinks(slug, options);
  const guideAvailability = getGuideAvailability(guideLinks);
  const aliases = getAliases(raw, parentBreeds);
  const dominantTraits = parseTraits(raw);
  const popularityRank = toNumber(raw.akc_popularity ?? raw.popularity_rank ?? raw.ranking_data?.popularity_rank) ?? 9999;
  const intelligenceRank = toNumber(raw.ranking_data?.intelligence_rank ?? raw.intelligence_rank);
  const ownerDifficulty = getOwnerDifficulty(raw, energyKey, trainingKey, coatKey, sheddingKey);

  const size = { key: sizeKey, label: BREED_SIZE_LABELS[sizeKey], raw: firstString(raw.size_category, raw.size, raw.sizeCategory) };
  const energy = { key: energyKey, label: BREED_ENERGY_LABELS[energyKey], raw: firstString(raw.energy_level, raw.energy, raw.activity_level) };
  const shedding = { key: sheddingKey, label: BREED_SHEDDING_LABELS[sheddingKey], raw: firstString(raw.shedding_level, raw.shedding) };
  const training = { key: trainingKey, label: BREED_TRAINING_LABELS[trainingKey], raw: firstString(raw.training_level, raw.trainability, raw.training) };
  const coat = { key: coatKey, label: BREED_COAT_LABELS[coatKey], raw: firstString(raw.coat_type, raw.coat, raw.coatType) };
  const group = { key: groupKey, label: groupLabel(groupKey, rawGroup), raw: rawGroup };
  const origin = { key: originKey, label: rawOrigin || 'Unknown', raw: rawOrigin };

  const flagsBase = {
    isSmall: sizeKey === 'small',
    isLarge: sizeKey === 'large' || sizeKey === 'giant',
    isGiant: sizeKey === 'giant',
    isCalm: energyKey === 'calm',
    isActive: energyKey === 'active',
    isLowShedding: sheddingKey === 'minimal' || sheddingKey === 'low',
    isEasyToTrain: trainingKey === 'easy',
    isHardToTrain: trainingKey === 'difficult',
    isWorkingHeritage: isWorkingHeritage(groupKey),
    isLongLiving: (lifespan.mid ?? 0) >= 14,
    hasHealthContext: Boolean(raw.ranking_data?.genetic_ailment_names && raw.ranking_data.genetic_ailment_names !== 'none') || guideAvailability.health,
    hasCostCalculator: true,
    hasFoodGuide: guideAvailability.food,
    hasHealthGuide: guideAvailability.health,
    hasTrainingGuide: guideAvailability.training,
  };

  const flags = {
    ...flagsBase,
    isApartmentFriendly: sizeKey !== 'giant' && !(sizeKey === 'large' && energyKey === 'active'),
    hasMonetizableGuides: guideLinks.some((link) => link.available && link.monetizable),
  };

  const normalized: NormalizedBreed = {
    raw,
    id: slug,
    slug,
    name,
    displayName: name,
    type,
    isCrossbreed,
    parentBreeds,
    size,
    energy,
    shedding,
    training,
    coat,
    group,
    origin,
    popularityRank,
    intelligenceRank,
    ownerDifficulty,
    weight,
    height,
    lifespan,
    temperament: firstString(raw.temperament, raw.personality) || '',
    description: firstString(raw.description, raw.summary, raw.overview) || '',
    aliases,
    dominantTraits,
    images,
    primaryImage: images[0]?.url || '',
    fallbackEmoji: sizeEmoji(sizeKey),
    imageAlt: firstString(raw.image_alt, raw.alt) || `${name} dog breed`,
    guideAvailability,
    guideLinks,
    monetizationTags: [],
    searchText: '',
    flags,
  };

  normalized.monetizationTags = getMonetizationTags(normalized);
  normalized.searchText = buildSearchText([
    normalized.name,
    normalized.slug,
    normalized.aliases,
    normalized.parentBreeds.map((parent) => parent.name),
    normalized.type,
    normalized.size.label,
    normalized.energy.label,
    normalized.shedding.label,
    normalized.training.label,
    normalized.coat.label,
    normalized.group.label,
    normalized.origin.label,
    normalized.temperament,
    normalized.description,
    normalized.dominantTraits,
    raw.akc_group,
    raw.fci_group_name,
    flags.isApartmentFriendly ? 'apartment friendly urban city' : '',
    flags.isLowShedding ? 'low shedding hypoallergenic allergy friendly' : '',
    flags.isEasyToTrain ? 'easy to train beginner first time owner' : '',
    flags.isActive ? 'active energetic running hiking outdoors' : '',
    flags.isCalm ? 'calm relaxed low energy' : '',
    guideAvailability.food ? 'food nutrition feeding' : '',
    guideAvailability.health ? 'health wellness vet insurance' : '',
    guideAvailability.training ? 'training obedience behavior' : '',
    guideAvailability.grooming ? 'grooming coat brush shampoo' : '',
  ]);

  return normalized;
}

export function normalizeBreedList(records: BreedRawRecord[], options: NormalizeBreedOptions = {}): NormalizedBreed[] {
  const seen = new Set<string>();
  const normalized: NormalizedBreed[] = [];

  for (const record of records || []) {
    if (!record) continue;
    const breed = normalizeBreed(record, options);
    if (!breed.slug || seen.has(breed.slug)) continue;
    seen.add(breed.slug);
    normalized.push(breed);
  }

  return normalized;
}

export function serializeBreedForClient(breed: NormalizedBreed) {
  return {
    slug: breed.slug,
    name: breed.name,
    type: breed.type,
    size: breed.size.key,
    energy: breed.energy.key,
    shedding: breed.shedding.key,
    training: breed.training.key,
    coat: breed.coat.key,
    group: breed.group.key,
    origin: breed.origin.key,
    lifespan: breed.lifespan.mid,
    popularityRank: breed.popularityRank,
    ownerDifficulty: breed.ownerDifficulty,
    searchText: breed.searchText,
    flags: breed.flags,
    guideAvailability: breed.guideAvailability,
  };
}
