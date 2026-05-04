/**
 * src/lib/names/name-data.ts
 * Server-side data builders for dog name index and breed pages.
 */

import masterBreedsRaw from '../../data/master-breeds.json';
import allNamesRaw from '../../data/dog-names.json';
import type {
  BreedNamePageData,
  BreedNameProfile,
  BreedNameSource,
  DogNameEntry,
  DogNamesIndexData,
} from './name-types';
import { buildDefaultThemes, buildNameFaqs, getPersonalityLabel } from './name-copy';
import { dedupeNames, safeNameEntry, sortByRankThenName, uniqueSorted } from './name-utils';

const masterBreeds = masterBreedsRaw as BreedNameSource[];
const rawNames = allNamesRaw as DogNameEntry[];

export function getAllDogNames(): DogNameEntry[] {
  return dedupeNames(rawNames.map(safeNameEntry)).filter((item) => Boolean(item.name));
}

export function getAllBreedNameProfiles(): BreedNameProfile[] {
  return masterBreeds
    .filter((breed) => breed?.name && breed?.slug)
    .map(toBreedNameProfile)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toBreedNameProfile(breed: BreedNameSource): BreedNameProfile {
  const rank = (breed.ranking_data || {}) as Record<string, unknown>;
  const intelligenceRank = Number(rank.intelligence_rank || 0) || undefined;
  const styles = Array.isArray(breed.name_styles) && breed.name_styles.length ? breed.name_styles : ['Classic', 'Trendy'];
  const inspirations =
    Array.isArray(breed.name_inspirations) && breed.name_inspirations.length
      ? breed.name_inspirations
      : ['Classic Pet', 'Nature'];

  const profile: BreedNameProfile = {
    name: breed.name,
    slug: breed.slug,
    image: breed.image_url || breed.image || '',
    size: String(breed.size_category || '').toLowerCase(),
    energy: String(breed.energy_level || '').toLowerCase(),
    training: String(breed.training_level || '').toLowerCase(),
    temperament: String(breed.temperament || ''),
    origin: String(breed.origin_country || ''),
    popularity: Number(breed.akc_popularity || 0) || undefined,
    intelligenceRank,
    styles,
    inspirations,
    personalityLabel: '',
  };

  profile.personalityLabel = getPersonalityLabel(profile);
  return profile;
}

export function getNameCategories(names = getAllDogNames()): string[] {
  return uniqueSorted(names.map((item) => item.category));
}

export function getNameInspirations(names = getAllDogNames()): string[] {
  return uniqueSorted(names.map((item) => item.inspiration));
}

export function getBreedsByLetter(breeds = getAllBreedNameProfiles()): Record<string, BreedNameProfile[]> {
  return breeds.reduce<Record<string, BreedNameProfile[]>>((acc, breed) => {
    const letter = breed.name.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(breed);
    return acc;
  }, {});
}

export function getFeaturedBreedNameProfiles(breeds = getAllBreedNameProfiles(), count = 12): BreedNameProfile[] {
  const withPopularity = breeds
    .filter((breed) => breed.popularity && breed.popularity <= 40 && breed.image)
    .sort((a, b) => Number(a.popularity || 999) - Number(b.popularity || 999));

  const fallback = breeds.filter((breed) => breed.image).slice(0, count);
  return (withPopularity.length ? withPopularity : fallback).slice(0, count);
}

export function getDogNamesIndexData(): DogNamesIndexData {
  const breeds = getAllBreedNameProfiles();
  const allNames = getAllDogNames();
  const byLetter = getBreedsByLetter(breeds);
  const letters = Object.keys(byLetter).sort();
  const categories = getNameCategories(allNames);
  const inspirations = getNameInspirations(allNames);

  return {
    breeds,
    featuredBreeds: getFeaturedBreedNameProfiles(breeds),
    byLetter,
    letters,
    allNames,
    generatorNames: allNames,
    categories,
    inspirations,
    stats: {
      breedCount: breeds.length,
      nameCount: allNames.length,
      categoryCount: categories.length,
      inspirationCount: inspirations.length,
    },
  };
}

export function getBreedNamePaths() {
  return getAllBreedNameProfiles().map((breed) => ({ params: { breed: breed.slug } }));
}

export function getBreedNameProfileBySlug(slug: string | undefined): BreedNameProfile | null {
  if (!slug) return null;
  return getAllBreedNameProfiles().find((breed) => breed.slug === slug) || null;
}

export function getNamesByCategory(category: string, count = 12, names = getAllDogNames()): string[] {
  return sortByRankThenName(names.filter((item) => item.category === category))
    .slice(0, count)
    .map((item) => item.name);
}

export function getNamesByInspiration(inspiration: string, count = 12, names = getAllDogNames()): string[] {
  return sortByRankThenName(names.filter((item) => item.inspiration === inspiration))
    .slice(0, count)
    .map((item) => item.name);
}

export function getBreedMatchedNames(
  breed: BreedNameProfile,
  gender: 'boy' | 'girl' | 'neutral' | string,
  count = 20,
  names = getAllDogNames()
): DogNameEntry[] {
  const preferred = names.filter(
    (item) =>
      item.gender === gender &&
      (breed.styles.includes(item.category) || breed.inspirations.includes(item.inspiration))
  );

  const fallback = names.filter((item) => item.gender === gender);
  return sortByRankThenName(preferred.length ? preferred : fallback).slice(0, count);
}

export function getRelatedBreedNameProfiles(breed: BreedNameProfile, count = 4): BreedNameProfile[] {
  return getAllBreedNameProfiles()
    .filter((candidate) => candidate.slug !== breed.slug && candidate.image)
    .map((candidate) => {
      let score = 0;
      if (candidate.size && candidate.size === breed.size) score += 3;
      if (candidate.energy && candidate.energy === breed.energy) score += 2;
      if (candidate.styles.some((style) => breed.styles.includes(style))) score += 2;
      if (candidate.inspirations.some((inspiration) => breed.inspirations.includes(inspiration))) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, count)
    .map((item) => item.candidate);
}

export function getBreedNamePageData(slug: string | undefined): BreedNamePageData | null {
  const breed = getBreedNameProfileBySlug(slug);
  if (!breed) return null;

  const allNames = getAllDogNames();
  const boys = getBreedMatchedNames(breed, 'boy', 24, allNames);
  const girls = getBreedMatchedNames(breed, 'girl', 24, allNames);
  const neutral = getBreedMatchedNames(breed, 'neutral', 12, allNames);
  const categories = getNameCategories(allNames);
  const inspirations = getNameInspirations(allNames);

  const topNames = [...boys.slice(0, 3), ...girls.slice(0, 3)].map((item) => item.name);
  const themes = buildDefaultThemes(
    breed.styles,
    breed.inspirations,
    (category, count) => getNamesByCategory(category, count, allNames),
    (inspiration, count) => getNamesByInspiration(inspiration, count, allNames)
  );

  const profileRows = [
    breed.size && { label: 'Size', value: breed.size },
    breed.energy && { label: 'Energy', value: breed.energy },
    breed.training && { label: 'Training', value: breed.training },
    breed.intelligenceRank && { label: 'Intelligence', value: `#${breed.intelligenceRank}` },
    breed.origin && { label: 'Origin', value: breed.origin },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return {
    breed,
    boys,
    girls,
    neutral,
    topNames,
    themes,
    faqs: buildNameFaqs(breed, boys, girls),
    profileRows,
    relatedBreeds: getRelatedBreedNameProfiles(breed),
    generatorNames: allNames,
    categories,
    inspirations,
  };
}
