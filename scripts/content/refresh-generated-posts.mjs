import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  buildPseoCopy,
  getPseoFamilyFromFilename,
} from '../lib/pseo-copy-engine.mjs';

const ROOT = process.cwd();
const BLOG_DIR = resolve(ROOT, 'src/content/blog');
const BREEDS_PATH = resolve(ROOT, 'src/data/master-breeds.json');
const CLUSTERS_PATH = resolve(ROOT, 'src/lib/content/contentClusterConfig.ts');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply');

const breeds = existsSync(BREEDS_PATH) ? JSON.parse(readFileSync(BREEDS_PATH, 'utf8')) : [];
const breedBySlug = new Map(breeds.map((breed) => [breed.slug, breed]));

const FAMILY_TO_CLUSTER = {
  food: 'dog-food',
  toys: 'toys',
  beds: 'beds',
  grooming: 'grooming',
  supplements: 'supplements',
  health: 'health',
  training: 'training',
  puppy: 'puppy',
  'senior-dogs': 'senior-dogs',
  insurance: 'insurance',
};

function loadClusterMeta() {
  if (!existsSync(CLUSTERS_PATH)) return {};
  const text = readFileSync(CLUSTERS_PATH, 'utf8');
  const meta = {};
  const slugMatches = [...text.matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((m) => m[1]).filter((slug) => slug !== 'slug');
  for (const slug of slugMatches) {
    const start = text.indexOf(`${slug}: {`) >= 0 ? text.indexOf(`${slug}: {`) : text.indexOf(`'${slug}': {`);
    const slice = start >= 0 ? text.slice(start, start + 2400) : '';
    const awin = [...slice.matchAll(/awinTopicTags:\s*\[([^\]]*)\]/g)][0]?.[1] || '';
    const amazon = [...slice.matchAll(/amazonTopicTags:\s*\[([^\]]*)\]/g)][0]?.[1] || '';
    const searches = [...slice.matchAll(/query:\s*'([^']+)'/g)].map((m) => m[1]);
    meta[slug] = {
      partnerTopicTags: [...awin.matchAll(/'([^']+)'/g)].map((m) => m[1]),
      amazonTopicTags: [...amazon.matchAll(/'([^']+)'/g)].map((m) => m[1]),
      amazonSearches: searches,
    };
  }
  return meta;
}

const clusterMeta = loadClusterMeta();

function hash(value) {
  let h = 2166136261;
  for (const char of value) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(list, seed) {
  return list[hash(seed) % list.length];
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const start = text.startsWith('---\r\n') ? 5 : 4;
  const end = text.indexOf('\n---', start);
  if (end === -1) return null;
  return { raw: text.slice(start, end), body: text.slice(end + 4).replace(/^\r?\n/, '') };
}

function setYaml(raw, updates) {
  const lines = raw.split(/\r?\n/);
  const used = new Set();
  const output = lines.map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (!match) return line;
    const key = match[1];
    if (!(key in updates)) return line;
    used.add(key);
    return `${key}: ${updates[key]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!used.has(key)) output.push(`${key}: ${value}`);
  }
  return output.join('\n');
}

function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function yamlList(values) {
  return `[${Array.from(new Set(values.filter(Boolean))).map(quote).join(', ')}]`;
}

function sectionHeadingFor(copy, breed) {
  const optionsByFamily = {
    food: [
      `How to choose food for a ${breed.name}`,
      `${breed.name} feeding fit checklist`,
      `What matters most for ${breed.name} nutrition`,
    ],
    toys: [
      `How to choose toys for a ${breed.name}`,
      `${breed.name} enrichment checklist`,
      `What matters most in ${breed.name} play`,
    ],
    beds: [
      `How to choose a bed for a ${breed.name}`,
      `${breed.name} sleep and comfort checklist`,
      `What matters most in ${breed.name} bed fit`,
    ],
    grooming: [
      `How to choose grooming tools for a ${breed.name}`,
      `${breed.name} coat-care checklist`,
      `What matters most in ${breed.name} grooming`,
    ],
    supplements: [
      `Supplement questions for ${breed.name} owners`,
      `${breed.name} supplement safety checklist`,
      `What to review before buying supplements for a ${breed.name}`,
    ],
    health: [
      `Health planning for ${breed.name} owners`,
      `${breed.name} vet-care checklist`,
      `What to watch and discuss with your vet`,
    ],
    training: [
      `How to train a ${breed.name} with daily structure`,
      `${breed.name} training checklist`,
      `What matters most in ${breed.name} training`,
    ],
  };
  return pick(optionsByFamily[copy.familyKey] || [`How to compare options for a ${breed.name}`], `${breed.slug}:${copy.familyKey}:section-heading`);
}

function readerSection(copy, breed) {
  const size = breed.size_category || 'their size';
  const energy = breed.energy_level || 'daily';
  const coat = breed.coat_type || 'coat';
  const heading = sectionHeadingFor(copy, breed);

  const bulletsByFamily = {
    food: [
      `Match calories and portions to a ${size} dog with ${energy} energy rather than choosing by marketing claims alone.`,
      `Compare life-stage labels, protein source, digestibility notes, and whether the formula suits your dog’s current body condition.`,
      `For allergies, pancreatitis, kidney disease, prescription diets, or unexplained symptoms, involve your veterinarian before changing food.`,
    ],
    toys: [
      `Choose toys that fit the dog’s jaw size, play style, and chewing intensity.`,
      `Rotate puzzle toys, fetch toys, and calm chewing options so enrichment does not become repetitive.`,
      `Supervise new toys first and remove pieces that crack, splinter, or become small enough to swallow.`,
    ],
    beds: [
      `Measure your dog from nose to tail base and add room for stretching, curling, and changing positions.`,
      `Prioritize washable covers, stable support, and non-slip placement for daily home use.`,
      `For senior dogs or dogs showing stiffness, compare supportive foam and discuss pain or mobility changes with your veterinarian.`,
    ],
    grooming: [
      `Match brushes and combs to the ${coat} coat instead of buying a generic grooming kit.`,
      `Build a short routine around brushing, nail checks, ear checks, and bath timing.`,
      `Stop and ask a groomer or veterinarian if you see irritated skin, sores, persistent itching, or sudden coat changes.`,
    ],
    supplements: [
      `Treat supplements as optional support, not a replacement for diagnosis, diet, medication, or veterinary care.`,
      `Compare active ingredients, dose instructions, third-party quality cues, and whether the product fits your dog’s life stage.`,
      `Ask your veterinarian about interactions if your dog takes medication or has a known health condition.`,
    ],
    health: [
      `Use breed-risk information as a planning tool, not as a diagnosis.`,
      `Track changes in appetite, movement, breathing, skin, stool, weight, and behavior so your vet has useful context.`,
      `Ask about screening, preventive care, insurance timing, and when symptoms should be treated as urgent.`,
    ],
    training: [
      `Keep sessions short, repeatable, and reward-based so progress fits a real daily routine.`,
      `Practice recall, leash skills, calm greetings, and settle work before adding harder distractions.`,
      `For fear, reactivity, guarding, or aggression, work with a qualified positive-reinforcement trainer or behavior professional.`,
    ],
  };

  const bullets = bulletsByFamily[copy.familyKey] || [
    `Compare the option against your dog’s size, age, routine, and health context.`,
    `Check current product or service details before buying.`,
    `Prioritize safe, practical choices over generic best-seller claims.`,
  ];

  return [
    `## ${heading}`,
    ``,
    `${breed.name} owners get the best results when they start with the dog in front of them: age, size, energy, coat, health history, and daily routine. Use this guide as a comparison framework, then confirm current details on the product or service page before making a decision.`,
    ``,
    ...bullets.map((item) => `- ${item}`),
    ``,
  ].join('\n');
}

function removeInternalSections(body) {
  let next = body;
  const internalHeadingPatterns = [
    /## How this page was refreshed[\s\S]*?(?=\n## |\n# |$)/gi,
    /## Rich content plan[\s\S]*?(?=\n## |\n# |$)/gi,
    /## Placement rules[\s\S]*?(?=\n## |\n# |$)/gi,
    /## Commerce modules[\s\S]*?(?=\n## |\n# |$)/gi,
  ];
  for (const pattern of internalHeadingPatterns) next = next.replace(pattern, '');
  next = next.replace(/^> \*\*Disclosure:\*\*.*(?:\r?\n)?/gm, '');
  next = next.replace(/This guide now separates editorial guidance from shopping modules[\s\S]*?(?=\n\n|$)/gi, '');
  return next;
}

function cleanBody(body, copy, breed) {
  let next = removeInternalSections(body);

  next = next.replace(/^\*\*\$?[\d,.]+(?:\.\d{2})? \| [^\n]+\*\*\r?\n\r?\n/gm, '');
  next = next.replace(/\| Price \|/g, '| Availability |');
  next = next.replace(/\| \$[\d,.]+(?:\.\d{2})? \|/g, '| Retailer page |');
  next = next.replace(/\[Check current price(?: on Amazon)?(?: ->| →)?\]/g, (label) => {
    const options = ['View current Amazon availability', 'Check Amazon.com details', 'Compare on Amazon.com', 'See current Amazon listing'];
    return `[${options[hash(`${breed.slug}:${copy.familyKey}:${label}`) % options.length]}]`;
  });

  next = next.replace(/## Quick Comparison: Best Dog Foods? for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Quick Comparison: Best Toys for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Quick Comparison: Best Beds for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Best Grooming Tools for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Top Picks for .+/g, `## ${copy.headings.picks}`);
  next = next.replace(/## Why .+ Have Specific Nutrition Needs/g, `## ${copy.headings.why}`);
  next = next.replace(/## Why .+ Need Breed-Specific Toys/g, `## ${copy.headings.why}`);
  next = next.replace(/## Why .+ Need Specific Beds/g, `## ${copy.headings.why}`);

  const guideSection = readerSection(copy, breed);
  const firstHeading = next.search(/\n## /);
  if (firstHeading > -1) next = `${next.slice(0, firstHeading)}\n\n${guideSection}\n${next.slice(firstHeading + 1)}`;
  else next = `${guideSection}\n${next}`;

  next = next.replace(/\bAWIN\b/gi, 'partner');
  next = next.replace(/affiliate partner/gi, 'partner resource');
  next = next.replace(/affiliate links?/gi, 'partner links');
  next = next.replace(/shopping modules?/gi, 'shopping resources');
  next = next.replace(/internal-link modules?/gi, 'related PupWiki guides');
  next = next.replace(/validated product links?/gi, 'reviewed product links');
  next = next.replace(/fallback Amazon\.com search cards?/gi, 'Amazon.com search shortcuts');

  return next.replace(/\n{4,}/g, '\n\n\n').trimStart();
}

function findFamily(filename) {
  return getPseoFamilyFromFilename(filename);
}

function buildClusterTags(copy, breed) {
  const cluster = FAMILY_TO_CLUSTER[copy.familyKey] || copy.intent || copy.category.toLowerCase();
  const meta = clusterMeta[cluster] || {};
  return {
    cluster,
    tags: [
      copy.familyKey,
      cluster,
      copy.intent,
      copy.category,
      breed.slug,
      breed.name,
      breed.size_category,
      breed.energy_level,
      breed.training_level,
      breed.coat_type,
      ...(meta.partnerTopicTags || []),
      ...(meta.amazonTopicTags || []),
    ],
    amazonQueries: meta.amazonSearches || [],
  };
}

let scanned = 0;
let changed = 0;

for (const filename of readdirSync(BLOG_DIR).filter((file) => file.endsWith('.md'))) {
  const match = findFamily(filename);
  if (!match) continue;
  const breed = breedBySlug.get(match.breedSlug);
  if (!breed) continue;

  scanned++;
  const path = join(BLOG_DIR, filename);
  const original = readFileSync(path, 'utf8');
  const parsed = parseFrontmatter(original);
  if (!parsed) continue;

  const copy = buildPseoCopy(match.familyKey, breed);
  const clusterData = buildClusterTags(copy, breed);

  const updatedYaml = setYaml(parsed.raw, {
    title: quote(copy.seoTitle),
    seoTitle: quote(copy.seoTitle),
    displayTitle: quote(copy.displayTitle),
    titlePattern: quote(copy.titlePattern),
    description: quote(copy.description),
    updatedDate: TODAY,
    category: quote(copy.category),
    postType: quote(copy.postType),
    contentTier: quote(copy.contentTier),
    cluster: quote(clusterData.cluster),
    productFamilies: yamlList([copy.familyKey, clusterData.cluster]),
    awinTopicTags: yamlList(clusterData.tags),
    amazonQueries: yamlList(clusterData.amazonQueries),
    internalLinkTargets: yamlList([`/breeds/${breed.slug}`, `/categories/${clusterData.cluster}`, '/cost-calculator', '/dog-names', '/categories/puppy', '/categories/senior-dogs', '/categories/insurance']),
    generated: 'true',
    indexInBlog: 'false',
    reviewMethod: quote(copy.reviewMethod),
    claimSensitivity: quote(copy.claimSensitivity),
    monetizationIntent: quote(copy.monetizationIntent),
    affiliateDisclosure: 'true',
    medicalDisclaimer: copy.medicalDisclaimer ? 'true' : 'false',
  });

  const body = cleanBody(parsed.body, copy, breed);
  const next = `---\n${updatedYaml}\n---\n\n${body}`;

  if (next !== original) {
    changed++;
    if (APPLY) writeFileSync(path, next, 'utf8');
  }
}

console.log(JSON.stringify({ apply: APPLY, scanned, changed }, null, 2));
