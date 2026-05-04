/**
 * public/scripts/pupwiki-name-generator.mjs
 * Reusable client-side behavior for PupWiki dog-name generator components.
 */

const STORAGE_KEY = 'pupwiki:dog-name-favorites:v2';
const COMMAND_WORDS = ['sit', 'stay', 'no', 'down', 'come', 'heel', 'drop', 'leave', 'wait', 'off'];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
}

function estimateSyllables(name) {
  const cleaned = normalize(name);
  if (!cleaned) return 1;
  const groups = cleaned.match(/[aeiouy]+/g) || [];
  let count = groups.length || 1;
  if (cleaned.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

function soundsLikeCommand(name) {
  const cleaned = normalize(name);
  return COMMAND_WORDS.some((command) => cleaned === command || cleaned.includes(command));
}

function matchesLength(name, preference) {
  const syllables = estimateSyllables(name);
  if (preference === 'short') return name.length <= 5;
  if (preference === 'one-two') return syllables <= 2;
  if (preference === 'long') return name.length >= 7;
  return true;
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setFavorites(favorites) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.slice(0, 100)));
}

function favoriteKey(item) {
  return `${item.name}|${item.gender}|${item.category}`;
}

function scoreName(item, options, breed) {
  let score = 1000 - Number(item.rank || 999);
  if (item.enriched) score += 20;
  if (options.gender !== 'any' && options.gender !== 'neutral' && item.gender === options.gender) score += 120;
  if (options.gender === 'neutral') score += item.name.length <= 6 ? 60 : 0;
  if (options.category && item.category === options.category) score += 180;
  if (options.inspiration && item.inspiration === options.inspiration) score += 160;
  if (options.starts && item.name.toUpperCase().startsWith(options.starts)) score += 140;

  if (breed && options.breedFit) {
    if (Array.isArray(breed.styles) && breed.styles.includes(item.category)) score += 220;
    if (Array.isArray(breed.inspirations) && breed.inspirations.includes(item.inspiration)) score += 180;

    const temperament = String(breed.temperament || '').toLowerCase();
    if ((temperament.includes('friendly') || temperament.includes('outgoing')) && ['Cute', 'Classic', 'Trendy'].includes(item.category)) score += 50;
    if ((temperament.includes('loyal') || temperament.includes('protective')) && item.category === 'Tough') score += 70;
    if ((temperament.includes('intelligent') || temperament.includes('smart')) && ['Mythology', 'Human'].includes(item.inspiration)) score += 55;
    if (breed.energy === 'active' && ['Tough', 'Trendy'].includes(item.category)) score += 45;
    if (breed.energy === 'calm' && ['Classic', 'Cute'].includes(item.category)) score += 45;
  }

  if (options.length === 'short' && item.name.length <= 5) score += 140;
  if (options.length === 'one-two' && estimateSyllables(item.name) <= 2) score += 130;
  if (options.length === 'long' && item.name.length >= 7) score += 120;

  score += item.name.charCodeAt(0) % 13;
  return score;
}

function initBreedSearch() {
  const dataEl = $('#pw-breed-search-data');
  const search = $('[data-pw-breed-search]');
  if (!dataEl || !search) return;

  let breeds = [];
  try {
    breeds = JSON.parse(dataEl.textContent || '[]');
  } catch {
    return;
  }

  const input = $('[data-pw-breed-search-input]', search);
  const results = $('[data-pw-breed-search-results]', search);
  if (!input || !results) return;

  function hide() {
    results.hidden = true;
    results.innerHTML = '';
  }

  function show(items) {
    results.innerHTML = items
      .map((breed) => {
        const image = breed.image
          ? `<img src="${escapeHtml(breed.image)}" alt="" loading="lazy" decoding="async" />`
          : `<span class="pw-names-search__fallback">🐕</span>`;
        return `<a href="/dog-names/${encodeURIComponent(breed.slug)}" class="pw-names-search__result">${image}<span>${escapeHtml(breed.name)} names →</span></a>`;
      })
      .join('');
    results.hidden = false;
  }

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) return hide();
    const hits = breeds.filter((breed) => breed.name.toLowerCase().includes(query)).slice(0, 8);
    if (!hits.length) return hide();
    show(hits);
  });

  document.addEventListener('click', (event) => {
    if (!search.contains(event.target)) hide();
  });
}

function initGenerator(root) {
  const id = root.getAttribute('data-pw-name-generator');
  const dataEl = document.querySelector(`[data-pw-name-generator-data="${CSS.escape(id)}"]`);
  if (!dataEl) return;

  let data;
  try {
    data = JSON.parse(dataEl.textContent || '{}');
  } catch {
    return;
  }

  const names = Array.isArray(data.names) ? data.names : [];
  const breeds = Array.isArray(data.breeds) ? data.breeds : [];
  const selectedBreedSlug = data.selectedBreedSlug || '';

  const form = $('[data-pw-name-generator-form]', root);
  const resultsEl = $('[data-gen-results]', root);
  const summaryEl = $('[data-gen-summary]', root);
  const favoritesEl = $('[data-gen-favorites]', root);
  const controls = {
    breed: $('[data-gen-breed]', root),
    gender: $('[data-gen-gender]', root),
    category: $('[data-gen-category]', root),
    inspiration: $('[data-gen-inspiration]', root),
    length: $('[data-gen-length]', root),
    starts: $('[data-gen-starts]', root),
    avoidCommands: $('[data-gen-avoid-commands]', root),
    breedFit: $('[data-gen-breed-fit]', root),
  };

  let currentResults = [];

  function getBreed(slug) {
    return breeds.find((breed) => breed.slug === slug) || null;
  }

  function getOptions() {
    return {
      breed: controls.breed?.value || selectedBreedSlug || '',
      gender: controls.gender?.value || 'any',
      category: controls.category?.value || '',
      inspiration: controls.inspiration?.value || '',
      length: controls.length?.value || 'any',
      starts: (controls.starts?.value || '').trim().slice(0, 1).toUpperCase(),
      avoidCommands: controls.avoidCommands ? Boolean(controls.avoidCommands.checked) : true,
      breedFit: controls.breedFit ? Boolean(controls.breedFit.checked) : true,
    };
  }

  function filterPool(options) {
    const breed = getBreed(options.breed);
    return names
      .filter((item) => {
        if (!item.name) return false;
        if (options.gender !== 'any' && options.gender !== 'neutral' && item.gender !== options.gender) return false;
        if (options.category && item.category !== options.category) return false;
        if (options.inspiration && item.inspiration !== options.inspiration) return false;
        if (options.starts && !item.name.toUpperCase().startsWith(options.starts)) return false;
        if (options.avoidCommands && soundsLikeCommand(item.name)) return false;
        if (!matchesLength(item.name, options.length)) return false;
        return true;
      })
      .map((item) => ({
        ...item,
        syllables: estimateSyllables(item.name),
        score: scoreName(item, options, breed),
        breedName: breed?.name || data.selectedBreedName || '',
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  function renderResults(items, options) {
    currentResults = items.slice(0, 12);
    if (!resultsEl || !summaryEl) return;

    if (!currentResults.length) {
      summaryEl.textContent = 'No names matched those filters. Try removing one option.';
      resultsEl.innerHTML = '<p class="pw-name-empty">No matching names yet.</p>';
      return;
    }

    const breed = getBreed(options.breed);
    const bits = [
      breed?.name || data.selectedBreedName || 'Any breed',
      options.gender !== 'any' ? options.gender : 'all name types',
      options.category || 'any style',
      options.inspiration || 'any inspiration',
    ];

    summaryEl.textContent = bits.join(' · ');
    const favoriteKeys = new Set(getFavorites().map(favoriteKey));

    resultsEl.innerHTML = currentResults
      .map((item, index) => {
        const key = favoriteKey(item);
        const saved = favoriteKeys.has(key);
        return `
          <article class="pw-name-result-card">
            <span>#${index + 1}</span>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.gender)} · ${escapeHtml(item.category)} · ${escapeHtml(item.inspiration)} · ${item.syllables} syll.</p>
            <button type="button" class="pw-name-save ${saved ? 'is-saved' : ''}" data-save-name="${escapeHtml(key)}" aria-label="Save ${escapeHtml(item.name)}">${saved ? '♥' : '♡'}</button>
          </article>
        `;
      })
      .join('');

    $$('[data-save-name]', resultsEl).forEach((button, index) => {
      button.addEventListener('click', () => {
        addFavorite(currentResults[index]);
        button.textContent = '♥';
        button.classList.add('is-saved');
      });
    });
  }

  function generate() {
    const options = getOptions();
    renderResults(filterPool(options), options);
  }

  function addFavorite(item) {
    const favorites = getFavorites();
    const key = favoriteKey(item);
    if (!favorites.some((favorite) => favoriteKey(favorite) === key)) {
      favorites.unshift({ ...item, savedAt: new Date().toISOString() });
      setFavorites(favorites);
      renderFavorites();
    }
  }

  function removeFavorite(key) {
    setFavorites(getFavorites().filter((favorite) => favoriteKey(favorite) !== key));
    renderFavorites();
    generate();
  }

  function renderFavorites() {
    if (!favoritesEl) return;
    const favorites = getFavorites();

    if (!favorites.length) {
      favoritesEl.innerHTML = '<p class="pw-name-empty">No favorites yet. Save generated names you like.</p>';
      return;
    }

    favoritesEl.innerHTML = favorites
      .map((item) => {
        const key = favoriteKey(item);
        return `<span class="pw-name-favorite-chip">${escapeHtml(item.name)}<button type="button" data-remove-favorite="${escapeHtml(key)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></span>`;
      })
      .join('');

    $$('[data-remove-favorite]', favoritesEl).forEach((button) => {
      button.addEventListener('click', () => removeFavorite(button.dataset.removeFavorite));
    });
  }

  function surprise() {
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (controls.gender) controls.gender.value = random(['any', 'boy', 'girl', 'neutral']);
    if (controls.category) controls.category.value = random(['', ...new Set(names.map((item) => item.category).filter(Boolean))]);
    if (controls.inspiration) controls.inspiration.value = random(['', ...new Set(names.map((item) => item.inspiration).filter(Boolean))]);
    if (controls.length) controls.length.value = random(['any', 'short', 'one-two', 'long']);
    if (controls.starts) controls.starts.value = '';
    generate();
  }

  async function copyGenerated() {
    const text = currentResults.map((item) => item.name).join(', ');
    if (text) await navigator.clipboard?.writeText(text);
  }

  function saveAll() {
    currentResults.forEach(addFavorite);
    renderFavorites();
  }

  function exportFavorites() {
    const favorites = getFavorites();
    const rows = [
      ['name', 'gender', 'category', 'inspiration', 'source_breed', 'saved_at'],
      ...favorites.map((item) => [item.name, item.gender, item.category, item.inspiration, item.breedName || '', item.savedAt || '']),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pupwiki-dog-name-favorites.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareNames() {
    const favorites = getFavorites();
    const list = favorites.length ? favorites : currentResults;
    const text = `My PupWiki dog name ideas: ${list.map((item) => item.name).join(', ')}`;
    if (navigator.share) await navigator.share({ title: 'PupWiki dog name ideas', text, url: window.location.href });
    else await navigator.clipboard?.writeText(`${text}\n${window.location.href}`);
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
  });

  $('[data-gen-surprise]', root)?.addEventListener('click', surprise);
  $('[data-gen-copy]', root)?.addEventListener('click', copyGenerated);
  $('[data-gen-save-all]', root)?.addEventListener('click', saveAll);
  $('[data-gen-export]', root)?.addEventListener('click', exportFavorites);
  $('[data-gen-share]', root)?.addEventListener('click', shareNames);
  $('[data-gen-clear-favorites]', root)?.addEventListener('click', () => {
    setFavorites([]);
    renderFavorites();
    generate();
  });

  controls.starts?.addEventListener('input', () => {
    controls.starts.value = controls.starts.value.replace(/[^a-z]/gi, '').slice(0, 1).toUpperCase();
  });

  renderFavorites();
  generate();
}

function initImageFallbacks() {
  $$('[data-pw-image-fallback]').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
    });
  });
}

initBreedSearch();
$$('[data-pw-name-generator]').forEach(initGenerator);
initImageFallbacks();
