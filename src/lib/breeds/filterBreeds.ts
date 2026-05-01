/**
 * src/lib/breeds/filterBreeds.ts
 *
 * Pure utilities for PupWiki breed directory filtering, sorting, URL state,
 * quick filters and facet counts. Safe for server-side Astro usage and browser bundles.
 */

import type {
  BreedCoatKey,
  BreedEnergyKey,
  BreedSheddingKey,
  BreedSizeKey,
  BreedTrainingKey,
  NormalizedBreed,
} from './normalizeBreed';

import {
  BREED_COAT_LABELS,
  BREED_ENERGY_LABELS,
  BREED_GROUPS,
  BREED_SHEDDING_LABELS,
  BREED_SIZE_LABELS,
  BREED_TRAINING_LABELS,
  COUNTRY_FLAGS,
  slugify,
  titleCase,
} from './normalizeBreed';

export type BreedSortMode =
  | 'recommended'
  | 'popular'
  | 'az'
  | 'za'
  | 'smallest'
  | 'largest'
  | 'lifespan-desc'
  | 'lifespan-asc'
  | 'low-shedding'
  | 'easy-training';

export interface BreedFilterState {
  q: string;
  type: 'all' | 'purebred' | 'mixed';
  size: 'all' | BreedSizeKey;
  energy: 'all' | BreedEnergyKey;
  shedding: 'all' | BreedSheddingKey;
  training: 'all' | BreedTrainingKey;
  coat: 'all' | BreedCoatKey;
  group: 'all' | string;
  origin: 'all' | string;
  lifespan: 'all' | 'lt10' | '10-12' | '12-14' | 'gt14';
  guide: 'all' | 'cost' | 'food' | 'health' | 'training' | 'grooming' | 'beds' | 'supplements';
  sort: BreedSortMode;
}

export interface QuickBreedFilter {
  id: string;
  label: string;
  description: string;
  emoji: string;
  state: Partial<BreedFilterState>;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  emoji?: string;
}

export interface BreedFilterOptions {
  sizes: FilterOption[];
  energy: FilterOption[];
  shedding: FilterOption[];
  training: FilterOption[];
  coats: FilterOption[];
  groups: FilterOption[];
  origins: FilterOption[];
  types: FilterOption[];
  guides: FilterOption[];
  lifespan: FilterOption[];
}

export const DEFAULT_BREED_FILTER_STATE: BreedFilterState = {
  q: '',
  type: 'all',
  size: 'all',
  energy: 'all',
  shedding: 'all',
  training: 'all',
  coat: 'all',
  group: 'all',
  origin: 'all',
  lifespan: 'all',
  guide: 'all',
  sort: 'recommended',
};

export const QUICK_BREED_FILTERS: QuickBreedFilter[] = [
  {
    id: 'small-calm',
    label: 'Small & calm',
    description: 'Compact breeds with lower daily intensity.',
    emoji: '🏡',
    state: { size: 'small', energy: 'calm', sort: 'recommended' },
  },
  {
    id: 'low-shedding',
    label: 'Low shedding',
    description: 'Breeds with minimal or lower shedding profiles.',
    emoji: '✨',
    state: { shedding: 'low', sort: 'low-shedding' },
  },
  {
    id: 'easy-training',
    label: 'Easy to train',
    description: 'Good starting point for first-time owners.',
    emoji: '🎓',
    state: { training: 'easy', sort: 'easy-training' },
  },
  {
    id: 'active-dogs',
    label: 'Active dogs',
    description: 'For outdoors, sport and high-enrichment homes.',
    emoji: '⚡',
    state: { energy: 'active', sort: 'popular' },
  },
  {
    id: 'large-breeds',
    label: 'Large breeds',
    description: 'Bigger breeds with more space and cost planning needs.',
    emoji: '📏',
    state: { size: 'large', sort: 'popular' },
  },
  {
    id: 'long-living',
    label: 'Long lifespan',
    description: 'Breeds with longer average lifespan profiles.',
    emoji: '⏱️',
    state: { lifespan: 'gt14', sort: 'lifespan-desc' },
  },
  {
    id: 'mixed-breeds',
    label: 'Mixed breeds',
    description: 'Designer and crossbreed profiles.',
    emoji: '🐾',
    state: { type: 'mixed', sort: 'az' },
  },
  {
    id: 'food-guides',
    label: 'Food guides',
    description: 'Breeds with nutrition and feeding resources.',
    emoji: '🍖',
    state: { guide: 'food', sort: 'recommended' },
  },
];

const SIZE_ORDER: Record<string, number> = {
  small: 1,
  medium: 2,
  large: 3,
  giant: 4,
  unknown: 99,
};

const SHEDDING_ORDER: Record<string, number> = {
  minimal: 1,
  low: 2,
  seasonal: 3,
  heavy: 4,
  unknown: 99,
};

const TRAINING_ORDER: Record<string, number> = {
  easy: 1,
  moderate: 2,
  difficult: 3,
  unknown: 99,
};

const GUIDE_LABELS: Record<string, string> = {
  cost: 'Cost calculator',
  food: 'Food guide',
  health: 'Health guide',
  training: 'Training guide',
  grooming: 'Grooming guide',
  beds: 'Bed guide',
  supplements: 'Supplement guide',
};

function cloneState(state?: Partial<BreedFilterState>): BreedFilterState {
  return { ...DEFAULT_BREED_FILTER_STATE, ...(state ?? {}) };
}

function normalizeSearchQuery(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchMatches(breed: NormalizedBreed, query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;

  const tokens = normalized.split(' ').filter(Boolean);
  if (!tokens.length) return true;

  return tokens.every((token) => breed.searchText.includes(token));
}

function lifespanMatches(value: number | null, bucket: BreedFilterState['lifespan']): boolean {
  if (bucket === 'all') return true;
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return false;

  if (bucket === 'lt10') return value < 10;
  if (bucket === '10-12') return value >= 10 && value <= 12;
  if (bucket === '12-14') return value > 12 && value <= 14;
  if (bucket === 'gt14') return value > 14;

  return true;
}

function guideMatches(breed: NormalizedBreed, guide: BreedFilterState['guide']): boolean {
  if (guide === 'all') return true;
  return Boolean(breed.guideAvailability[guide]);
}

export function breedMatchesFilters(breed: NormalizedBreed, inputState?: Partial<BreedFilterState>): boolean {
  const state = cloneState(inputState);

  if (!searchMatches(breed, state.q)) return false;
  if (state.type !== 'all' && breed.type !== state.type) return false;
  if (state.size !== 'all' && breed.size.key !== state.size) return false;
  if (state.energy !== 'all' && breed.energy.key !== state.energy) return false;
  if (state.shedding !== 'all' && breed.shedding.key !== state.shedding) return false;
  if (state.training !== 'all' && breed.training.key !== state.training) return false;
  if (state.coat !== 'all' && breed.coat.key !== state.coat) return false;
  if (state.group !== 'all' && breed.group.key !== state.group) return false;
  if (state.origin !== 'all' && breed.origin.key !== state.origin) return false;
  if (!lifespanMatches(breed.lifespan.mid, state.lifespan)) return false;
  if (!guideMatches(breed, state.guide)) return false;

  return true;
}

function recommendedScore(breed: NormalizedBreed): number {
  let score = 0;

  if (breed.popularityRank && breed.popularityRank < 9999) score += Math.max(0, 220 - breed.popularityRank);
  if (breed.primaryImage) score += 24;
  if (breed.flags.hasMonetizableGuides) score += 24;
  if (breed.guideAvailability.cost) score += 12;
  if (breed.guideAvailability.food) score += 8;
  if (breed.guideAvailability.health) score += 8;
  if (breed.guideAvailability.training) score += 8;
  if (breed.origin.key !== 'unknown') score += 4;
  if (breed.lifespan.mid) score += 4;
  if (breed.weight.label) score += 4;

  return score;
}

export function sortBreedRecords(records: NormalizedBreed[], mode: BreedSortMode = 'recommended'): NormalizedBreed[] {
  const sorted = [...records];

  sorted.sort((a, b) => {
    if (mode === 'recommended') {
      return recommendedScore(b) - recommendedScore(a) || a.name.localeCompare(b.name);
    }
    if (mode === 'popular') {
      return (a.popularityRank || 9999) - (b.popularityRank || 9999) || a.name.localeCompare(b.name);
    }
    if (mode === 'az') return a.name.localeCompare(b.name);
    if (mode === 'za') return b.name.localeCompare(a.name);
    if (mode === 'smallest') {
      return (SIZE_ORDER[a.size.key] ?? 99) - (SIZE_ORDER[b.size.key] ?? 99) || a.name.localeCompare(b.name);
    }
    if (mode === 'largest') {
      return (SIZE_ORDER[b.size.key] ?? 99) - (SIZE_ORDER[a.size.key] ?? 99) || a.name.localeCompare(b.name);
    }
    if (mode === 'lifespan-desc') {
      return (b.lifespan.mid ?? -1) - (a.lifespan.mid ?? -1) || a.name.localeCompare(b.name);
    }
    if (mode === 'lifespan-asc') {
      return (a.lifespan.mid ?? 999) - (b.lifespan.mid ?? 999) || a.name.localeCompare(b.name);
    }
    if (mode === 'low-shedding') {
      return (SHEDDING_ORDER[a.shedding.key] ?? 99) - (SHEDDING_ORDER[b.shedding.key] ?? 99) || a.name.localeCompare(b.name);
    }
    if (mode === 'easy-training') {
      return (TRAINING_ORDER[a.training.key] ?? 99) - (TRAINING_ORDER[b.training.key] ?? 99) || a.name.localeCompare(b.name);
    }

    return 0;
  });

  return sorted;
}

export function filterBreedRecords(records: NormalizedBreed[], inputState?: Partial<BreedFilterState>): NormalizedBreed[] {
  const state = cloneState(inputState);
  return sortBreedRecords(records.filter((breed) => breedMatchesFilters(breed, state)), state.sort);
}

function countBy(records: NormalizedBreed[], getter: (breed: NormalizedBreed) => string): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, breed) => {
    const key = getter(breed) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function option(value: string, label: string, counts: Record<string, number>, emoji?: string): FilterOption {
  return { value, label, count: counts[value] || 0, emoji };
}

export function createBreedFilterOptions(records: NormalizedBreed[]): BreedFilterOptions {
  const sizeCounts = countBy(records, (breed) => breed.size.key);
  const energyCounts = countBy(records, (breed) => breed.energy.key);
  const sheddingCounts = countBy(records, (breed) => breed.shedding.key);
  const trainingCounts = countBy(records, (breed) => breed.training.key);
  const coatCounts = countBy(records, (breed) => breed.coat.key);
  const groupCounts = countBy(records, (breed) => breed.group.key);
  const originCounts = countBy(records, (breed) => breed.origin.key);
  const typeCounts = countBy(records, (breed) => breed.type);
  const lifespanCounts = countBy(records, (breed) => breed.lifespan.bucket);

  const guideCounts = records.reduce<Record<string, number>>((acc, breed) => {
    for (const [key, value] of Object.entries(breed.guideAvailability)) {
      if (value) acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  const originLabels = new Map<string, string>();
  for (const breed of records) {
    if (breed.origin.key !== 'unknown' && !originLabels.has(breed.origin.key)) {
      originLabels.set(breed.origin.key, breed.origin.label);
    }
  }

  return {
    sizes: (['small', 'medium', 'large', 'giant'] as BreedSizeKey[])
      .map((key) => option(key, BREED_SIZE_LABELS[key], sizeCounts, { small: '🐕', medium: '🐕‍🦺', large: '🐕‍🦺', giant: '🦮' }[key]))
      .filter((item) => item.count > 0),
    energy: (['active', 'regular', 'calm'] as BreedEnergyKey[])
      .map((key) => option(key, BREED_ENERGY_LABELS[key], energyCounts, { active: '⚡', regular: '🚶', calm: '😴' }[key]))
      .filter((item) => item.count > 0),
    shedding: (['heavy', 'seasonal', 'low', 'minimal'] as BreedSheddingKey[])
      .map((key) => option(key, BREED_SHEDDING_LABELS[key], sheddingCounts, { heavy: '●●●●', seasonal: '●●●○', low: '●●○○', minimal: '●○○○' }[key]))
      .filter((item) => item.count > 0),
    training: (['easy', 'moderate', 'difficult'] as BreedTrainingKey[])
      .map((key) => option(key, BREED_TRAINING_LABELS[key], trainingCounts, { easy: '✓', moderate: '◈', difficult: '✗' }[key]))
      .filter((item) => item.count > 0),
    coats: (['short', 'medium', 'long', 'double', 'silky', 'wiry', 'wavy', 'curly', 'rough', 'corded', 'hairless'] as BreedCoatKey[])
      .map((key) => option(key, BREED_COAT_LABELS[key], coatCounts))
      .filter((item) => item.count > 0),
    groups: BREED_GROUPS
      .map((group) => option(group.key, group.label, groupCounts, group.emoji))
      .filter((item) => item.count > 0),
    origins: [...originLabels.entries()]
      .map(([key, label]) => ({ value: key, label, count: originCounts[key] || 0, emoji: COUNTRY_FLAGS[key] || '🌍' }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    types: [
      option('purebred', 'Purebred', typeCounts, '🏅'),
      option('mixed', 'Mixed / designer', typeCounts, '🐾'),
    ].filter((item) => item.count > 0),
    guides: Object.entries(GUIDE_LABELS)
      .map(([value, label]) => option(value, label, guideCounts))
      .filter((item) => item.count > 0),
    lifespan: [
      option('lt10', '< 10 yrs', lifespanCounts),
      option('10-12', '10–12 yrs', lifespanCounts),
      option('12-14', '12–14 yrs', lifespanCounts),
      option('gt14', '14+ yrs', lifespanCounts),
    ].filter((item) => item.count > 0),
  };
}

export function parseBreedFilterState(source: URLSearchParams | Record<string, unknown>): BreedFilterState {
  const get = (key: keyof BreedFilterState) => {
    if (source instanceof URLSearchParams) return source.get(String(key));
    return source[key];
  };

  const state = cloneState();

  for (const key of Object.keys(state) as (keyof BreedFilterState)[]) {
    const value = get(key);
    if (value === null || value === undefined || value === '') continue;
    (state as any)[key] = String(value);
  }

  return state;
}

export function breedFilterStateToSearchParams(inputState?: Partial<BreedFilterState>): URLSearchParams {
  const state = cloneState(inputState);
  const params = new URLSearchParams();

  for (const [key, defaultValue] of Object.entries(DEFAULT_BREED_FILTER_STATE)) {
    const value = (state as any)[key];
    if (value === defaultValue || value === '' || value === null || value === undefined) continue;
    params.set(key, String(value));
  }

  return params;
}

export function isDefaultBreedFilterState(inputState?: Partial<BreedFilterState>): boolean {
  const state = cloneState(inputState);
  return Object.entries(DEFAULT_BREED_FILTER_STATE).every(([key, value]) => (state as any)[key] === value);
}

export function getActiveFilterChips(inputState?: Partial<BreedFilterState>, options?: BreedFilterOptions) {
  const state = cloneState(inputState);
  const chips: { key: keyof BreedFilterState; label: string; value: string }[] = [];

  if (state.q) chips.push({ key: 'q', label: `Search: ${state.q}`, value: state.q });

  const lookup = (items: FilterOption[] | undefined, value: string) => items?.find((item) => item.value === value)?.label || titleCase(value);

  if (state.type !== 'all') chips.push({ key: 'type', label: lookup(options?.types, state.type), value: state.type });
  if (state.size !== 'all') chips.push({ key: 'size', label: lookup(options?.sizes, state.size), value: state.size });
  if (state.energy !== 'all') chips.push({ key: 'energy', label: lookup(options?.energy, state.energy), value: state.energy });
  if (state.shedding !== 'all') chips.push({ key: 'shedding', label: lookup(options?.shedding, state.shedding), value: state.shedding });
  if (state.training !== 'all') chips.push({ key: 'training', label: lookup(options?.training, state.training), value: state.training });
  if (state.coat !== 'all') chips.push({ key: 'coat', label: lookup(options?.coats, state.coat), value: state.coat });
  if (state.group !== 'all') chips.push({ key: 'group', label: lookup(options?.groups, state.group), value: state.group });
  if (state.origin !== 'all') chips.push({ key: 'origin', label: lookup(options?.origins, state.origin), value: state.origin });
  if (state.lifespan !== 'all') chips.push({ key: 'lifespan', label: lookup(options?.lifespan, state.lifespan), value: state.lifespan });
  if (state.guide !== 'all') chips.push({ key: 'guide', label: lookup(options?.guides, state.guide), value: state.guide });

  return chips;
}

export function filteredUrl(state: Partial<BreedFilterState>, basePath = '/breeds/'): string {
  const params = breedFilterStateToSearchParams(state);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function facetCountFor(records: NormalizedBreed[], state: Partial<BreedFilterState>, key: keyof BreedFilterState, value: string): number {
  const nextState = cloneState({ ...state, [key]: value });
  return records.filter((breed) => breedMatchesFilters(breed, nextState)).length;
}

export function getCollectionLinks() {
  return [
    { label: 'Small dog breeds', href: filteredUrl({ size: 'small' }), desc: 'Compact breeds for smaller homes and city routines.', icon: '🐕' },
    { label: 'Low-shedding breeds', href: filteredUrl({ shedding: 'low', sort: 'low-shedding' }), desc: 'Start with breeds that usually shed less.', icon: '✨' },
    { label: 'Easy-to-train breeds', href: filteredUrl({ training: 'easy', sort: 'easy-training' }), desc: 'Beginner-friendly options with higher trainability.', icon: '🎓' },
    { label: 'Active dog breeds', href: filteredUrl({ energy: 'active' }), desc: 'Breeds that fit outdoor, sport and high-enrichment homes.', icon: '⚡' },
    { label: 'Large dog breeds', href: filteredUrl({ size: 'large' }), desc: 'Bigger breeds that need space and cost planning.', icon: '📏' },
    { label: 'Long-living breeds', href: filteredUrl({ lifespan: 'gt14', sort: 'lifespan-desc' }), desc: 'Breeds with longer average lifespan profiles.', icon: '⏱️' },
    { label: 'Mixed breeds', href: filteredUrl({ type: 'mixed', sort: 'az' }), desc: 'Designer and crossbreed profiles in PupWiki.', icon: '🐾' },
    { label: 'Breeds with food guides', href: filteredUrl({ guide: 'food' }), desc: 'Breed pages with nutrition and feeding resources.', icon: '🍖' },
  ];
}
