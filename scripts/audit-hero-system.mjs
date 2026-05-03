#!/usr/bin/env node
/**
 * Verify the canonical homepage hero component and CSS stay in sync.
 * This catches the previous class mismatch between HomeHeroClean.astro and home.css.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const files = {
  index: resolve(ROOT, 'src/pages/index.astro'),
  clean: resolve(ROOT, 'src/components/home/HomeHeroClean.astro'),
  legacy: resolve(ROOT, 'src/components/home/HomeHero.astro'),
  css: resolve(ROOT, 'public/styles/pages/home.css'),
  genericHeroCss: resolve(ROOT, 'public/styles/components/hero.css'),
};

const required = Object.entries(files).filter(([, file]) => !existsSync(file));
if (required.length) {
  console.error('Hero audit failed: missing expected files.');
  console.error(JSON.stringify(required.map(([name, file]) => ({ name, file })), null, 2));
  process.exit(1);
}

const index = readFileSync(files.index, 'utf8');
const clean = readFileSync(files.clean, 'utf8');
const legacy = readFileSync(files.legacy, 'utf8');
const css = readFileSync(files.css, 'utf8');
const genericHeroCss = readFileSync(files.genericHeroCss, 'utf8');

const requiredComponentClasses = [
  'pw-hero',
  'pw-hero__grid',
  'pw-hero__content',
  'pw-hero__visual',
  'pw-hero__image-card',
  'pw-hero__image-shade',
  'pw-hero__insight-card',
  'pw-hero__actions',
  'pw-hero__quick-links',
  'pw-hero__stats',
  'pw-hero__features',
];

const bannedLegacyClasses = [
  'pw-hero__layout',
  'pw-hero__copy',
  'pw-hero__showcase',
  'pw-hero__photo-card',
  'pw-hero__photo-overlay',
  'pw-hero__photo-topline',
  'pw-hero__rotator-controls',
  'pw-hero__rotator-dots',
  'data-pw-home-hero-rotator',
];

const failures = [];

if (!index.includes("HomeHeroClean.astro")) {
  failures.push('src/pages/index.astro should import HomeHeroClean.astro as the canonical homepage hero.');
}

if (!legacy.includes("import HomeHeroClean from './HomeHeroClean.astro'")) {
  failures.push('src/components/home/HomeHero.astro should remain a thin wrapper around HomeHeroClean.astro.');
}

for (const className of requiredComponentClasses) {
  if (!clean.includes(className)) failures.push(`HomeHeroClean.astro is missing ${className}.`);
  if (!css.includes(`.${className}`)) failures.push(`public/styles/pages/home.css is missing .${className}.`);
}

for (const className of bannedLegacyClasses) {
  if (clean.includes(className)) failures.push(`HomeHeroClean.astro still contains legacy rotator class ${className}.`);
  if (css.includes(className)) failures.push(`public/styles/pages/home.css still contains legacy rotator class ${className}.`);
}

if (genericHeroCss.includes('rgba(13,148,136')) {
  failures.push('Generic hero CSS still contains old teal radial styling.');
}

if (failures.length) {
  console.error('Hero audit failed.');
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: Object.keys(files) }, null, 2));
