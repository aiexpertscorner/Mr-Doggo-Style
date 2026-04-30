#!/usr/bin/env node
/**
 * scripts/enrich-breed-image-gallery.mjs
 *
 * Adds 5-image galleries to master-breeds.json and master-crossbreeds.json.
 *
 * What it writes:
 * - image_url: primary image
 * - image_urls: string[]
 * - image_gallery: [{ url, source, role, dog_ceo_path, parent_breed_slug?, parent_breed_name? }]
 * - image_alt
 * - image_source
 * - image_render_ready
 * - enrichment.image_gallery_count
 * - enrichment.image_verified
 *
 * Usage:
 *   node scripts/enrich-breed-image-gallery.mjs
 *   node scripts/enrich-breed-image-gallery.mjs --force
 *   node scripts/enrich-breed-image-gallery.mjs --slug german-shepherd-dog --force
 *   node scripts/enrich-breed-image-gallery.mjs --target breeds
 *   node scripts/enrich-breed-image-gallery.mjs --target crossbreeds
 *   node scripts/enrich-breed-image-gallery.mjs --count 5
 *   node scripts/enrich-breed-image-gallery.mjs --dry
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDogCeoRandomImagesUrl,
  resolveDogCeoPath,
} from './lib/dog-ceo-breed-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

const MASTER_BREEDS_PATH = path.join(DATA_DIR, 'master-breeds.json');
const MASTER_CROSSBREEDS_PATH = path.join(DATA_DIR, 'master-crossbreeds.json');

const args = process.argv.slice(2);

const FORCE = args.includes('--force');
const DRY = args.includes('--dry');

function argValue(name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const SLUG = argValue('--slug');
const TARGET = argValue('--target', 'all');
const COUNT = Math.max(1, Math.min(Number(argValue('--count', 5)) || 5, 10));
const DELAY = Number(argValue('--delay', 160)) || 160;

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJSON(url, retries = 3) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) await sleep(500 * (attempt + 1));
    }
  }

  throw lastError;
}

function readJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function uniqueUrls(urls) {
  const seen = new Set();

  return urls
    .filter((url) => typeof url === 'string' && /^https?:\/\//.test(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

function normalizeDogCeoResponse(payload) {
  if (!payload || payload.status !== 'success') return [];

  if (Array.isArray(payload.message)) {
    return payload.message.filter((url) => typeof url === 'string');
  }

  if (typeof payload.message === 'string') {
    return [payload.message];
  }

  return [];
}

async function fetchDogCeoImages(dogCeoPath, count) {
  if (!dogCeoPath) return [];

  const url = buildDogCeoRandomImagesUrl(dogCeoPath, count);

  try {
    const payload = await fetchJSON(url);
    return uniqueUrls(normalizeDogCeoResponse(payload));
  } catch (error) {
    return [];
  }
}

function existingGalleryUrls(breed) {
  const fromGallery = Array.isArray(breed.image_gallery)
    ? breed.image_gallery.map((item) => item?.url || item?.image_url).filter(Boolean)
    : [];

  const fromUrls = Array.isArray(breed.image_urls) ? breed.image_urls : [];
  const single = breed.image_url ? [breed.image_url] : [];

  const parentCandidates = Array.isArray(breed.image_url_candidates)
    ? breed.image_url_candidates.map((item) => item.image_url).filter(Boolean)
    : [];

  const parentDirect = [breed.image_url_parent_1, breed.image_url_parent_2].filter(Boolean);

  return uniqueUrls([...fromGallery, ...fromUrls, ...single, ...parentCandidates, ...parentDirect]);
}

function makeGalleryItems(urls, meta) {
  return urls.slice(0, COUNT).map((url, index) => ({
    url,
    source: meta.source,
    role: index === 0 ? 'primary' : 'supporting',
    dog_ceo_path: meta.dogCeoPath || null,
    parent_breed_slug: meta.parentSlug || null,
    parent_breed_name: meta.parentName || null,
  }));
}

function applyGallery(breed, gallery, options = {}) {
  const urls = uniqueUrls(gallery.map((item) => item.url)).slice(0, COUNT);
  if (!urls.length) return false;

  breed.image_url = urls[0];
  breed.image_urls = urls;
  breed.image_gallery = gallery.filter((item) => urls.includes(item.url)).slice(0, COUNT);
  breed.image_source = options.source || gallery[0]?.source || 'dog-ceo-api-gallery';
  breed.image_alt =
    options.alt ||
    breed.image_alt ||
    `${breed.name} dog breed image gallery`;

  breed.image_render_ready = true;
  breed.image_render_format = 'direct-image-gallery';

  breed.enrichment = breed.enrichment || {};
  breed.enrichment.image_verified = true;
  breed.enrichment.image_gallery_count = urls.length;
  breed.enrichment.image_render_ready = true;

  breed.data_provenance = breed.data_provenance || {};
  breed.data_provenance.dog_ceo_image_gallery_enriched = true;
  breed.data_provenance.dog_ceo_image_gallery_count = urls.length;
  breed.data_provenance.dog_ceo_image_strategy = options.strategy || 'breed_gallery';

  return true;
}

function buildParentRefs(crossbreed) {
  const refs = [];

  if (Array.isArray(crossbreed.parent_breeds)) {
    for (const parent of crossbreed.parent_breeds) {
      if (parent?.slug || parent?.name) {
        refs.push({
          slug: parent.slug,
          name: parent.name,
          position: parent.position || refs.length + 1,
        });
      }
    }
  }

  for (const position of [1, 2]) {
    const slug = crossbreed[`origin_breed_${position}_slug`];
    const name = crossbreed[`origin_breed_${position}_name`];

    if (slug || name) {
      refs.push({ slug, name, position });
    }
  }

  const seen = new Set();

  return refs.filter((ref) => {
    const key = ref.slug || ref.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function enrichPureBreed(breed, dogCeoBreedList) {
  const alreadyHasEnough = Array.isArray(breed.image_urls) && breed.image_urls.length >= COUNT;

  if (!FORCE && alreadyHasEnough) {
    return { status: 'skip', reason: 'already has gallery' };
  }

  const dogCeoPath = resolveDogCeoPath(
    { slug: breed.slug, name: breed.name },
    dogCeoBreedList
  );

  if (!dogCeoPath) {
    const fallbackUrls = existingGalleryUrls(breed).slice(0, COUNT);
    if (fallbackUrls.length) {
      const gallery = makeGalleryItems(fallbackUrls, {
        source: breed.image_source || 'existing-image-fallback',
      });

      applyGallery(breed, gallery, {
        source: breed.image_source || 'existing-image-fallback',
        strategy: 'existing_image_fallback',
      });

      return { status: 'fallback', reason: 'no Dog CEO mapping but existing image used' };
    }

    return { status: 'missing', reason: 'no Dog CEO mapping' };
  }

  const fetched = await fetchDogCeoImages(dogCeoPath, COUNT);
  const urls = uniqueUrls([...fetched, ...existingGalleryUrls(breed)]).slice(0, COUNT);

  if (!urls.length) {
    return { status: 'missing', reason: `Dog CEO failed for ${dogCeoPath}` };
  }

  const gallery = makeGalleryItems(urls, {
    source: 'dog-ceo-api-gallery',
    dogCeoPath,
  });

  applyGallery(breed, gallery, {
    source: 'dog-ceo-api-gallery',
    strategy: 'breed_gallery',
    alt: `${breed.name} dog breed image gallery`,
  });

  return { status: 'updated', dogCeoPath, count: urls.length };
}

async function enrichCrossbreed(crossbreed, dogCeoBreedList) {
  const alreadyHasEnough = Array.isArray(crossbreed.image_urls) && crossbreed.image_urls.length >= COUNT;

  if (!FORCE && alreadyHasEnough) {
    return { status: 'skip', reason: 'already has gallery' };
  }

  // Some designer breeds exist directly in Dog CEO.
  const directPath = resolveDogCeoPath(
    { slug: crossbreed.slug, name: crossbreed.name },
    dogCeoBreedList
  );

  if (directPath) {
    const directUrls = await fetchDogCeoImages(directPath, COUNT);
    if (directUrls.length) {
      const gallery = makeGalleryItems(directUrls, {
        source: 'dog-ceo-api-gallery',
        dogCeoPath: directPath,
      });

      applyGallery(crossbreed, gallery, {
        source: 'dog-ceo-api-gallery',
        strategy: 'direct_designer_breed_gallery',
        alt: `${crossbreed.name} mixed breed image gallery`,
      });

      return { status: 'updated', dogCeoPath: directPath, count: directUrls.length };
    }
  }

  const parents = buildParentRefs(crossbreed);
  const gallery = [];

  for (const parent of parents) {
    const parentPath = resolveDogCeoPath(parent, dogCeoBreedList);
    if (!parentPath) continue;

    const parentCount = parents.length > 1
      ? Math.ceil(COUNT / parents.length) + 1
      : COUNT;

    const urls = await fetchDogCeoImages(parentPath, parentCount);

    for (const url of urls) {
      gallery.push({
        url,
        source: 'dog-ceo-api-parent-gallery',
        role: gallery.length === 0 ? 'primary' : 'supporting',
        dog_ceo_path: parentPath,
        parent_breed_slug: parent.slug || null,
        parent_breed_name: parent.name || null,
      });
    }

    await sleep(DELAY);
  }

  const urls = uniqueUrls([...gallery.map((item) => item.url), ...existingGalleryUrls(crossbreed)]).slice(0, COUNT);

  if (!urls.length) {
    // Last generic fallback: Dog CEO has a "mix" collection.
    const mixUrls = await fetchDogCeoImages('mix', COUNT);
    if (mixUrls.length) {
      const mixGallery = makeGalleryItems(mixUrls, {
        source: 'dog-ceo-api-mix-fallback',
        dogCeoPath: 'mix',
      });

      applyGallery(crossbreed, mixGallery, {
        source: 'dog-ceo-api-mix-fallback',
        strategy: 'generic_mix_fallback',
        alt: `${crossbreed.name} mixed breed fallback image gallery`,
      });

      return { status: 'fallback', dogCeoPath: 'mix', count: mixUrls.length };
    }

    return { status: 'missing', reason: 'no parent or mix images available' };
  }

  const finalGallery = urls.map((url, index) => {
    const item = gallery.find((candidate) => candidate.url === url);

    return item || {
      url,
      source: crossbreed.image_source || 'existing-parent-image-fallback',
      role: index === 0 ? 'primary' : 'supporting',
      dog_ceo_path: null,
      parent_breed_slug: null,
      parent_breed_name: null,
    };
  });

  applyGallery(crossbreed, finalGallery, {
    source: 'dog-ceo-api-parent-gallery',
    strategy: 'parent_breed_gallery_fallback',
    alt: `${crossbreed.name} mixed breed guide image gallery using parent-breed Dog CEO fallbacks`,
  });

  crossbreed.enrichment = crossbreed.enrichment || {};
  crossbreed.enrichment.image_is_parent_fallback = true;

  crossbreed.data_provenance = crossbreed.data_provenance || {};
  crossbreed.data_provenance.dog_ceo_parent_image_enriched = true;
  crossbreed.data_provenance.dog_ceo_image_strategy = 'parent_breed_gallery_fallback';

  return { status: 'updated', dogCeoPath: 'parent-gallery', count: urls.length };
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  🐕 PupWiki Breed Image Gallery Enrichment');
  console.log(`  target=${TARGET} count=${COUNT} force=${FORCE} dry=${DRY}`);
  console.log('════════════════════════════════════════════════════════════\n');

  const dogCeoListPayload = await fetchJSON('https://dog.ceo/api/breeds/list/all');
  const dogCeoBreedList = dogCeoListPayload?.message || {};

  if (!dogCeoBreedList || typeof dogCeoBreedList !== 'object') {
    throw new Error('Could not load Dog CEO breed list');
  }

  const masterBreeds = readJson(MASTER_BREEDS_PATH);
  const masterCrossbreeds = readJson(MASTER_CROSSBREEDS_PATH);

  const jobs = [];

  if (TARGET === 'all' || TARGET === 'breeds') {
    for (const breed of masterBreeds) {
      if (!SLUG || breed.slug === SLUG) jobs.push({ type: 'breed', item: breed });
    }
  }

  if (TARGET === 'all' || TARGET === 'crossbreeds') {
    for (const breed of masterCrossbreeds) {
      if (!SLUG || breed.slug === SLUG) jobs.push({ type: 'crossbreed', item: breed });
    }
  }

  const stats = {
    updated: 0,
    fallback: 0,
    skip: 0,
    missing: 0,
    failed: 0,
  };

  for (const [index, job] of jobs.entries()) {
    try {
      const result = job.type === 'breed'
        ? await enrichPureBreed(job.item, dogCeoBreedList)
        : await enrichCrossbreed(job.item, dogCeoBreedList);

      stats[result.status] = (stats[result.status] || 0) + 1;

      const label =
        result.status === 'updated'
          ? G('✓')
          : result.status === 'fallback'
            ? Y('◐')
            : result.status === 'skip'
              ? D('–')
              : R('✗');

      const detail = result.dogCeoPath
        ? `${result.dogCeoPath} · ${result.count || 0} images`
        : result.reason || '';

      console.log(
        `  ${label} ${String(index + 1).padStart(3, ' ')}/${jobs.length} ${job.type.padEnd(10)} ${job.item.slug.padEnd(42)} ${D(detail)}`
      );
    } catch (error) {
      stats.failed += 1;
      console.log(`  ${R('✗')} ${job.type.padEnd(10)} ${job.item.slug.padEnd(42)} ${R(error.message)}`);
    }

    await sleep(DELAY);
  }

  if (!DRY) {
    if (TARGET === 'all' || TARGET === 'breeds') writeJson(MASTER_BREEDS_PATH, masterBreeds);
    if (TARGET === 'all' || TARGET === 'crossbreeds') writeJson(MASTER_CROSSBREEDS_PATH, masterCrossbreeds);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  updated=${G(stats.updated)} fallback=${Y(stats.fallback)} skip=${D(stats.skip)} missing=${R(stats.missing)} failed=${R(stats.failed)}`);
  console.log(`  ${DRY ? Y('Dry run: no files written') : G('Saved updated data files')}`);
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error(R(error.stack || error.message));
  process.exit(1);
});
