/**
 * src/lib/names/name-utils.ts
 * Pure helpers used by server-side name data builders and client generator logic.
 */

import type { DogNameEntry, NameLengthPreference } from './name-types';

export const COMMAND_WORDS = [
  'sit',
  'stay',
  'no',
  'down',
  'come',
  'heel',
  'drop',
  'leave',
  'wait',
  'off',
] as const;

export function normalizeText(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function toTitleCase(value: string): string {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function uniqueSorted(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function getNameLetter(name: string): string {
  return String(name || '').trim().charAt(0).toUpperCase();
}

export function estimateSyllables(name: string): number {
  const cleaned = normalizeText(name);
  if (!cleaned) return 1;

  const groups = cleaned.match(/[aeiouy]+/g) || [];
  let count = groups.length || 1;

  if (cleaned.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export function soundsLikeCommand(name: string): boolean {
  const cleaned = normalizeText(name);
  if (!cleaned) return false;

  return COMMAND_WORDS.some((command) => cleaned === command || cleaned.includes(command));
}

export function matchesLengthPreference(name: string, preference: NameLengthPreference = 'any'): boolean {
  if (preference === 'any') return true;

  const syllables = estimateSyllables(name);
  const length = String(name || '').length;

  if (preference === 'short') return length <= 5;
  if (preference === 'one-two') return syllables <= 2;
  if (preference === 'long') return length >= 7;

  return true;
}

export function sortByRankThenName<T extends Pick<DogNameEntry, 'rank' | 'name'>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rankA = Number(a.rank || 9999);
    const rankB = Number(b.rank || 9999);
    if (rankA !== rankB) return rankA - rankB;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function dedupeNames<T extends DogNameEntry>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = `${normalizeText(item.name)}:${item.gender}:${item.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function safeNameEntry(item: DogNameEntry): DogNameEntry {
  return {
    name: String(item.name || '').trim(),
    gender: String(item.gender || 'neutral').trim().toLowerCase(),
    category: String(item.category || 'Classic').trim(),
    inspiration: String(item.inspiration || 'Classic Pet').trim(),
    rank: Number(item.rank || 9999),
    letter: item.letter || getNameLetter(item.name),
    enriched: Boolean(item.enriched),
  };
}
