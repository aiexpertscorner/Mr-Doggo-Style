/**
 * src/lib/names/name-scoring.ts
 * Breed-aware scoring and filtering for PupWiki dog name recommendations.
 */

import type { BreedNameProfile, DogNameEntry, NameGeneratorOptions, ScoredDogName } from './name-types';
import { estimateSyllables, matchesLengthPreference, soundsLikeCommand } from './name-utils';

function includesAny(source: string, terms: string[]): boolean {
  const text = source.toLowerCase();
  return terms.some((term) => text.includes(term));
}

export function getNameFitReasons(item: DogNameEntry, breed?: BreedNameProfile, options: NameGeneratorOptions = {}): string[] {
  const reasons: string[] = [];

  if (breed?.styles.includes(item.category)) reasons.push('style fit');
  if (breed?.inspirations.includes(item.inspiration)) reasons.push('breed-inspired');
  if (estimateSyllables(item.name) <= 2) reasons.push('easy to call');
  if (Number(item.rank || 9999) <= 3) reasons.push('popular pick');
  if (options.starts && item.name.toUpperCase().startsWith(options.starts.toUpperCase())) reasons.push('letter match');

  return reasons.slice(0, 3);
}

export function scoreDogName(item: DogNameEntry, options: NameGeneratorOptions = {}, breed?: BreedNameProfile): number {
  let score = 1000 - Number(item.rank || 999);

  if (item.enriched) score += 20;

  if (options.gender && options.gender !== 'any' && options.gender !== 'neutral' && item.gender === options.gender) score += 120;
  if (options.gender === 'neutral') score += item.name.length <= 6 ? 60 : 0;
  if (options.category && item.category === options.category) score += 180;
  if (options.inspiration && item.inspiration === options.inspiration) score += 160;
  if (options.starts && item.name.toUpperCase().startsWith(options.starts.toUpperCase())) score += 140;

  if (breed && options.breedFit !== false) {
    if (breed.styles.includes(item.category)) score += 220;
    if (breed.inspirations.includes(item.inspiration)) score += 180;

    const temperament = breed.temperament.toLowerCase();
    if (includesAny(temperament, ['friendly', 'outgoing', 'affectionate']) && ['Cute', 'Classic', 'Trendy'].includes(item.category)) score += 50;
    if (includesAny(temperament, ['loyal', 'protective', 'confident']) && item.category === 'Tough') score += 70;
    if (includesAny(temperament, ['intelligent', 'smart', 'trainable']) && ['Mythology', 'Human'].includes(item.inspiration)) score += 55;
    if (breed.energy === 'active' && ['Tough', 'Trendy'].includes(item.category)) score += 45;
    if (breed.energy === 'calm' && ['Classic', 'Cute'].includes(item.category)) score += 45;
    if (breed.size === 'large' && ['Tough', 'Classic'].includes(item.category)) score += 35;
    if (breed.size === 'small' && ['Cute', 'Trendy'].includes(item.category)) score += 35;
  }

  const syllables = estimateSyllables(item.name);
  if (options.length === 'short' && item.name.length <= 5) score += 140;
  if (options.length === 'one-two' && syllables <= 2) score += 130;
  if (options.length === 'long' && item.name.length >= 7) score += 120;

  // Deterministic micro-variation to avoid flat groups without random build output.
  score += item.name.charCodeAt(0) % 13;

  return Math.round(score);
}

export function filterAndScoreNames(
  names: DogNameEntry[],
  options: NameGeneratorOptions = {},
  breed?: BreedNameProfile
): ScoredDogName[] {
  const starts = String(options.starts || '').trim().slice(0, 1).toUpperCase();
  const limit = Number(options.limit || 24);

  return names
    .filter((item) => {
      if (!item.name) return false;
      if (options.gender && options.gender !== 'any' && options.gender !== 'neutral' && item.gender !== options.gender) return false;
      if (options.category && item.category !== options.category) return false;
      if (options.inspiration && item.inspiration !== options.inspiration) return false;
      if (starts && !item.name.toUpperCase().startsWith(starts)) return false;
      if (options.avoidCommands !== false && soundsLikeCommand(item.name)) return false;
      if (!matchesLengthPreference(item.name, options.length || 'any')) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      score: scoreDogName(item, { ...options, starts }, breed),
      syllables: estimateSyllables(item.name),
      breedName: breed?.name,
      fitReasons: getNameFitReasons(item, breed, { ...options, starts }),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
