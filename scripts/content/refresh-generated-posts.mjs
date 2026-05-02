import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  buildPseoCopy,
  getPseoFamilyFromFilename,
} from '../lib/pseo-copy-engine.mjs';

const ROOT = process.cwd();
const BLOG_DIR = resolve(ROOT, 'src/content/blog');
const BREEDS_PATH = resolve(ROOT, 'src/data/master-breeds.json');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply');

const breeds = existsSync(BREEDS_PATH)
  ? JSON.parse(readFileSync(BREEDS_PATH, 'utf8'))
  : [];

const breedBySlug = new Map(breeds.map((breed) => [breed.slug, breed]));

function hash(value) {
  let h = 2166136261;
  for (const char of value) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const start = text.startsWith('---\r\n') ? 5 : 4;
  const end = text.indexOf('\n---', start);
  if (end === -1) return null;
  return {
    raw: text.slice(start, end),
    body: text.slice(end + 4).replace(/^\r?\n/, ''),
  };
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

function cleanBody(body, copy, breed) {
  let next = body;

  next = next.replace(/^> \*\*Disclosure:\*\*.*(?:\r?\n)?/gm, '');
  next = next.replace(/^\*\*\$?[\d,.]+(?:\.\d{2})? \| [^\n]+\*\*\r?\n\r?\n/gm, '');
  next = next.replace(/\| Price \|/g, '| Availability |');
  next = next.replace(/\| \$[\d,.]+(?:\.\d{2})? \|/g, '| Retailer page |');
  next = next.replace(/\[Check current price(?: on Amazon)?(?: ->| →)?\]/g, (label) => {
    const options = [
      'View current Amazon availability',
      'Check Amazon.com details',
      'Compare on Amazon.com',
      'See current Amazon listing',
    ];
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

  const refreshNote = [
    `## How this page was refreshed`,
    ``,
    `This guide now separates editorial guidance from shopping modules. The article explains fit, trade-offs, and breed context; the page template adds current AWIN and Amazon.com components from active data feeds where appropriate.`,
    ``,
  ].join('\n');

  if (!next.includes('## How this page was refreshed')) {
    const firstHeading = next.search(/\n## /);
    if (firstHeading > -1) next = `${next.slice(0, firstHeading)}\n\n${refreshNote}\n${next.slice(firstHeading + 1)}`;
    else next = `${refreshNote}\n${next}`;
  }

  next = next.replace(
    /(active data feeds where appropriate\.)\r?\n(## )/g,
    '$1\n\n$2'
  );

  return next.replace(/\n{4,}/g, '\n\n\n').trimStart();
}

function findFamily(filename) {
  return getPseoFamilyFromFilename(filename);
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
    generated: 'true',
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
