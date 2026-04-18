/**
 * scripts/lib/variant-bank.mjs
 *
 * Anti-repetition copy pool system.
 *
 * pickVariant(breed, pool, segmentKey) selects one entry from a named pool
 * deterministically — same breed + same key always returns the same variant,
 * but different breeds in the same key select different variants, spreading
 * copy across the 277-breed catalogue.
 *
 * Pools are keyed to the segment of the article they serve (intro, energy,
 * coat, health, training, suitability). Each pool contains 5–6 variants that
 * use different breed dimensions so no two same-size breeds read identically.
 */

// ── Deterministic hash (djb2) ─────────────────────────────────────
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h >>>= 0; // keep 32-bit unsigned
  }
  return h;
}

/**
 * Select a variant deterministically.
 * @param {object} breed   - full enriched breed profile from deriveProfile()
 * @param {string[][]} pool - array of template strings (one per variant)
 * @param {string} segmentKey - e.g. "intro", "energy_body", "coat_body"
 * @returns {string} the selected template string (not yet interpolated)
 */
export function pickVariant(breed, pool, segmentKey) {
  const seed = `${breed.slug}::${segmentKey}`;
  const idx  = djb2(seed) % pool.length;
  return pool[idx];
}

/**
 * Interpolate a template string with breed profile values.
 * Placeholders: {{field}} where field is any key on the enriched profile,
 * plus computed shorthands defined here.
 *
 * @param {string} template
 * @param {object} profile  - enriched breed (deriveProfile output)
 * @returns {string}
 */
export function fillTemplate(template, profile) {
  const extras = {
    dominant_trait:    profile.dominant_traits?.[0] ?? 'adaptable',
    second_trait:      profile.dominant_traits?.[1] ?? 'loyal',
    trait_pair:        profile.dominant_traits?.slice(0,2).join(' and ') ?? 'loyal and adaptable',
    price_low:         profile.puppy_price_range?.low  ?? 800,
    price_high:        profile.puppy_price_range?.high ?? 3000,
    weight_or_size:    profile.weight_str ?? `a ${profile.size_category}-sized dog`,
    country_or_group:  profile.origin_country ?? profile.akc_group?.replace(' Group','') ?? 'the UK',
    health_note:       profile.primary_health_concern
                         ? `Watch for ${profile.primary_health_concern}.`
                         : 'Generally a robust breed.',
  };
  const ctx = { ...profile, ...extras };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : `{{${key}}}`
  );
}

// ════════════════════════════════════════════════════════════════════
// COPY POOLS
// Each pool is an array of 5–6 distinct variants.
// Variants intentionally reference different profile dimensions so
// adjacent breeds in the same size/energy bucket read differently.
// ════════════════════════════════════════════════════════════════════

/**
 * Intro paragraph — opening sentence of a breed article.
 * Dimensions used across variants: historic_role, origin_country,
 * akc_group, dominant_traits, intelligence_tier.
 */
export const INTRO_POOL = [
  // Variant 0 — lead with historic role
  `The {{name}} was bred as a {{historic_role}}, and that heritage shapes everything from its daily energy needs to the way it bonds with its family. Originally developed to {{historic_verb}} across {{historic_setting}}, this {{size_category}}-sized breed brings a focused, purposeful temperament to the modern home.`,

  // Variant 1 — lead with origin country + temperament
  `Originating in {{country_or_group}}, the {{name}} earned its reputation as a {{dominant_trait}} companion long before it found its way into family homes around the world. Weighing {{weight_or_size}}, it combines a {{second_trait}} nature with the physical capability its original role demanded.`,

  // Variant 2 — lead with energy level and lifestyle fit
  `If you lead an {{energy_level}}-lifestyle household and want a dog that genuinely keeps pace, the {{name}} is worth a close look. This {{akc_group}} breed thrives when it has a job — even if that job is a daily run — and rewards engaged owners with deep, lasting loyalty.`,

  // Variant 3 — lead with intelligence angle
  `Few {{size_category}}-breed dogs match the {{name}} for sheer responsiveness. Ranked among the {{intelligence_tier}} tier for working intelligence, it picks up new cues quickly and remains engaged through training sessions that would bore a less focused dog. That cognitive drive is an asset — and a responsibility.`,

  // Variant 4 — lead with a distinctive coat or appearance detail
  `The {{name}}'s {{coat_type}} coat is often the first thing people notice, but long-term owners will tell you the personality is what keeps them committed. A {{dominant_trait}}, {{second_trait}} breed with {{akc_group}} roots, it fits households that can match both its grooming schedule and its social needs.`,

  // Variant 5 — lead with the AKC group role + size contrast
  `As a member of the {{akc_group}}, the {{name}} carries instincts honed for {{historic_setting}} — instincts that don't simply switch off in a suburban back garden. Understanding what this breed was built to do is the single biggest factor in owning one successfully.`,
];

/**
 * Energy and exercise section body.
 * Dimensions: energy_level, size_category, is_working_heritage, historic_verb.
 */
export const ENERGY_POOL = [
  // Variant 0 — structured exercise prescription
  `{{name}}s need {{energy_level}} exercise — plan for at least 60–90 minutes of purposeful activity daily. A free-run in a securely fenced area satisfies the instinct to {{historic_verb}}, while structured heel-work and recall practice doubles as mental stimulation. Under-exercised individuals often redirect energy into destructive habits.`,

  // Variant 1 — working-heritage framing
  `The {{name}} was selected for endurance, not just bursts of speed. As a {{historic_role}}, it was expected to work for hours across {{historic_setting}}. Modern life rarely demands that output, but the underlying drive remains — which means daily structured activity is non-negotiable rather than optional.`,

  // Variant 2 — lifestyle-matching angle
  `Whether you run, cycle, or simply take long walks, the {{name}} will match your pace and push for more. {{size_category}}-sized with an {{energy_level}} rating, it suits owners who view daily exercise as a routine rather than an obligation. A 45-minute morning walk followed by a short evening session covers the baseline.`,

  // Variant 3 — mental exercise focus
  `Physical output alone won't satisfy a {{name}}. This {{akc_group}} breed needs mental engagement — scent games, retrieve work, or reward-based training sets — as much as it needs mileage. A tired mind tends to produce a calmer dog at rest than tired legs alone.`,

  // Variant 4 — seasonal and weather considerations
  `The {{name}}'s {{coat_type}} coat was designed for {{historic_setting}}, which gives you clues about weather tolerance. In hot summers, shift exercise to early morning and evening; in winter, most individuals remain keen whatever the weather. Year-round consistency matters more than any single long session.`,
];

/**
 * Training section body.
 * Dimensions: training_level, intelligence_tier, is_independent, historic_verb.
 */
export const TRAINING_POOL = [
  // Variant 0 — reward-based mechanics
  `Training a {{name}} is straightforward when you lean on positive reinforcement. Short sessions (10–15 minutes) with high-value food rewards outperform long correction-based drills. The breed's {{intelligence_tier}}-tier working intelligence means it generalises commands quickly — introduce a new cue in one context and it usually transfers within a session.`,

  // Variant 1 — independent thinker framing
  `The {{name}} thinks for itself — an asset in the field, a challenge in the living room. Early structure matters: enrol in a puppy class within the first two weeks home, establish a marker-based reward system, and set household rules before bad habits take hold. Consistency from every family member prevents selective compliance.`,

  // Variant 2 — working heritage tie-in
  `Because the {{name}} was bred to {{historic_verb}} with minimal handler input, it developed problem-solving independence that can look like stubbornness in a training context. Work with that instinct rather than against it: give it a task, reward success, and keep criteria clear. Ambiguity is what creates frustration for both dog and owner.`,

  // Variant 3 — socialisation-led angle
  `Formal obedience is only part of the {{name}}'s training picture. Broad socialisation — exposure to varied surfaces, sounds, strangers, and other animals — between 8 and 16 weeks determines temperament stability far more than any single command. A well-socialised {{name}} with moderate obedience outperforms a precisely trained but under-socialised one.`,

  // Variant 4 — difficulty-rated advisory
  `Rated {{training_level}} to train, the {{name}} rewards owners who invest in early foundation work. Once core cues (sit, down, stay, recall) are solid, it builds on them readily. Where owners run into trouble is inconsistency — this breed notices and exploits any gap between what is asked and what is enforced.`,
];

/**
 * Coat and grooming section body.
 * Dimensions: coat_type, coat_care_label, shedding_level, coat_care_complexity.
 */
export const COAT_POOL = [
  // Variant 0 — plain-language care prescription
  `The {{name}}'s {{coat_type}} coat requires {{coat_care_label}}. Shedding is {{shedding_level}}, so factor in vacuuming frequency when considering this breed. Getting a puppy used to grooming tools early prevents the brush-avoidance battles that make adult grooming sessions difficult.`,

  // Variant 1 — professional grooming angle
  `Coat maintenance for the {{name}} goes beyond a weekly brush. The {{coat_type}} texture calls for {{coat_care_label}}. Budget for professional grooming appointments in addition to home maintenance — especially if you want the coat to remain in show condition, though most pet owners opt for a practical clip that reduces daily upkeep.`,

  // Variant 2 — shedding-impact framing
  `The {{name}} is a {{shedding_level}} shedder — relevant information if anyone in your household has allergies or strong preferences about dog hair on furniture. A slicker brush and undercoat rake used consistently on a weekly schedule contain the worst of it, with a full deshed recommended at seasonal coat changes.`,

  // Variant 3 — historic coat function context
  `The {{name}}'s {{coat_type}} coat wasn't designed for aesthetics — it was functional protection for {{historic_setting}}. That natural resilience means the coat is robust, but it still needs regular attention: {{coat_care_label}}. Neglecting it leads to matting, skin problems, and a dog that dreads handling.`,

  // Variant 4 — starting young emphasis
  `Establishing a grooming routine in the first weeks home pays dividends for years. The {{name}} has a {{coat_type}} coat with {{shedding_level}} shedding; introducing nail trims, ear checks, and brushing as low-pressure positive experiences makes adult maintenance far simpler. The tools needed: {{coat_care_label}}.`,
];

/**
 * Health section body.
 * Dimensions: primary_health_concern, ailment_list, has_known_ailments,
 *             lifespan_str, size_category.
 */
export const HEALTH_POOL = [
  // Variant 0 — lifespan-first framing
  `The {{name}} has a typical lifespan of {{lifespan_str}} for a {{size_category}}-sized breed. {{health_note}} Responsible breeders screen for heritable conditions and can provide health clearances for both parents. Pet insurance taken out before any diagnosis is confirmed helps contain costs for the conditions most common in this breed.`,

  // Variant 1 — primary concern focus
  `The most important health screening for prospective {{name}} owners centres on {{primary_health_concern}}. Ask breeders for documented clearances, and budget for annual vet check-ups that include specific monitoring for this condition. Early detection changes outcomes significantly. Average lifespan is {{lifespan_str}}.`,

  // Variant 2 — lifestyle management angle
  `Keeping a {{name}} healthy over its {{lifespan_str}} lifespan is largely about prevention: weight management, dental hygiene, annual vet check-ups, and appropriate exercise load for age. The breed's known susceptibilities — particularly {{primary_health_concern}} — are manageable when caught early rather than treated reactively.`,

  // Variant 3 — breeder-vetting focus
  `Health in the {{name}} starts with breeder selection. A reputable breeder will provide OFA or PennHIP certifications, ophthalmology clearances if relevant, and full transparency about {{primary_health_concern}} in the line. Walk away from any litter where health documentation is unavailable or dismissed. Lifespan averages {{lifespan_str}}.`,

  // Variant 4 — insurance-forward framing
  `{{name}}s are generally {{size_category}}-breed dogs with a {{lifespan_str}} lifespan, but no breed is without heritable risk. Pet insurance enrolled at puppyhood, before conditions are pre-existing, is the most effective financial hedge. {{health_note}} Proactive owners spend far less on reactive care over the dog's lifetime.`,
];

/**
 * "Who this breed suits" / suitability section.
 * Dimensions: is_urban_friendly, owner_difficulty, dominant_traits,
 *             is_working_heritage, size_category.
 */
export const SUITABILITY_POOL = [
  // Variant 0 — direct owner profile description
  `The {{name}} suits active owners who have time for daily structured exercise and enjoy a dog that's genuinely engaged with them. It's less suited to first-time owners who haven't researched the breed's {{historic_role}} background, or households where it would be alone for more than four hours at a stretch.`,

  // Variant 1 — urban vs rural framing
  `Urban living works for the {{name}} — provided exercise commitments are met. Its {{size_category}} frame fits a flat or townhouse; its {{dominant_trait}} temperament makes it sociable with neighbours. What it can't tolerate is under-stimulation. A garden is a bonus; a daily 60-minute outing is the requirement.`,

  // Variant 2 — experience-level advisory
  `With an owner difficulty score reflecting {{owner_difficulty}} out of 10, the {{name}} isn't a beginner breed — but it's far from the hardest. Owners who've had dogs before and understand reward-based training will find the learning curve manageable. Those starting from scratch benefit from committing to a structured puppy class.`,

  // Variant 3 — family and kids angle
  `Families with children often find the {{name}} a natural fit: its {{trait_pair}} nature translates to tolerant, engaged play. Supervision with very young children is standard advice for any breed this size, but the {{name}}'s baseline temperament is strongly in its favour. It adapts to household rhythms once its exercise baseline is met.`,

  // Variant 4 — working owner framing
  `The {{name}} can adapt to a working owner's schedule if structure is consistent. A reliable morning exercise slot, midday enrichment (puzzle feeder, frozen Kong), and an evening activity session covers the baseline. Dog walkers or daycare on longer days help maintain the social contact this {{dominant_trait}} breed needs.`,
];

/**
 * Cost / ownership cost intro.
 * Dimensions: size_category, puppy_price_range, coat_care_complexity, energy_level.
 */
export const COST_POOL = [
  // Variant 0 — total cost framing
  `Owning a {{name}} costs more than the purchase price. A puppy from a health-tested litter runs {{price_low}}–{{price_high}} USD; ongoing annual costs — food, vet, insurance, grooming — typically add up to $2,000–$4,500 depending on your region and the dog's health. Factor in the {{coat_type}} coat's grooming demands when budgeting.`,

  // Variant 1 — size-based cost driver
  `As a {{size_category}}-sized breed, the {{name}} sits in the mid-to-upper range of ongoing ownership costs. Food bills scale with body weight; vet bills scale with complexity of procedures. Budget conservatively, especially in the first year when vaccinations, spay/neuter, and starter supplies add a one-time premium of $800–$1,500 to baseline costs.`,

  // Variant 2 — grooming cost spotlight
  `Grooming is the cost category {{name}} owners most often underestimate. The {{coat_type}} coat requires professional attention on a schedule — averaged across the year, this can represent $400–$1,200 in grooming fees alone. Owners who learn to handle maintenance between appointments recoup most of that cost over the dog's {{lifespan_str}} lifespan.`,

  // Variant 3 — insurance-centric framing
  `The single smartest financial decision for a {{name}} owner is pet insurance enrolled at puppyhood. Monthly premiums of $40–$90 ({{size_category}}-breed range) provide meaningful protection against the surgical costs associated with {{primary_health_concern}} and other conditions common to this breed. Uninsured emergency vet visits routinely exceed $3,000.`,
];
