export type ContentClusterType = 'lifecycle' | 'product' | 'service' | 'partner' | 'support';
export type ClaimSensitivity = 'low' | 'medium' | 'high';

export interface AmazonSearchTemplate {
  id: string;
  query: string;
  label: string;
  intent?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface ContentCluster {
  slug: string;
  type: ContentClusterType;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  awinTopicTags: string[];
  amazonTopicTags: string[];
  amazonSearches: AmazonSearchTemplate[];
  relatedClusters: string[];
  claimSensitivity: ClaimSensitivity;
  monetizationAllowed: boolean;
  preferredModules: string[];
  pseoFamilies: string[];
}

export const CONTENT_CLUSTERS: Record<string, ContentCluster> = {
  puppy: {
    slug: 'puppy',
    type: 'lifecycle',
    title: 'Puppy Essentials',
    shortTitle: 'Puppy',
    description: 'Starter guides, training setup, food, crates, cleanup, toys and first-year dog-owner planning.',
    icon: '🐶',
    primaryKeywords: ['puppy essentials', 'puppy starter kit', 'new puppy checklist', 'puppy supplies'],
    secondaryKeywords: ['crate training', 'house training', 'puppy food', 'puppy toys', 'puppy gates', 'puppy cleanup'],
    awinTopicTags: ['puppy', 'training', 'food', 'nutrition', 'gear', 'crate-training', 'home-setup'],
    amazonTopicTags: ['puppy', 'crate-training', 'home-setup', 'cleanup', 'chew', 'puppy-food', 'training'],
    amazonSearches: [
      { id: 'puppy-starter-kit', query: 'puppy starter kit essentials', label: 'Puppy starter kit', intent: 'high', tags: ['puppy', 'home-setup'] },
      { id: 'puppy-crate-training', query: 'puppy crate training essentials', label: 'Crate training essentials', intent: 'high', tags: ['puppy', 'crate-training'] },
      { id: 'puppy-cleanup', query: 'puppy potty training cleanup supplies', label: 'Potty training cleanup', intent: 'medium', tags: ['puppy', 'cleanup'] },
      { id: 'puppy-chew-toys', query: 'safe puppy chew toys', label: 'Puppy chew toys', intent: 'medium', tags: ['puppy', 'toys'] }
    ],
    relatedClusters: ['training', 'dog-food', 'toys', 'home-cleanup', 'insurance'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    preferredModules: ['amazon-searches', 'awin-partners', 'breed-links', 'checklist'],
    pseoFamilies: ['puppy', 'training', 'food', 'toys']
  },
  'senior-dogs': {
    slug: 'senior-dogs',
    type: 'lifecycle',
    title: 'Senior Dog Care',
    shortTitle: 'Senior Dogs',
    description: 'Comfort, orthopedic beds, food questions, mobility, vet planning and safer buying guidance for older dogs.',
    icon: '🐕‍🦺',
    primaryKeywords: ['senior dog care', 'senior dog products', 'older dog comfort', 'senior dog supplies'],
    secondaryKeywords: ['orthopedic dog beds', 'joint support', 'senior dog food', 'mobility support', 'vet care planning'],
    awinTopicTags: ['senior-dog', 'beds', 'health', 'nutrition', 'food', 'care', 'wellness'],
    amazonTopicTags: ['senior-dog', 'orthopedic', 'beds', 'joint', 'comfort', 'mobility', 'wellness'],
    amazonSearches: [
      { id: 'senior-orthopedic-bed', query: 'orthopedic dog bed for senior dogs', label: 'Orthopedic dog beds', intent: 'high', tags: ['senior-dog', 'beds'] },
      { id: 'senior-ramps', query: 'dog ramp for senior dogs', label: 'Ramps and mobility aids', intent: 'medium', tags: ['senior-dog', 'mobility'] },
      { id: 'senior-dog-bowls', query: 'raised dog bowls for senior dogs', label: 'Raised bowls', intent: 'medium', tags: ['senior-dog', 'feeding'] },
      { id: 'senior-comfort', query: 'senior dog comfort supplies', label: 'Senior comfort supplies', intent: 'medium', tags: ['senior-dog', 'comfort'] }
    ],
    relatedClusters: ['beds', 'health', 'supplements', 'dog-food', 'insurance'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    preferredModules: ['health-note', 'amazon-searches', 'awin-partners', 'vet-questions'],
    pseoFamilies: ['senior-dogs', 'beds', 'health', 'supplements']
  },
  'dog-food': {
    slug: 'dog-food',
    type: 'product',
    title: 'Dog Food & Nutrition',
    shortTitle: 'Dog Food',
    description: 'Breed-aware dog food, feeding tools, storage, life-stage formulas and nutrition planning.',
    icon: '🍖',
    primaryKeywords: ['dog food', 'best dog food', 'dog nutrition'],
    secondaryKeywords: ['puppy food', 'senior dog food', 'fresh dog food', 'sensitive stomach dog food'],
    awinTopicTags: ['food', 'nutrition', 'feeding', 'fresh-food', 'raw-food', 'sensitive-stomach'],
    amazonTopicTags: ['food', 'nutrition', 'feeding', 'treats', 'bowls', 'storage', 'puppy', 'senior-dog'],
    amazonSearches: [
      { id: 'dog-food-storage', query: 'airtight dog food storage container', label: 'Food storage', intent: 'medium', tags: ['food', 'storage'] },
      { id: 'slow-feeder', query: 'slow feeder dog bowl', label: 'Slow feeders', intent: 'medium', tags: ['feeding', 'bowls'] },
      { id: 'puppy-food', query: 'puppy food small breed large breed', label: 'Puppy food options', intent: 'high', tags: ['puppy', 'food'] },
      { id: 'senior-food', query: 'senior dog food', label: 'Senior dog food', intent: 'high', tags: ['senior-dog', 'food'] }
    ],
    relatedClusters: ['puppy', 'senior-dogs', 'supplements', 'health'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    preferredModules: ['health-note', 'awin-partners', 'amazon-searches', 'breed-food-links'],
    pseoFamilies: ['food']
  },
  training: {
    slug: 'training',
    type: 'product',
    title: 'Dog Training & Gear',
    shortTitle: 'Training',
    description: 'Training plans, harnesses, leashes, recall tools, crates and safe behavior support.',
    icon: '🦮',
    primaryKeywords: ['dog training', 'dog training gear', 'puppy training'],
    secondaryKeywords: ['leash training', 'recall training', 'dog harness', 'training treats', 'crate training'],
    awinTopicTags: ['training', 'behavior', 'obedience', 'recall', 'leash', 'harness', 'gear'],
    amazonTopicTags: ['training', 'behavior', 'leash', 'harness', 'crate-training', 'recall', 'obedience', 'safety'],
    amazonSearches: [
      { id: 'training-treats', query: 'dog training treats', label: 'Training treats', intent: 'medium', tags: ['training', 'treats'] },
      { id: 'no-pull-harness', query: 'no pull dog harness', label: 'No-pull harnesses', intent: 'high', tags: ['harness', 'leash'] },
      { id: 'long-leash-recall', query: 'long leash for dog recall training', label: 'Recall training leads', intent: 'medium', tags: ['recall', 'leash'] },
      { id: 'crate-training', query: 'dog crate training essentials', label: 'Crate training essentials', intent: 'medium', tags: ['crate-training'] }
    ],
    relatedClusters: ['puppy', 'toys', 'travel', 'home-cleanup'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    preferredModules: ['amazon-searches', 'awin-partners', 'training-plan'],
    pseoFamilies: ['training']
  },
  beds: {
    slug: 'beds',
    type: 'product',
    title: 'Dog Beds & Comfort',
    shortTitle: 'Beds',
    description: 'Dog beds, orthopedic support, washable covers, crate beds, cooling comfort and senior dog sleep planning.',
    icon: '🛏️',
    primaryKeywords: ['dog beds', 'best dog beds', 'orthopedic dog bed'],
    secondaryKeywords: ['senior dog bed', 'washable dog bed', 'crate bed', 'cooling dog bed'],
    awinTopicTags: ['beds', 'sleep', 'comfort', 'home', 'senior-dog'],
    amazonTopicTags: ['bed', 'beds', 'sleep', 'orthopedic', 'comfort', 'home', 'senior-dog'],
    amazonSearches: [
      { id: 'orthopedic-bed', query: 'orthopedic dog bed washable cover', label: 'Orthopedic beds', intent: 'high', tags: ['beds', 'orthopedic'] },
      { id: 'crate-bed', query: 'washable dog crate bed', label: 'Crate beds', intent: 'medium', tags: ['beds', 'crate'] },
      { id: 'cooling-bed', query: 'cooling dog bed', label: 'Cooling beds', intent: 'medium', tags: ['beds', 'cooling'] }
    ],
    relatedClusters: ['senior-dogs', 'puppy', 'travel'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    preferredModules: ['amazon-searches', 'awin-partners', 'size-guide'],
    pseoFamilies: ['beds']
  },
  toys: {
    slug: 'toys',
    type: 'product',
    title: 'Dog Toys & Enrichment',
    shortTitle: 'Toys',
    description: 'Chew toys, puzzle toys, fetch, enrichment and safe play by breed energy and age.',
    icon: '🎾',
    primaryKeywords: ['dog toys', 'best dog toys', 'dog enrichment toys'],
    secondaryKeywords: ['puppy chew toys', 'puzzle toys', 'durable dog toys', 'fetch toys'],
    awinTopicTags: ['toys', 'enrichment', 'training', 'active', 'gear'],
    amazonTopicTags: ['toys', 'toy', 'enrichment', 'chew', 'mental-stimulation', 'puzzle', 'high-energy', 'fetch'],
    amazonSearches: [
      { id: 'puzzle-toys', query: 'dog puzzle toys enrichment', label: 'Puzzle toys', intent: 'medium', tags: ['toys', 'puzzle'] },
      { id: 'durable-chew', query: 'durable dog chew toys', label: 'Durable chew toys', intent: 'high', tags: ['toys', 'chew'] },
      { id: 'fetch-toys', query: 'dog fetch toys', label: 'Fetch toys', intent: 'medium', tags: ['toys', 'fetch'] }
    ],
    relatedClusters: ['puppy', 'training', 'travel'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    preferredModules: ['amazon-searches', 'safety-note', 'breed-energy-links'],
    pseoFamilies: ['toys']
  },
  'pupwiki-partners': {
    slug: 'pupwiki-partners',
    type: 'partner',
    title: 'PupWiki Partners',
    shortTitle: 'Partners',
    description: 'Active partner programmes, AWIN deeplinks, partner profiles, creatives, product feeds and placement rules.',
    icon: '🤝',
    primaryKeywords: ['pupwiki partners', 'dog affiliate partners', 'dog product partners'],
    secondaryKeywords: ['AWIN dog partners', 'pet affiliate programmes', 'partner profile pages'],
    awinTopicTags: ['partner', 'awin', 'affiliate', 'service', 'product'],
    amazonTopicTags: ['partner', 'dog supplies'],
    amazonSearches: [],
    relatedClusters: ['dog-food', 'training', 'beds', 'lifestyle'],
    claimSensitivity: 'low',
    monetizationAllowed: true,
    preferredModules: ['partner-directory', 'partner-profiles', 'disclosure'],
    pseoFamilies: ['partners']
  },
  insurance: {
    slug: 'insurance',
    type: 'service',
    title: 'Pet Insurance Planning',
    shortTitle: 'Insurance',
    description: 'Insurance timing, breed risk planning, vet cost questions and policy-comparison reminders.',
    icon: '🛡️',
    primaryKeywords: ['pet insurance', 'dog insurance', 'puppy insurance'],
    secondaryKeywords: ['breed health risks', 'vet costs', 'accident illness coverage', 'senior dog insurance'],
    awinTopicTags: ['insurance', 'health', 'vet-care', 'puppy', 'senior-dog'],
    amazonTopicTags: [],
    amazonSearches: [],
    relatedClusters: ['puppy', 'senior-dogs', 'health', 'dog-food'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    preferredModules: ['service-partners', 'vet-questions', 'cost-calculator'],
    pseoFamilies: ['insurance']
  },
};

export const CONTENT_CLUSTER_SLUGS = Object.keys(CONTENT_CLUSTERS);

export function getContentCluster(slug?: string | null) {
  if (!slug) return null;
  return CONTENT_CLUSTERS[String(slug).toLowerCase()] ?? null;
}

export function getClustersByType(type: ContentClusterType) {
  return CONTENT_CLUSTER_SLUGS.map((slug) => CONTENT_CLUSTERS[slug]).filter((cluster) => cluster.type === type);
}

export function getClusterAmazonSearches(slug?: string | null) {
  return getContentCluster(slug)?.amazonSearches ?? [];
}

export function getClusterTopicTags(slug?: string | null) {
  const cluster = getContentCluster(slug);
  if (!cluster) return [];
  return Array.from(new Set([...cluster.awinTopicTags, ...cluster.amazonTopicTags]));
}
