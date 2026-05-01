/**
 * matchProducts.ts
 * Smart product-to-page-context matching for AWIN affiliate slots.
 * Scores products by topic relevance, image quality, and program priority.
 */

import programConfig from '../../data/awin-program-config.json';

export type ProductRecord = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  url: string;
  image: string;
  merchant: string;
  category: string;
  programId?: string;
  topicTags?: string[];
  priority?: number;
};

export type MatchContext = {
  topicTags?: string[];
  pageType?: string;
  category?: string;
  breedSize?: string;
  breedEnergy?: string;
  breedTraining?: string;
  excludeProductIds?: string[];
  limit?: number;
  monetizationIntent?: 'high' | 'medium' | 'low' | string;
};

const normalize = (s?: string | null) => (s ?? '').toLowerCase().trim().replace(/[-_\s]+/g, '-');

function getProgramForProduct(product: ProductRecord) {
  const merchant = normalize(product.merchant);
  return programConfig.programs.find((p) => {
    const label = normalize(p.label);
    return merchant.includes(label) || (product.programId && product.programId === p.id);
  });
}

function scoreProduct(product: ProductRecord, context: MatchContext): number {
  let score = 0;

  const program = getProgramForProduct(product);
  const programTags = program?.topicTags?.map(normalize) ?? [];
  const programPageTypes = program?.pageTypes ?? [];

  // Page type match
  if (context.pageType && programPageTypes.includes(context.pageType)) score += 2;

  // Topic tag overlap
  const ctxTags = (context.topicTags ?? []).map(normalize);
  const ctxCat = normalize(context.category);

  for (const tag of ctxTags) {
    if (programTags.includes(tag)) score += 3;
  }
  if (ctxCat && programTags.includes(ctxCat)) score += 2;

  // Product-level topic tags
  for (const tag of (product.topicTags ?? []).map(normalize)) {
    if (ctxTags.includes(tag)) score += 2;
  }

  // Program priority base
  score += (program?.priority ?? 50) / 40;
  const normalizedName = normalize(product.name);
  const normalizedCategory = normalize(product.category);

  // Intent-aware scoring (higher commercial intent pages get stronger buyer-signal products)
  const intent = normalize(context.monetizationIntent);
  if (intent === 'high') {
    if (normalizedName.includes('best') || normalizedName.includes('top')) score += 1.5;
    if (normalizedCategory.includes('training') || normalizedCategory.includes('food')) score += 1;
  } else if (intent === 'medium') {
    if (normalizedCategory.includes('accessories') || normalizedCategory.includes('health')) score += 0.75;
  }

  // Image available bonus
  if (product.image && product.image.length > 5) score += 1;

  // Specific deep link (not just homepage) bonus
  if (product.url && !product.url.includes('tidd.ly')) score += 1;

  // Breed size modifiers
  if (context.breedSize) {
    const sz = normalize(context.breedSize);
    if (sz === 'small' && normalize(product.name).includes('small')) score += 1;
    if (sz === 'large' && normalize(product.name).includes('large')) score += 1;
  }

  return score;
}

export function matchProducts(
  products: ProductRecord[],
  context: MatchContext
): ProductRecord[] {
  const excluded = new Set(context.excludeProductIds ?? []);
  const limit = context.limit ?? 3;

  return products
    .filter((p) => !excluded.has(p.id))
    .map((p) => ({ product: p, score: scoreProduct(p, context) }))
    .sort((a, b) => b.score - a.score)
    .filter((entry, idx, arr) => arr.findIndex((x) => normalize(x.product.merchant) === normalize(entry.product.merchant)) === idx)
    .slice(0, limit)
    .map((r) => r.product);
}

export function matchTopProduct(
  products: ProductRecord[],
  context: MatchContext
): ProductRecord | null {
  const results = matchProducts(products, { ...context, limit: 1 });
  return results[0] ?? null;
}

/** Group products by program — useful for multi-program grids */
export function groupByProgram(products: ProductRecord[]) {
  const groups: Record<string, ProductRecord[]> = {};
  for (const p of products) {
    const prog = getProgramForProduct(p);
    const key = prog?.id ?? 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return groups;
}

/** Get all topic tags this context should match (normalized) */
export function buildContextTags(context: MatchContext): string[] {
  const tags = new Set<string>();
  for (const t of context.topicTags ?? []) tags.add(normalize(t));
  if (context.category) tags.add(normalize(context.category));
  if (context.breedEnergy) tags.add(normalize(context.breedEnergy));
  if (context.breedTraining) tags.add(normalize(context.breedTraining));
  return [...tags];
}
