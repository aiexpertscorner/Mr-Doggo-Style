/**
 * src/lib/names/name-types.ts
 * Shared domain types for PupWiki dog name pages and generator components.
 */

export type DogNameGender = 'boy' | 'girl' | 'neutral' | 'any' | string;

export type NameLengthPreference = 'any' | 'short' | 'one-two' | 'long';

export interface DogNameEntry {
  name: string;
  gender: DogNameGender;
  category: string;
  inspiration: string;
  rank: number;
  letter?: string;
  enriched?: boolean;
}

export interface BreedNameSource {
  name: string;
  slug: string;
  image_url?: string;
  image?: string;
  size_category?: string;
  energy_level?: string;
  training_level?: string;
  temperament?: string;
  origin_country?: string;
  akc_popularity?: number;
  ranking_data?: Record<string, unknown>;
  name_styles?: string[];
  name_inspirations?: string[];
  product_picks?: Record<string, string>;
}

export interface BreedNameProfile {
  name: string;
  slug: string;
  image: string;
  size: string;
  energy: string;
  training: string;
  temperament: string;
  origin: string;
  popularity?: number;
  intelligenceRank?: number;
  styles: string[];
  inspirations: string[];
  personalityLabel: string;
}

export interface NameGeneratorOptions {
  breedSlug?: string;
  gender?: DogNameGender;
  category?: string;
  inspiration?: string;
  length?: NameLengthPreference;
  starts?: string;
  avoidCommands?: boolean;
  breedFit?: boolean;
  limit?: number;
}

export interface ScoredDogName extends DogNameEntry {
  score: number;
  syllables: number;
  breedName?: string;
  fitReasons: string[];
}

export interface NameTheme {
  id: string;
  label: string;
  description: string;
  names: string[];
}

export interface NameFaqItem {
  question: string;
  answer: string;
}

export interface BreedNamePageData {
  breed: BreedNameProfile;
  boys: DogNameEntry[];
  girls: DogNameEntry[];
  neutral: DogNameEntry[];
  topNames: string[];
  themes: NameTheme[];
  faqs: NameFaqItem[];
  profileRows: Array<{ label: string; value: string }>;
  relatedBreeds: BreedNameProfile[];
  generatorNames: DogNameEntry[];
  categories: string[];
  inspirations: string[];
}

export interface DogNamesIndexData {
  breeds: BreedNameProfile[];
  featuredBreeds: BreedNameProfile[];
  byLetter: Record<string, BreedNameProfile[]>;
  letters: string[];
  allNames: DogNameEntry[];
  generatorNames: DogNameEntry[];
  categories: string[];
  inspirations: string[];
  stats: {
    breedCount: number;
    nameCount: number;
    categoryCount: number;
    inspirationCount: number;
  };
}
