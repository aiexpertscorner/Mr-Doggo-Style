// Quiz and personalization data types — ported from Pupwiki-leadgen donor.
// These define the data contracts for the breed finder quiz and owner profile.
// Component implementation is deferred to Phase 2.

// ── Breed Finder Quiz (prospective owners) ────────────────────────────────────

export type LivingSpace = 'apartment' | 'small-house' | 'large-house';
export type FamilyDynamic = 'solo-couple' | 'kids' | 'multi-pet';
export type ExerciseCapacity = 'relaxed' | 'active' | 'high-energy';
export type GroomingTolerance = 'low-maintenance' | 'regular' | 'professional';
export type HandlerExperience = 'beginner' | 'experienced';

export interface BreedFinderAnswers {
  livingSpace: LivingSpace;
  familyDynamic: FamilyDynamic;
  exerciseCapacity: ExerciseCapacity;
  groomingTolerance: GroomingTolerance;
  experience: HandlerExperience;
  protectionNeeded: boolean;
}

export interface BreedFinderResult {
  breedSlug: string;
  matchScore: number;       // 0–100
  matchReasons: string[];   // top 3 reasons why this breed matches
}

// ── Dog Owner Quiz (existing dog owners) ────────────────────────────────────

export type ActivityLevel = 'low' | 'moderate' | 'very-active' | 'working-dog';
export type OwnerPriority = 'health' | 'savings' | 'bonding' | 'longevity';
export type SizeCategory = 'small' | 'medium' | 'large';

export interface DogOwnerProfile {
  dogName?: string;
  breedSlug: string;          // 'unknown-mix' if breed not known
  ageYears: number;           // 0–25
  activityLevel: ActivityLevel;
  priority: OwnerPriority;
  stateCode: string;          // 2-letter US state code or 'DC'
  // Only populated when breedSlug === 'unknown-mix'
  sizeCategory?: SizeCategory;
  energyRating?: number;      // 1–5 scale
}

// ── Personalized Insurance Estimate (computed from DogOwnerProfile) ──────────

export interface InsuranceEstimate {
  breedSlug: string;
  breedName: string;
  ageYears: number;
  stateCode: string;
  basePremium: number;         // from actuarial-breed-rates.json
  ageFactor: number;           // from actuarial-age-factors.json
  stateMultiplier: number;     // from us-states-insurance-index.json
  monthlyEstimate: number;     // basePremium × ageFactor × stateMultiplier
  riskCategory: string;
  lifeStage: string;
}

// ── Quiz Step Definitions (for rendering) ──────────────────────────────────

export interface QuizStep {
  id: string;
  title: string;
  description?: string;
  type: 'single-choice' | 'text' | 'number' | 'toggle' | 'state-picker';
  options?: QuizOption[];
}

export interface QuizOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

// ── Breed Finder Quiz Steps data ────────────────────────────────────────────

export const breedFinderSteps: QuizStep[] = [
  {
    id: 'livingSpace',
    title: 'Where do you live?',
    description: 'Your living situation affects which breeds will thrive with you.',
    type: 'single-choice',
    options: [
      { value: 'apartment',    label: 'Apartment',    description: 'No yard, shared spaces', icon: '🏢' },
      { value: 'small-house',  label: 'Small House',  description: 'Small or shared yard',   icon: '🏡' },
      { value: 'large-house',  label: 'Large House',  description: 'Spacious yard or land',  icon: '🏘️' },
    ],
  },
  {
    id: 'familyDynamic',
    title: 'Who is in your household?',
    type: 'single-choice',
    options: [
      { value: 'solo-couple', label: 'Just me or a couple',      icon: '👤' },
      { value: 'kids',        label: 'Family with kids',          icon: '👨‍👩‍👧' },
      { value: 'multi-pet',   label: 'Other pets at home',        icon: '🐾' },
    ],
  },
  {
    id: 'exerciseCapacity',
    title: 'How active is your lifestyle?',
    type: 'single-choice',
    options: [
      { value: 'relaxed',     label: 'Relaxed',     description: 'Short daily walks',         icon: '🚶' },
      { value: 'active',      label: 'Active',      description: '1 hour of exercise daily',  icon: '🏃' },
      { value: 'high-energy', label: 'High Energy', description: 'Running, hiking, outdoors', icon: '⛰️' },
    ],
  },
  {
    id: 'groomingTolerance',
    title: 'How much grooming are you comfortable with?',
    type: 'single-choice',
    options: [
      { value: 'low-maintenance', label: 'Low maintenance', description: 'Minimal brushing',             icon: '✂️' },
      { value: 'regular',         label: 'Regular brushing', description: 'A few times per week',        icon: '🪮' },
      { value: 'professional',    label: 'Professional care', description: 'Regular groomer visits',     icon: '💇' },
    ],
  },
  {
    id: 'experience',
    title: 'How experienced are you with dogs?',
    type: 'single-choice',
    options: [
      { value: 'beginner',    label: 'First-time owner',   description: 'New to dog ownership',         icon: '🌱' },
      { value: 'experienced', label: 'Experienced owner',  description: 'Trained dogs before',          icon: '🎓' },
    ],
  },
];

// ── Insurance Premium Calculator helper ─────────────────────────────────────

export function estimateMonthlyPremium(
  basePremium: number,
  ageFactor: number,
  stateMultiplier: number
): number {
  return Math.round(basePremium * ageFactor * stateMultiplier * 100) / 100;
}
