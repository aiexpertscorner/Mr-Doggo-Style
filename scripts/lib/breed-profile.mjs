/**
 * scripts/lib/breed-profile.mjs
 *
 * Transforms raw master-breeds.json records into enriched content profiles.
 * Adds computed fields used by the content generator to create breed-specific
 * copy without repeating the same sentence for every breed of the same size.
 *
 * All derived fields are deterministic: the same breed record always produces
 * the same profile.
 */

// ── AKC group → historic role label ───────────────────────────────
const GROUP_ROLE = {
  'Sporting Group':           { role: 'bird-hunting companion', verb: 'retrieve', setting: 'field and wetland' },
  'Herding Group':            { role: 'livestock herder', verb: 'herd', setting: 'farm and field' },
  'Working Group':            { role: 'working and guard dog', verb: 'protect and pull', setting: 'arctic and mountain terrain' },
  'Hound Group':              { role: 'scent and sight hunter', verb: 'track', setting: 'dense woodland and open plain' },
  'Terrier Group':            { role: 'vermin hunter', verb: 'dig and pursue', setting: 'underground and dense brush' },
  'Toy Group':                { role: 'companion and lap dog', verb: 'bond closely', setting: 'palace and parlour' },
  'Non-Sporting Group':       { role: 'versatile companion', verb: 'adapt', setting: 'varied environments' },
  'Foundation Stock Service': { role: 'rare working breed', verb: 'work', setting: 'its region of origin' },
  'Miscellaneous Class':      { role: 'developing breed', verb: 'work', setting: 'its native environment' },
};

// ── coat → grooming complexity score (0–3) ────────────────────────
const COAT_COMPLEXITY = {
  short: 0, hairless: 0,
  medium: 1, double: 1,
  wavy: 2, silky: 2, long: 2,
  wiry: 3, curly: 3, corded: 3,
};

// ── coat → plain-language care description ────────────────────────
const COAT_CARE_LABEL = {
  short:    'minimal — rubber brush weekly, bath monthly',
  hairless: 'skin-only — sunscreen and moisturiser required',
  medium:   'moderate — slicker brush weekly, seasonal deshedding',
  double:   'moderate-high — undercoat rake required; blows coat twice yearly',
  wavy:     'moderate-high — weekly combing through to skin to prevent matting',
  silky:    'high — daily detangling, pin brush only, professional trim every 8–10 weeks',
  long:     'high — daily brushing minimum, professional trim every 8–10 weeks',
  wiry:     'high — hand-stripping required; clipping softens wire texture permanently',
  curly:    'very high — comb to skin daily, professional grooming every 6–8 weeks',
  corded:   'specialist — cords must be separated by hand; mould risk if not dried thoroughly',
};

// ── temperament string → dominant trait keywords ──────────────────
function parseTemperament(str = '') {
  const raw = str.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  // Map synonyms to canonical trait buckets
  const MAP = {
    friendly: ['friendly', 'affectionate', 'loving', 'gentle', 'sweet', 'devoted'],
    energetic: ['active', 'energetic', 'lively', 'playful', 'spirited', 'athletic'],
    protective: ['protective', 'alert', 'watchful', 'courageous', 'fearless', 'vigilant'],
    independent: ['independent', 'stubborn', 'willful', 'aloof', 'reserved', 'dignified'],
    intelligent: ['intelligent', 'smart', 'bright', 'clever', 'quick', 'responsive'],
    calm: ['calm', 'quiet', 'gentle', 'easy-going', 'laid-back', 'serene'],
  };
  const result = [];
  for (const [trait, keywords] of Object.entries(MAP)) {
    if (raw.some(r => keywords.some(k => r.includes(k)))) result.push(trait);
  }
  return result.length ? result : ['adaptable'];
}

// ── energy + training + grooming → owner difficulty score (1–10) ──
function ownerDifficulty(breed) {
  let score = 0;
  score += { active: 4, regular: 2, calm: 1 }[breed.energy_level] || 2;
  score += { difficult: 3, moderate: 2, easy: 1 }[breed.training_level] || 2;
  score += COAT_COMPLEXITY[breed.coat_type] || 1;
  score += { heavy: 2, seasonal: 1, low: 0, minimal: 0 }[breed.shedding_level] || 1;
  // Normalise to 1–10 range (raw max is 12)
  return Math.min(10, Math.max(1, Math.round((score / 12) * 10)));
}

// ── size → puppy price range for content ──────────────────────────
const PUPPY_PRICE = {
  small:  { low: 500,  high: 2000 },
  medium: { low: 800,  high: 3000 },
  large:  { low: 1200, high: 4000 },
  giant:  { low: 1200, high: 3500 },
};

// ── Determine if a breed is a working/job-oriented breed ──────────
function isWorkingHeritage(akc_group = '') {
  return ['Sporting Group','Herding Group','Working Group','Hound Group','Terrier Group']
    .includes(akc_group);
}

// ── Urban suitability: small/calm or small/regular + easy training
function isUrbanFriendly(breed) {
  if (breed.size_category === 'giant') return false;
  if (breed.size_category === 'large' && breed.energy_level === 'active') return false;
  return true;
}

// ── Dominant health concern from breed data ───────────────────────
function primaryHealthConcern(breed) {
  const ailments = breed.ranking_data?.genetic_ailment_names;
  if (ailments && ailments !== 'none') {
    const list = ailments.split(',').map(s => s.trim()).filter(Boolean);
    return list[0] || null;
  }
  // Fall back to group-level concern
  const groupConcerns = {
    'Sporting Group': 'hip dysplasia',
    'Herding Group': 'hip dysplasia',
    'Working Group': 'bloat (GDV)',
    'Hound Group': 'ear infections',
    'Terrier Group': 'skin allergies',
    'Toy Group': 'dental disease',
    'Non-Sporting Group': 'breathing issues',
  };
  return groupConcerns[breed.akc_group] || null;
}

/**
 * Compute a weight string appropriate for copy.
 * e.g. "55–80 lbs (25–36 kg)"
 */
function weightStr(breed) {
  const wt = breed.weight || {};
  if (wt.min_lbs && wt.max_lbs) {
    return `${wt.min_lbs}–${wt.max_lbs} lbs`;
  }
  if (wt.max_lbs) return `up to ${wt.max_lbs} lbs`;
  return null;
}

/**
 * Compute a lifespan string for copy.
 * e.g. "10–12 years"
 */
function lifespanStr(breed) {
  const life = breed.life_expectancy || {};
  const rank = breed.ranking_data || {};
  if (rank.longevity_years) return `${rank.longevity_years} years average`;
  if (life.min && life.max) return `${life.min}–${life.max} years`;
  if (life.max) return `up to ${life.max} years`;
  return '10–13 years';
}

/**
 * Main export: enriches a raw breed record with derived content fields.
 * Returns a new object — never mutates the input.
 */
export function deriveProfile(breed) {
  const groupInfo = GROUP_ROLE[breed.akc_group] || { role: 'companion dog', verb: 'companion', setting: 'the home' };
  const traits = parseTemperament(breed.temperament);
  const coatComplexity = COAT_COMPLEXITY[breed.coat_type] ?? 1;

  return {
    // ── Pass through all original fields ──────────────────────
    ...breed,

    // ── Derived: identity ────────────────────────────────────
    historic_role:      groupInfo.role,
    historic_verb:      groupInfo.verb,
    historic_setting:   groupInfo.setting,
    is_working_heritage: isWorkingHeritage(breed.akc_group),
    is_urban_friendly:  isUrbanFriendly(breed),

    // ── Derived: temperament ─────────────────────────────────
    dominant_traits:    traits,          // e.g. ['friendly', 'energetic']
    is_friendly:        traits.includes('friendly'),
    is_independent:     traits.includes('independent'),
    is_protective:      traits.includes('protective'),

    // ── Derived: care complexity ─────────────────────────────
    coat_care_complexity: coatComplexity, // 0–3
    coat_care_label:    COAT_CARE_LABEL[breed.coat_type] || 'standard — weekly brushing',
    owner_difficulty:   ownerDifficulty(breed),

    // ── Derived: copy-ready strings ──────────────────────────
    weight_str:         weightStr(breed),
    lifespan_str:       lifespanStr(breed),
    puppy_price_range:  PUPPY_PRICE[breed.size_category] || PUPPY_PRICE.medium,

    // ── Derived: health ──────────────────────────────────────
    primary_health_concern: primaryHealthConcern(breed),
    has_known_ailments: !!(breed.ranking_data?.genetic_ailment_names &&
                            breed.ranking_data.genetic_ailment_names !== 'none'),
    ailment_list: breed.ranking_data?.genetic_ailment_names
      ? breed.ranking_data.genetic_ailment_names.split(',').map(s => s.trim()).filter(Boolean)
      : [],

    // ── Derived: intelligence ────────────────────────────────
    has_intelligence_rank: !!(breed.ranking_data?.intelligence_rank),
    intelligence_tier: (() => {
      const r = breed.ranking_data?.intelligence_rank;
      if (!r) return null;
      if (r <= 10)  return 'elite';
      if (r <= 30)  return 'above-average';
      if (r <= 60)  return 'average';
      return 'below-average';
    })(),

    // ── Derived: SEO angle ───────────────────────────────────
    seo_angle: (() => {
      // Pick the most distinctive angle for this breed's SEO copy
      if (breed.ranking_data?.intelligence_rank <= 10) return 'intelligence';
      if (breed.ranking_data?.genetic_ailment_names && breed.ranking_data.genetic_ailment_names !== 'none') return 'health';
      if (coatComplexity >= 3) return 'coat';
      if (breed.size_category === 'giant') return 'giant';
      if (isWorkingHeritage(breed.akc_group)) return 'working';
      if (breed.origin_country && !['United States','United Kingdom'].includes(breed.origin_country)) return 'origin';
      return 'size';
    })(),
  };
}
