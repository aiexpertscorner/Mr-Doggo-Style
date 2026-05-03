const REVIEW_METHODS = new Set([
  'editorial-research',
  'product-data-comparison',
  'hands-on-test',
  'expert-reviewed',
]);

const REVIEW_METHOD_ALIASES = {
  'editorial-product-comparison': 'product-data-comparison',
  'awin-program-and-product-data-clustering': 'product-data-comparison',
  'awin-backed-pseo-opportunity': 'product-data-comparison',
  'brand-resource-review': 'editorial-research',
};

const MONETIZATION_INTENTS = new Set([
  'none',
  'insurance',
  'food',
  'dna',
  'training',
  'grooming',
  'vet-care',
  'gift',
  'cost',
  'service',
]);

const MONETIZATION_ALIASES = {
  beds: 'cost',
  toys: 'training',
  supplements: 'vet-care',
  health: 'vet-care',
  'dog-food': 'food',
  'partner-cluster': 'service',
  'brand-review': 'service',
  partner: 'service',
  lifestyle: 'gift',
};

export function normalizeReviewMethod(value, fallback = 'editorial-research') {
  const key = String(value || '').trim();
  const normalized = REVIEW_METHOD_ALIASES[key] || key || fallback;
  return REVIEW_METHODS.has(normalized) ? normalized : fallback;
}

export function normalizeMonetizationIntent(value, fallback = 'service') {
  const key = String(value || '').trim();
  const normalized = MONETIZATION_ALIASES[key] || key || fallback;
  return MONETIZATION_INTENTS.has(normalized) ? normalized : fallback;
}

export function sanitizePublicDogCopy(text) {
  return String(text || '')
    .replace(/\bAWIN\b/gi, 'brand')
    .replace(/\bPSEO\b/gi, 'PupWiki')
    .replace(/\bSEO\b/gi, 'search')
    .replace(/affiliated with/gi, 'connected to')
    .replace(/affiliate note/gi, 'reader-support note')
    .replace(/affiliate disclosure/gi, 'reader-support note')
    .replace(/affiliate programmes?/gi, 'brand relationships')
    .replace(/affiliate programs?/gi, 'brand relationships')
    .replace(/affiliate ecosystem/gi, 'reader-supported model')
    .replace(/affiliate links?/gi, 'reader-supported links')
    .replace(/qualifying partner links?/gi, 'reader-supported links')
    .replace(/backend/gi, 'site')
    .replace(/generated from current/gi, 'based on current')
    .replace(/this page is generated/gi, 'this guide is maintained')
    .replace(/generated guides?/gi, 'PupWiki guides')
    .replace(/how this page was refreshed/gi, 'how this guide is maintained')
    .replace(/rich content plan/gi, 'guide plan')
    .replace(/intent graph/gi, 'topic map')
    .replace(/primary intents?/gi, 'reader needs')
    .replace(/related clusters?/gi, 'related dog-care topics')
    .replace(/commerce clusters?/gi, 'dog-care resource groups')
    .replace(/commerce guide/gi, 'dog-care guide')
    .replace(/commerce signal/gi, 'dog-care fit signal')
    .replace(/current shopping modules?/gi, 'current shopping resources')
    .replace(/shopping modules?/gi, 'shopping resources')
    .replace(/amazon search modules?/gi, 'Amazon.com search shortcuts')
    .replace(/product modules?/gi, 'product resources')
    .replace(/partner placements?/gi, 'brand resources')
    .replace(/placement rules?/gi, 'fit notes')
    .replace(/validated product links?/gi, 'reviewed product links')
    .replace(/current active AWIN/gi, 'current brand')
    .replace(/programme data/gi, 'brand information')
    .replace(/program data/gi, 'brand information')
    .replace(/partner programmes?/gi, 'brand resources')
    .replace(/partner programs?/gi, 'brand resources')
    .replace(/content inventory/gi, 'PupWiki guide library')
    .replace(/feed rows?/gi, 'product details')
    .replace(/product-feed rows?/gi, 'product details')
    .replace(/creative\/banner rows?/gi, 'brand assets')
    .replace(/imported creative/gi, 'brand asset')
    .replace(/imported product/gi, 'catalog product')
    .replace(/\bEPC\b:?/gi, 'reader value')
    .replace(/conversion rate:?/gi, 'availability note:')
    .replace(/approval percentage:?/gi, 'brand quality note:')
    .replace(/validation days:?/gi, 'review window:')
    .replace(/deeplink and tracking/gi, 'brand link')
    .replace(/deeplink/gi, 'brand link')
    .replace(/tracking mechanics?/gi, 'link details')
    .replace(/tracking/gi, 'link')
    .replace(/primary partner link/gi, 'main brand link')
    .replace(/template adds/gi, 'guide includes')
    .replace(/why this appears here/gi, 'why dog owners may find this useful')
    .replace(/breed size-fit recommendation box/gi, 'breed sizing notes')
    .replace(/inline slots?/gi, 'inline resources')
    .replace(/\s+\n/g, '\n');
}

export function validatePublicDogCopy(text) {
  const banned = [
    /\bAWIN\b/i,
    /\bPSEO\b/i,
    /\bSEO\b/i,
    /affiliate/i,
    /backend/i,
    /generated from/i,
    /this page is generated/i,
    /programme data/i,
    /program data/i,
    /product-feed rows?/i,
    /\bfeed rows?\b/i,
    /commerce cluster/i,
    /tracking/i,
    /deeplink/i,
    /placement rules?/i,
    /conversion rate/i,
    /\bEPC\b/i,
  ];
  return banned
    .filter((pattern) => pattern.test(text))
    .map((pattern) => String(pattern));
}
