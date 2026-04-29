import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const breeds = JSON.parse(readFileSync(join(ROOT, 'src/data/master-breeds.json'), 'utf8'));
const healthData = JSON.parse(readFileSync(join(ROOT, 'src/data/breed-health-profiles.json'), 'utf8'));
const actuarial = JSON.parse(readFileSync(join(ROOT, 'src/data/actuarial-breed-rates.json'), 'utf8'));

const healthProfiles = healthData.profiles;
const breedRates = actuarial.breed_rates;

const OUT_DIR = join(ROOT, 'src/data/enrichment/breeds');
mkdirSync(OUT_DIR, { recursive: true });

const PILOT_SLUGS = [
  'labrador-retriever',
  'german-shepherd-dog',
  'french-bulldog',
  'golden-retriever',
  'poodle-standard',
];

const SIZE_DEFAULTS = { small: 35, medium: 50, large: 70, xlarge: 95 };

function getInsuranceTier(basePremium) {
  if (basePremium >= 80) return 'high';
  if (basePremium >= 55) return 'medium';
  return 'low';
}

function deriveOwnerFit(b) {
  const parts = [];
  if (b.traits?.demeanor_value >= 0.8) parts.push('great with families and children');
  if (b.energy_level === 'active') parts.push('needs an active owner with time for daily exercise');
  if (b.energy_level === 'calm') parts.push('suits apartment living or less active owners');
  if (b.training_level === 'easy') parts.push('highly trainable — ideal for first-time owners');
  if (b.shedding_level === 'heavy') parts.push('expect regular grooming and vacuuming');
  if (b.shedding_level === 'minimal') parts.push('low-shedding coat reduces grooming burden');
  return parts.length ? parts.join('; ') : `The ${b.name} suits owners who can meet its ${b.energy_level || 'moderate'} energy needs.`;
}

function deriveExercise(b) {
  if (b.energy_level === 'active') return 'Needs 90+ minutes of vigorous daily activity — fetch, running, or agility.';
  if (b.energy_level === 'regular') return 'Benefits from 45–60 minutes of daily exercise — walks, play, or structured training.';
  if (b.energy_level === 'calm') return 'Short daily walks (20–30 min) plus mental enrichment are sufficient.';
  return 'Moderate exercise needs — daily walks recommended.';
}

function deriveGrooming(b) {
  if (b.grooming_freq === 'Specialty/Professional') return 'Requires professional grooming every 6–8 weeks; daily brushing prevents matting.';
  if (b.shedding_level === 'heavy') return 'Heavy shedder — brush 3–4× per week; deshedding tools recommended seasonally.';
  if (b.shedding_level === 'seasonal') return 'Seasonal coat blows — daily brushing during spring and autumn shed periods.';
  if (b.shedding_level === 'minimal') return 'Low shedding but coat grows continuously — professional trim every 8–12 weeks.';
  return 'Brush weekly to maintain coat condition and reduce shedding.';
}

function deriveFeeding(b) {
  const size = b.size_category || 'medium';
  const meals = size === 'small' ? '3 small meals' : '2 meals';
  return `Feed ${meals} daily; adjust portions by activity level. ${b.traits?.energy_value >= 0.8 ? 'High-energy breeds benefit from performance formulas.' : 'Maintain healthy body condition — avoid overfeeding.'}`;
}

function deriveMonetizationHooks(b, basePremium) {
  return {
    insurance: getInsuranceTier(basePremium),
    training: b.traits?.trainability_value >= 0.8 ? 'medium' : 'low',
    dna: 'medium',
    grooming: b.grooming_freq === 'Specialty/Professional' ? 'high' : (b.shedding_level === 'heavy' ? 'medium' : 'low'),
    food: b.traits?.energy_value >= 0.8 ? 'high' : 'medium',
    onlineVet: basePremium >= 60 ? 'high' : 'medium',
  };
}

function deriveHealthContext(b, hp) {
  const claimSensitivity = hp?.common_issues?.some(i => i.severity === 'Critical') ? 'high' : 'medium';
  return {
    claimSensitivity,
    disclaimerRequired: claimSensitivity === 'high',
    commonConcerns: (hp?.common_issues || []).slice(0, 4).map(i => i.name),
    vetConversationPrompts: claimSensitivity === 'high'
      ? [`Ask your vet about ${(hp?.common_issues || [])[0]?.name || 'breed-specific health risks'} screening.`]
      : [],
  };
}

let generated = 0;

for (const slug of PILOT_SLUGS) {
  const b = breeds.find(x => x.slug === slug);
  if (!b) { console.warn(`Breed not found: ${slug}`); continue; }

  const hp = healthProfiles.find(x => x.breed_slug === slug);
  const rateEntry = breedRates.find(x => x.breed_slug === slug);
  const basePremium = rateEntry?.base_premium || SIZE_DEFAULTS[b.size_category] || 50;

  const enrichment = {
    breedSlug: slug,
    breedName: b.name,
    contentVersion: 'enrichment-v1',
    updatedAt: '2026-04-29',
    careProfile: {
      summary: `The ${b.name} is a ${b.size_category || 'medium'}-sized breed with ${b.energy_level || 'moderate'} energy and ${b.shedding_level || 'moderate'} shedding.`,
      ownerFit: deriveOwnerFit(b),
      exerciseNeeds: deriveExercise(b),
      trainingNotes: b.training_level === 'easy'
        ? 'Highly trainable — responds well to positive reinforcement and consistency.'
        : b.training_level === 'moderate'
        ? 'Moderate trainability — patient, reward-based training works best.'
        : 'Can be independent; early socialisation and firm but kind training are essential.',
      groomingNotes: deriveGrooming(b),
      feedingContext: deriveFeeding(b),
    },
    costDrivers: {
      food: b.size_category === 'large' || b.size_category === 'xlarge' ? '$60–$90/mo (large breed formula)' : '$30–$55/mo',
      insurance: `~$${basePremium}/mo base (varies by age, state, and plan)`,
      grooming: b.grooming_freq === 'Specialty/Professional' ? '$60–$100 per professional session' : '$15–$30/mo in grooming tools and occasional baths',
      training: 'Group puppy classes from $100–$200; optional private sessions $50–$150/hr',
      vetCare: `Annual wellness visits $200–$400; ${hp?.common_issues?.length ? 'breed-specific screening recommended' : 'routine preventive care'}`,
    },
    healthContext: deriveHealthContext(b, hp),
    monetizationHooks: deriveMonetizationHooks(b, basePremium),
    recommendedBlocks: ['care-profile', 'cost-drivers', 'insurance-cta'],
    internalLinks: [
      { label: `${b.name} cost calculator`, href: `/cost-calculator/${slug}` },
      { label: `${b.name} names`, href: `/dog-names/${slug}` },
    ],
  };

  const outPath = join(OUT_DIR, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(enrichment, null, 2));
  console.log(`✓ ${slug}`);
  generated++;
}

console.log(`\nGenerated ${generated} enrichment files in src/data/enrichment/breeds/`);
