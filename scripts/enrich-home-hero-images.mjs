#!/usr/bin/env node
/**
 * Enrich homepage hero image data with Pexels photos.
 * Safe fallback: skips without failing when PEXELS_API_KEY is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/data/home-hero-images.json');
const QUERIES = [
  'happy dog owner golden retriever outdoors',
  'family with dog at home lifestyle',
  'puppy playing in bright home',
  'senior dog owner outdoor portrait',
];
const LIMIT = 4;
const KEY = loadEnv().PEXELS_API_KEY || process.env.PEXELS_API_KEY || '';

function loadEnv() {
  const env = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) continue;
      const match = clean.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  }
  return env;
}

async function fetchQuery(query) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '5');
  url.searchParams.set('locale', 'en-US');
  const res = await fetch(url, { headers: { Authorization: KEY }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status} for ${query}`);
  const data = await res.json();
  const photos = Array.isArray(data.photos) ? data.photos : [];
  return photos.sort((a, b) => score(b, query) - score(a, query))[0] || null;
}

function score(photo, query) {
  let s = 0;
  if ((photo.width || 0) >= 1400) s += 20;
  if ((photo.width || 0) > (photo.height || 0)) s += 14;
  const alt = String(photo.alt || '').toLowerCase();
  if (alt.includes('dog')) s += 20;
  if (alt.includes('person') || alt.includes('owner') || alt.includes('family')) s += 8;
  for (const token of query.split(/\s+/)) if (token.length > 4 && alt.includes(token)) s += 3;
  return s;
}

function normalize(photo, query, index) {
  return {
    id: `pexels-${photo.id}`,
    source: 'pexels',
    query,
    src: photo.src?.large2x || photo.src?.large || photo.src?.original,
    mobileSrc: photo.src?.large || photo.src?.medium || photo.src?.large2x || photo.src?.original,
    alt: photo.alt || 'Happy dog lifestyle image',
    photographer: photo.photographer || '',
    photographerUrl: photo.photographer_url || '',
    url: photo.url || '',
    focal: index === 0 ? 'center' : index === 1 ? 'center 42%' : 'center',
  };
}

async function main() {
  if (!KEY) {
    console.warn('[hero-images] PEXELS_API_KEY missing. Keeping existing hero image data.');
    process.exit(0);
  }
  const images = [];
  for (const query of QUERIES) {
    try {
      const photo = await fetchQuery(query);
      if (photo?.src) images.push(normalize(photo, query, images.length));
    } catch (error) {
      console.warn(`[hero-images] ${error.message}`);
    }
    if (images.length >= LIMIT) break;
  }
  if (!images.length) {
    console.warn('[hero-images] No Pexels hero images selected. Keeping existing data.');
    process.exit(0);
  }
  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), source: 'pexels', querySet: QUERIES, images }, null, 2)}\n`, 'utf8');
  console.log(`[hero-images] Wrote ${images.length} hero images to src/data/home-hero-images.json`);
}

main();
