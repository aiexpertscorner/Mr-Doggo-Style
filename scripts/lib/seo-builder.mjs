/**
 * scripts/lib/seo-builder.mjs
 *
 * Generates per-breed SEO title and meta description.
 *
 * Uses the `seo_angle` field from deriveProfile() to select one of six
 * angle templates. This eliminates the near-duplicate title problem where
 * every large active breed gets "Large Active Dog Breed Guide".
 *
 * All templates are ≤ 60 characters for title and ≤ 160 for description.
 */

/**
 * Title templates keyed by seo_angle.
 * Placeholders: {{name}}, {{origin_country}}, {{akc_group_short}},
 *               {{size_category}}, {{coat_type}}, {{lifespan_str}}, {{weight_str}}
 *
 * All templates produce ≤60 chars for typical values.
 */
const TITLE_TEMPLATES = {
  intelligence:
    '{{name}}: One of the World\'s Most Intelligent Dogs',

  health:
    '{{name}} Health Guide: What Every Owner Must Know',

  coat:
    '{{name}} Grooming Guide: {{coat_type}} Coat Care',

  giant:
    '{{name}}: Giant Breed Care, Costs & Lifespan',

  working:
    '{{name}}: {{akc_group_short}} Breed — Training & Energy Guide',

  origin:
    '{{name}}: A Dog Breed from {{origin_country}}',

  size:
    '{{name}} Breed Guide: Traits, Care & Costs',
};

/**
 * Description templates keyed by seo_angle.
 * Each ≤ 160 characters when filled with typical values.
 * Placeholders match TITLE_TEMPLATES plus any field from deriveProfile().
 */
const DESC_TEMPLATES = {
  intelligence:
    'The {{name}} ranks in the elite tier for working intelligence. Discover training tips, exercise needs, and care advice for this exceptionally responsive {{size_category}} breed.',

  health:
    'Everything you need to know about {{name}} health: lifespan of {{lifespan_str}}, key conditions to screen for, and how to keep your {{size_category}} dog thriving for years.',

  coat:
    'The {{name}}\'s {{coat_type}} coat needs {{coat_care_label}}. Full grooming guide, shedding management tips, and professional vs home-care cost breakdown.',

  giant:
    'The {{name}} is a gentle giant weighing {{weight_or_size}}. Complete guide to giant-breed nutrition, joint health, exercise, and typical lifespan of {{lifespan_str}}.',

  working:
    'As a {{historic_role}}, the {{name}} needs purpose and structure. Training guide, daily exercise requirements, and suitability advice for active families.',

  origin:
    'The {{name}} comes from {{origin_country}} — and its heritage shapes everything about its temperament. Breed guide covering traits, care, and what to expect as an owner.',

  size:
    'Complete {{name}} breed guide: temperament, exercise needs, grooming, health, and true ownership costs. Everything to know before bringing one home.',
};

// ── Helper: strip " Group" from AKC group string ──────────────────
function shortGroup(akc_group = '') {
  return akc_group.replace(' Group', '').replace(' Class', '').replace(' Service', '');
}

/**
 * Build SEO title and description for one breed.
 *
 * @param {object} profile - enriched breed from deriveProfile()
 * @returns {{ title: string, description: string }}
 */
export function buildSEO(profile) {
  const angle = profile.seo_angle || 'size';

  const ctx = {
    ...profile,
    akc_group_short:  shortGroup(profile.akc_group),
    weight_or_size:   profile.weight_str ?? `${profile.size_category}-sized`,
    country_or_group: profile.origin_country ?? shortGroup(profile.akc_group),
    // Truncate coat_care_label to first clause (before the em dash) for brevity
    coat_care_label:  (profile.coat_care_label ?? 'regular brushing').split('—')[0].trim(),
    coat_type:        profile.coat_type ? profile.coat_type.charAt(0).toUpperCase() + profile.coat_type.slice(1) : 'Standard',
    lifespan_str:     profile.lifespan_str ?? '10–13 years',
    historic_role:    profile.historic_role ?? 'companion dog',
  };

  const title = fill(TITLE_TEMPLATES[angle] ?? TITLE_TEMPLATES.size, ctx);
  const description = fill(DESC_TEMPLATES[angle] ?? DESC_TEMPLATES.size, ctx);

  return { title: truncate(title, 60), description: truncate(description, 160) };
}

/**
 * Build SEO for every breed in an array and return keyed map.
 * @param {object[]} profiles - array of deriveProfile() results
 * @returns {Map<string, {title:string, description:string}>} keyed by breed.slug
 */
export function buildSEOMap(profiles) {
  const map = new Map();
  for (const p of profiles) {
    map.set(p.slug, buildSEO(p));
  }
  return map;
}

// ── Internal helpers ──────────────────────────────────────────────

function fill(template, ctx) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : `{{${key}}}`
  );
}

function truncate(str, max) {
  if (str.length <= max) return str;
  // Cut at last word boundary before max
  return str.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// ── CLI usage: node scripts/lib/seo-builder.mjs [slug] ───────────
if (process.argv[1].endsWith('seo-builder.mjs')) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const { deriveProfile } = await import('./breed-profile.mjs');
  const breeds = require('../../src/data/master-breeds.json');
  const slug = process.argv[2];

  if (slug) {
    const b = breeds.find(x => x.slug === slug);
    if (!b) { console.error(`Breed not found: ${slug}`); process.exit(1); }
    const p = deriveProfile(b);
    const seo = buildSEO(p);
    console.log(`Angle : ${p.seo_angle}`);
    console.log(`Title : ${seo.title}`);
    console.log(`Desc  : ${seo.description}`);
  } else {
    // Preview distribution across all breeds
    const profiles = breeds.map(deriveProfile);
    const angleCounts = {};
    for (const p of profiles) {
      angleCounts[p.seo_angle] = (angleCounts[p.seo_angle] || 0) + 1;
    }
    console.log('SEO angle distribution across all breeds:');
    for (const [angle, count] of Object.entries(angleCounts).sort((a,b) => b[1]-a[1])) {
      console.log(`  ${angle.padEnd(14)} ${count}`);
    }
    // Show 3 sample titles per angle
    console.log('\nSample titles by angle:');
    const shown = {};
    for (const p of profiles) {
      if (!shown[p.seo_angle] || shown[p.seo_angle] < 3) {
        const seo = buildSEO(p);
        console.log(`  [${p.seo_angle}] ${seo.title}`);
        shown[p.seo_angle] = (shown[p.seo_angle] || 0) + 1;
      }
    }
  }
}
