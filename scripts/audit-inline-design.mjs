#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src/pages', 'src/components', 'src/layouts', 'src/styles'];
const EXTENSIONS = new Set(['.astro', '.tsx', '.ts', '.css']);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return EXTENSIONS.has(full.slice(full.lastIndexOf('.'))) ? [full] : [];
  });
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function classify(rel, text) {
  const inlineStyles = countMatches(text, /\bstyle=/g);
  const styleBlocks = countMatches(text, /<style(?:\s|>)/g);
  const hardcodedColors = countMatches(text, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi);
  const layoutCss = countMatches(text, /\b(display|grid-template|flex-direction|gap|padding|margin|position|width|max-width|min-height|border-radius|box-shadow|background|font-size)\s*:/g);
  const longFile = text.split(/\r?\n/).length > 400;
  const duplicateName = /(?:^|[\\/])(Header|Footer|BlogCard|ProductCard)\.astro$/.test(rel);
  const score = inlineStyles * 6 + styleBlocks * 4 + hardcodedColors * 2 + layoutCss + (longFile ? 20 : 0) + (duplicateName ? 10 : 0);
  return { file: rel.replace(/\\/g, '/'), inlineStyles, styleBlocks, hardcodedColors, layoutCss, lines: text.split(/\r?\n/).length, score };
}

const files = TARGETS.flatMap((target) => walk(resolve(ROOT, target)));
const results = files
  .map((file) => classify(relative(ROOT, file), readFileSync(file, 'utf8')))
  .filter((item) => item.inlineStyles || item.styleBlocks || item.hardcodedColors || item.layoutCss || item.lines > 400)
  .sort((a, b) => b.score - a.score);

const summary = {
  scanned: files.length,
  flagged: results.length,
  totals: {
    inlineStyles: results.reduce((sum, item) => sum + item.inlineStyles, 0),
    styleBlocks: results.reduce((sum, item) => sum + item.styleBlocks, 0),
    hardcodedColors: results.reduce((sum, item) => sum + item.hardcodedColors, 0),
    layoutCss: results.reduce((sum, item) => sum + item.layoutCss, 0),
  },
  highestRisk: results.slice(0, 40),
};

console.log(JSON.stringify(summary, null, 2));
