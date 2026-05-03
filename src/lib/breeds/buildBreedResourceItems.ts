export type BreedResourceItem = {
  href?: string;
  icon: string;
  label: string;
  description: string;
  badge?: string;
  available?: boolean;
  featured?: boolean;
};

export type BreedPartnerClusterLink = {
  href: string;
  label: string;
  description: string;
  icon: string;
  tags: string[];
};

type BreedLike = {
  name: string;
  slug: string;
  size_category?: string;
  energy_level?: string;
  training_level?: string;
  coat_type?: string;
};

type BreedLinks = Record<string, string | undefined>;
type ContentStatus = Record<string, boolean | undefined>;

function titleCase(value?: string | null) {
  if (!value) return '';
  return String(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildBreedResourceItems(breed: BreedLike, links: BreedLinks = {}, status: ContentStatus = {}): BreedResourceItem[] {
  const costHref = `/cost-calculator/${breed.slug}`;
  const nameHref = links.names_page || `/dog-names/${breed.slug}`;

  return [
    {
      href: costHref,
      icon: '💰',
      label: `${breed.name} cost calculator`,
      description: 'Estimate puppy, annual, food, care and lifetime ownership costs.',
      badge: 'Tool',
      featured: true,
    },
    {
      href: links.food_post,
      icon: '🍖',
      label: 'Food & nutrition guide',
      description: 'Feeding style, food questions, storage and partner nutrition resources.',
      badge: status.food_post ? 'Guide' : 'Planned',
      available: Boolean(status.food_post && links.food_post),
      featured: true,
    },
    {
      href: links.training_post,
      icon: '🦮',
      label: 'Training guide',
      description: 'Owner routines, leash work, enrichment and safety gear context.',
      badge: status.training_post ? 'Guide' : 'Planned',
      available: Boolean(status.training_post && links.training_post),
    },
    {
      href: links.health_post,
      icon: '🩺',
      label: 'Health context',
      description: 'General breed health context and safer veterinary planning questions.',
      badge: status.health_post ? 'Guide' : 'Care',
      available: Boolean(status.health_post && links.health_post),
    },
    {
      href: links.grooming_post,
      icon: '✂️',
      label: 'Grooming guide',
      description: `${titleCase(breed.coat_type) || 'Coat'} care, shedding and owner maintenance planning.`,
      badge: status.grooming_post ? 'Guide' : 'Planned',
      available: Boolean(status.grooming_post && links.grooming_post),
    },
    {
      href: links.bed_post,
      icon: '🛏️',
      label: 'Beds & sleep setup',
      description: 'Size, comfort, crate fit, orthopedic and home setup considerations.',
      badge: status.bed_post ? 'Guide' : 'Comfort',
      available: Boolean(status.bed_post && links.bed_post),
    },
    {
      href: links.toy_post,
      icon: '🎾',
      label: 'Toys & enrichment',
      description: `${titleCase(breed.energy_level) || 'Energy'}-matched play, puzzles and chew planning.`,
      badge: status.toy_post ? 'Guide' : 'Enrichment',
      available: Boolean(status.toy_post && links.toy_post),
    },
    {
      href: '/categories/puppy',
      icon: '🐶',
      label: 'Puppy essentials',
      description: 'Starter setup, crate, food, training and first-year owner checklist.',
      badge: 'Hub',
    },
    {
      href: '/categories/senior-dogs',
      icon: '🐕‍🦺',
      label: 'Senior dog care',
      description: 'Comfort, mobility, food, vet planning and older-dog cost questions.',
      badge: 'Hub',
    },
    {
      href: '/categories/insurance',
      icon: '🛡️',
      label: 'Insurance planning',
      description: 'Breed risk questions, coverage timing and policy-comparison reminders.',
      badge: 'Service',
    },
    {
      href: nameHref,
      icon: '✍️',
      label: `${breed.name} names`,
      description: 'Name ideas, filters and exportable favorites for this breed.',
      badge: 'Tool',
    },
  ];
}

export function buildBreedPartnerClusterLinks(breed: BreedLike): BreedPartnerClusterLink[] {
  const baseTags = [breed.slug, breed.size_category, breed.energy_level, breed.training_level, breed.coat_type].filter(Boolean) as string[];

  return [
    {
      href: '/blog/dog-food-nutrition-partners',
      icon: '🍖',
      label: 'Food & nutrition partners',
      description: 'Fresh food, broth, raw/freeze-dried signals and feeding tools from current partner data.',
      tags: [...baseTags, 'food', 'nutrition', 'feeding'],
    },
    {
      href: '/blog/dog-training-gear-safety-partners',
      icon: '🦮',
      label: 'Training & safety partners',
      description: 'Harnesses, recall, obedience, containment and active-dog gear clusters.',
      tags: [...baseTags, 'training', 'gear', 'safety'],
    },
    {
      href: '/blog/personalized-dog-gifts-lifestyle-partners',
      icon: '🎁',
      label: 'Gifts & lifestyle partners',
      description: 'Portraits, memorials, ID-style resources and breed-inspired owner gifts.',
      tags: [...baseTags, 'gift', 'lifestyle', 'dog-owner'],
    },
    {
      href: '/blog/dog-beds-comfort-home-partners',
      icon: '🛏️',
      label: 'Beds & comfort partners',
      description: 'Beds, crate fit, orthopedic comfort and home setup planning.',
      tags: [...baseTags, 'beds', 'comfort', 'home'],
    },
    {
      href: '/blog/dog-health-wellness-adjacent-partners',
      icon: '🩺',
      label: 'Health-adjacent resources',
      description: 'Conservative planning resources for wellness, care and vet-adjacent decisions.',
      tags: [...baseTags, 'health', 'wellness', 'care'],
    },
  ];
}

export function buildBreedDecisionItems(breed: BreedLike, profile: any = {}, rank: any = {}) {
  const difficulty = Number(profile.owner_difficulty || 5);
  const tone = difficulty <= 3 ? 'good' : difficulty >= 7 ? 'warn' : 'neutral';

  return [
    {
      label: 'Owner difficulty',
      value: `${difficulty}/10`,
      note: difficulty <= 3 ? 'Beginner-friendly with routine.' : difficulty >= 7 ? 'Best for experienced owners.' : 'Works best with some preparation.',
      tone,
    },
    {
      label: 'Energy',
      value: titleCase(breed.energy_level) || 'Moderate',
      note: 'Plan exercise and enrichment before choosing this breed.',
      tone: breed.energy_level === 'active' ? 'warn' : 'neutral',
    },
    {
      label: 'Training profile',
      value: titleCase(breed.training_level) || 'Moderate',
      note: profile.is_working_heritage ? 'Working heritage benefits from structure.' : 'Consistency matters more than intensity.',
      tone: profile.is_working_heritage ? 'accent' : 'neutral',
    },
    {
      label: 'Cost planning',
      value: rank.lifetime_cost_usd ? `$${Math.round(rank.lifetime_cost_usd / 1000)}K+` : 'Plan ahead',
      note: 'Use the calculator for food, care and lifetime estimates.',
      tone: 'accent',
    },
  ];
}
