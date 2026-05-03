/**
 * src/lib/names/name-copy.ts
 * Safe editorial copy helpers for dog name pages.
 */

import type { BreedNameProfile, DogNameEntry, NameFaqItem, NameTheme } from './name-types';

export function getPersonalityLabel(breed: Partial<BreedNameProfile> & { temperament?: string; energy?: string; energy_level?: string }): string {
  const temperament = String(breed.temperament || '').toLowerCase();
  const energy = String(breed.energy || breed.energy_level || '').toLowerCase();

  if (temperament.includes('friendly') || temperament.includes('outgoing')) return 'friendly, outgoing';
  if (temperament.includes('loyal') || temperament.includes('protective')) return 'loyal, attentive';
  if (temperament.includes('intelligent') || temperament.includes('smart')) return 'intelligent, quick-learning';
  if (temperament.includes('gentle') || temperament.includes('calm')) return 'gentle, even-tempered';
  if (energy) return `${energy}-energy`;
  return 'distinctive';
}

export function getBreedNameIntro(breed: BreedNameProfile): string {
  return `${breed.name}s are often described as ${breed.personalityLabel} dogs, so the strongest names tend to be easy to call, clear in everyday training, and aligned with the breed's style.`;
}

export function getNamingMethodSummary(): string {
  return 'PupWiki name suggestions combine popularity signals, name style, inspiration category, sound clarity, syllable length, and breed traits such as size, energy, and temperament.';
}

export function buildNameFaqs(breed: BreedNameProfile, boys: DogNameEntry[], girls: DogNameEntry[]): NameFaqItem[] {
  const boyNames = boys.slice(0, 5).map((item) => item.name).join(', ');
  const girlNames = girls.slice(0, 5).map((item) => item.name).join(', ');
  const topBoys = boys.slice(0, 3).map((item) => item.name).join(', ');
  const topGirls = girls.slice(0, 3).map((item) => item.name).join(', ');

  return [
    {
      question: `What are the best names for a ${breed.name}?`,
      answer: `Strong ${breed.name} name ideas include ${topBoys || boyNames} for boys and ${topGirls || girlNames} for girls. The best final choice is short, distinct, and easy to say in a happy or firm voice.`,
    },
    {
      question: `How many syllables should a ${breed.name} name have?`,
      answer: 'One or two syllables is usually easiest for everyday recall. Longer names can work well if you also use a short nickname consistently.',
    },
    {
      question: `Should a ${breed.name} name match personality?`,
      answer: `Yes. For a ${breed.personalityLabel} breed, names that match energy, temperament, and household style often feel more natural over time.`,
    },
    {
      question: `What names should I avoid?`,
      answer: 'Avoid names that sound too close to common cues such as sit, stay, no, down, come, heel, wait, or off. Clear sound separation makes training easier.',
    },
  ];
}

export function buildDefaultThemes(
  styles: string[],
  inspirations: string[],
  getByCategory: (category: string, count?: number) => string[],
  getByInspiration: (inspiration: string, count?: number) => string[]
): NameTheme[] {
  const themes: Array<NameTheme | false> = [
    styles.includes('Classic') && {
      id: 'classic',
      label: 'Classic names',
      description: 'Timeless dog names that are easy to say and widely recognized.',
      names: getByCategory('Classic', 12),
    },
    styles.includes('Cute') && {
      id: 'cute',
      label: 'Cute names',
      description: 'Soft, friendly names for affectionate and playful dogs.',
      names: getByCategory('Cute', 12),
    },
    styles.includes('Tough') && {
      id: 'tough',
      label: 'Strong names',
      description: 'Confident names with a bold sound and sturdy feel.',
      names: getByCategory('Tough', 12),
    },
    styles.includes('Trendy') && {
      id: 'trendy',
      label: 'Modern names',
      description: 'Current name ideas with a fresh, contemporary sound.',
      names: getByCategory('Trendy', 12),
    },
    inspirations.includes('Nature') && {
      id: 'nature',
      label: 'Nature-inspired names',
      description: 'Names inspired by plants, weather, landscapes, and the outdoors.',
      names: getByInspiration('Nature', 12),
    },
    inspirations.includes('Mythology') && {
      id: 'mythology',
      label: 'Mythology names',
      description: 'Legendary names with character and story behind them.',
      names: getByInspiration('Mythology', 12),
    },
  ];

  const clean = themes.filter(Boolean).filter((theme) => theme.names.length > 0) as NameTheme[];

  if (!clean.some((theme) => theme.id === 'classic')) {
    clean.push({
      id: 'classic',
      label: 'Classic names',
      description: 'Reliable names that work for many breeds and households.',
      names: getByCategory('Classic', 12),
    });
  }

  if (!clean.some((theme) => theme.id === 'nature')) {
    clean.push({
      id: 'nature',
      label: 'Nature-inspired names',
      description: 'Outdoor-inspired names with a warm, easygoing feel.',
      names: getByInspiration('Nature', 12),
    });
  }

  return clean.slice(0, 6);
}

export function buildNamingTips(breed?: BreedNameProfile) {
  const breedName = breed?.name || 'your dog';

  return [
    {
      icon: '✂️',
      title: 'Keep it short and clear',
      body: `One or two syllables usually works best for ${breedName}. Short names are easier to call at the park, during training, and around the house.`,
    },
    {
      icon: '🎤',
      title: 'Say it in real-life tones',
      body: 'Test the name in a happy voice, a firm voice, and a recall voice. A good name should feel natural in all three.',
    },
    {
      icon: '🚫',
      title: 'Avoid command confusion',
      body: 'Skip names that sound too close to common cues like sit, stay, no, down, come, heel, wait, or off.',
    },
    {
      icon: '💛',
      title: 'Give the name time',
      body: 'Use the name consistently for a week before deciding. Many names feel more natural once your dog starts responding to them.',
    },
  ];
}
