#!/usr/bin/env node
/**
 * Audit rendered/public-facing source copy for internal generator/backend wording.
 *
 * This scans visible page/component/content copy, not scripts, Astro frontmatter,
 * implementation comments, or metadata-only JSON. It intentionally fails the build
 * when backend, generator, network, affiliate-network, or planning language leaks
 * into public content.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'src/pages',
  'src/components',
  'src/content/blog',
  'src/layouts',
];

const ALLOWED_FILES = new Set([
  // Legal/transparency pages are the only public pages allowed to mention
  // affiliate relationships explicitly.
  'src/pages/disclosure.astro',
  'src/pages/privacy.astro',
]);

const BANNED = [
  /\bAWIN\b/i,
  /rich content plan/i,
  /intent graph/i,
  /primary intents?/i,
  /amazon search modules?/i,
  /related clusters?/i,
  /generated guides?/i,
  /generated from current/i,
  /this page is generated/i,
  /powered by .*intent/i,
  /product modules?/i,
  /partner placements?/i,
  /placement rules?/i,
  /why this appears here/i,
  /validated product link/i,
  /breed size-fit recommendation box/i,
  /inline slots?/i,
  /product-feed rows?/i,
  /feed rows?/i,
  /creative\/banner rows?/i,
  /imported creative/i,
  /imported product/i,
  /AWIN KPI/i,
  /EPC:/i,
  /conversion rate:/i,
  /approval percentage:/i,
  /validation days:/i,
  /deeplink and tracking/i,
  /primary partner link/i,
  /current active AWIN/i,
  /programme data/i,
  /program data/i,
  /partner programme/i,
  /partner program/i,
  /affiliate ecosystem/i,
  /affiliate disclosure/i,
  /affiliate links?/i,
  /qualifying partner links?/i,
  /current shopping modules?/i,
  /commerce cluster/i,
  /content inventory/i,
  /backend/i,
  /template adds/i,
  /how this page was refreshed/i,
  /PSEO/i,
];

const ALLOWED_LINE_PATTERNS = [
  // This phrase is user-facing privacy copy for a local-only tool, not an
  // implementation leak.
  /no account,\s*no backend,\s*no saved user profile/i,
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return text;
  return text.slice(end + 4);
}

function stripCodeComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function stripInlineScripts(text) {
  return text.replace(/<script\b[\s\S]*?<\/script>/gi, '');
}

function stripAttributes(text) {
  // Keep tag bodies visible, but avoid false positives from class names,
  // data attributes and rel values that are not reader-visible copy.
  return text.replace(/<([A-Za-z][A-Za-z0-9:-]*)(\s[^>]*)?>/g, '<$1>');
}

function publicTextFor(file) {
  const raw = readFileSync(file, 'utf8');
  const ext = extname(file);
  if (ext === '.md' || ext === '.mdx') return stripFrontmatter(raw);
  if (ext === '.astro') return stripAttributes(stripCodeComments(stripInlineScripts(stripFrontmatter(raw))));
  return raw;
}

const files = TARGETS.flatMap((target) => walk(resolve(ROOT, target)))
  .filter((file) => ['.astro', '.md', '.mdx'].includes(extname(file)))
  .filter((file) => !ALLOWED_FILES.has(relative(ROOT, file).replace(/\\/g, '/')));

const hits = [];
for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const text = publicTextFor(file);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (ALLOWED_LINE_PATTERNS.some((pattern) => pattern.test(line))) return;
    for (const pattern of BANNED) {
      if (pattern.test(line)) {
        hits.push({ file: rel, line: index + 1, pattern: String(pattern), snippet: line.trim().slice(0, 220) });
      }
    }
  });
}

if (hits.length) {
  console.error('\nPublic copy audit failed. Remove internal/generator/backend wording before deploying.\n');
  console.error(JSON.stringify({ count: hits.length, hits: hits.slice(0, 100) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, scanned: files.length }, null, 2));
