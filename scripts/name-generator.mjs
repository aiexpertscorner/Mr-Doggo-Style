/**
 * name-generator.mjs
 * Client-side ES module for the dog name generator.
 * Loaded with <script type="module" src="/scripts/name-generator.mjs">.
 */

// ── State ─────────────────────────────────────────────────────────
const state = {
  allNames:  [],
  filtered:  [],
  shortlist: [],
  page:      1,
  perPage:   48,
  filters: {
    gender:      'all',
    category:    'all',
    inspiration: 'all',
    letter:      'all',
    search:      '',
  },
};

// ── DOM helpers ───────────────────────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Init ──────────────────────────────────────────────────────────
function init() {
  if (!window.DOG_NAMES) return;
  state.allNames = window.DOG_NAMES;
  bindFilters();
  bindActions();
  applyFilters();
  loadShortlist();
}

// ── Filters ───────────────────────────────────────────────────────
function bindFilters() {
  document.addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    const { filter: key, value: val } = chip.dataset;
    $$(`[data-filter="${key}"]`).forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.filters[key] = val;
    state.page = 1;
    applyFilters();
  });

  $('[data-ng-search]')?.addEventListener('input', e => {
    state.filters.search = e.target.value.trim().toLowerCase();
    state.page = 1;
    applyFilters();
  });

  $('[data-ng-reset]')?.addEventListener('click', resetFilters);

  const toggle = $('[data-ng-filter-toggle]');
  const panel  = $('[data-ng-filter-panel]');
  toggle?.addEventListener('click', () => {
    panel.classList.toggle('is-hidden');
    toggle.textContent = panel.classList.contains('is-hidden') ? '⚙ SHOW FILTERS' : '⚙ HIDE FILTERS';
  });
}

function bindActions() {
  document.addEventListener('click', e => {
    const card = e.target.closest('[data-ng-card]');
    if (card)                                 { toggleShortlist(card.dataset.name); return; }
    if (e.target.closest('[data-ng-shuffle]')) { shuffleFiltered();                return; }
    if (e.target.closest('[data-ng-copy]'))    { copyShortlist();                  return; }
    if (e.target.closest('[data-ng-clear-shortlist]')) {
      state.shortlist = [];
      saveShortlist(); renderShortlist(); updateCardStates();
      return;
    }
    const removeBtn = e.target.closest('[data-ng-remove]');
    if (removeBtn) {
      state.shortlist = state.shortlist.filter(n => n !== removeBtn.dataset.ngRemove);
      saveShortlist(); renderShortlist(); updateCardStates();
      return;
    }
    const pageBtn = e.target.closest('[data-ng-page]');
    if (pageBtn) {
      state.page = parseInt(pageBtn.dataset.ngPage);
      renderGrid();
      $('[data-ng-results]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('[data-ng-random]')) { pickRandom(); return; }
  });
}

// ── Filter logic ──────────────────────────────────────────────────
function applyFilters() {
  const { gender, category, inspiration, letter, search } = state.filters;
  state.filtered = state.allNames.filter(n => {
    if (gender !== 'all'      && n.gender      !== gender)      return false;
    if (category !== 'all'    && n.category    !== category)    return false;
    if (inspiration !== 'all' && n.inspiration !== inspiration) return false;
    if (letter !== 'all'      && n.letter      !== letter)      return false;
    if (search && !n.name.toLowerCase().includes(search))       return false;
    return true;
  });
  renderCount();
  renderGrid();
  renderPagination();
}

function resetFilters() {
  state.filters = { gender: 'all', category: 'all', inspiration: 'all', letter: 'all', search: '' };
  state.page = 1;
  $$('[data-filter]').forEach(c => c.classList.remove('is-active'));
  $$('[data-filter][data-value="all"]').forEach(c => c.classList.add('is-active'));
  const si = $('[data-ng-search]');
  if (si) si.value = '';
  applyFilters();
}

function shuffleFiltered() {
  state.filtered = [...state.filtered].sort(() => Math.random() - 0.5);
  state.page = 1;
  renderGrid();
}

function pickRandom() {
  if (!state.filtered.length) return;
  const pick = state.filtered[Math.floor(Math.random() * state.filtered.length)];
  toggleShortlist(pick.name);
  const card = $(`[data-name="${pick.name}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.outline = '3px solid #CCFF00';
    setTimeout(() => { card.style.outline = ''; }, 1200);
  }
}

// ── Render ────────────────────────────────────────────────────────
function renderCount() {
  const el = $('[data-ng-count]');
  if (el) el.innerHTML = `<strong>${state.filtered.length}</strong> namen`;
}

function renderGrid() {
  const container = $('[data-ng-grid]');
  if (!container) return;
  const start = (state.page - 1) * state.perPage;
  const page  = state.filtered.slice(start, start + state.perPage);

  if (!page.length) {
    container.innerHTML = `
      <div class="ng-empty">
        <div class="ng-empty__icon">🐾</div>
        <div class="ng-empty__title">Geen namen gevonden</div>
        <div class="ng-empty__sub">Pas je filters aan om meer resultaten te zien.</div>
      </div>`;
    return;
  }
  container.innerHTML = page.map(buildCard).join('');
  updateCardStates();
}

function buildCard(n) {
  const inShortlist = state.shortlist.includes(n.name);
  const rankDots = [1, 2, 3, 4].map(i =>
    `<span class="ng-card__rank-dot ${i <= n.rank ? 'is-filled' : ''}"></span>`
  ).join('');
  return `
    <div class="ng-card ${inShortlist ? 'is-selected' : ''}"
         data-ng-card data-name="${n.name}"
         role="button" tabindex="0"
         aria-pressed="${inShortlist}"
         aria-label="${n.name} — ${n.gender === 'boy' ? 'jongen' : 'meisje'}">
      <span class="ng-card__gender-dot ng-card__gender-dot--${n.gender}"></span>
      <div class="ng-card__name">${n.name}</div>
      <div class="ng-card__meta">
        ${n.category !== 'General'
          ? `<span class="ng-card__badge ng-card__badge--category">${n.category}</span>` : ''}
        ${n.inspiration !== 'Human' && n.inspiration !== 'General'
          ? `<span class="ng-card__badge ng-card__badge--inspiration">${n.inspiration}</span>` : ''}
        <div class="ng-card__rank" aria-label="Populariteit ${n.rank} van 4">${rankDots}</div>
      </div>
      <span class="ng-card__check" aria-hidden="true">✓</span>
    </div>`;
}

function updateCardStates() {
  $$('[data-ng-card]').forEach(card => {
    const sel = state.shortlist.includes(card.dataset.name);
    card.classList.toggle('is-selected', sel);
    card.setAttribute('aria-pressed', sel);
    const check = card.querySelector('.ng-card__check');
    if (check) check.style.opacity = sel ? '1' : '0';
  });
}

function renderPagination() {
  const container = $('[data-ng-pagination]');
  if (!container) return;
  const total = Math.ceil(state.filtered.length / state.perPage);
  if (total <= 1) { container.innerHTML = ''; return; }

  const items = [];
  if (state.page > 1)
    items.push(`<button class="ng-page-btn" data-ng-page="${state.page - 1}">←</button>`);

  let s = Math.max(1, state.page - 3);
  let e = Math.min(total, s + 6);
  if (e - s < 6) s = Math.max(1, e - 6);
  for (let i = s; i <= e; i++)
    items.push(`<button class="ng-page-btn ${i === state.page ? 'is-active' : ''}" data-ng-page="${i}">${i}</button>`);

  if (state.page < total)
    items.push(`<button class="ng-page-btn" data-ng-page="${state.page + 1}">→</button>`);

  container.innerHTML = items.join('');
}

// ── Shortlist ─────────────────────────────────────────────────────
function toggleShortlist(name) {
  const idx = state.shortlist.indexOf(name);
  if (idx === -1) {
    if (state.shortlist.length >= 20) { alert('Shortlist vol (max 20). Verwijder er eerst één.'); return; }
    state.shortlist.push(name);
  } else {
    state.shortlist.splice(idx, 1);
  }
  saveShortlist(); renderShortlist(); updateCardStates();
}

function renderShortlist() {
  const container = $('[data-ng-shortlist-names]');
  const countEl   = $('[data-ng-shortlist-count]');
  if (!container) return;
  if (countEl) countEl.textContent = state.shortlist.length;
  if (!state.shortlist.length) {
    container.innerHTML = `<p class="ng-shortlist__empty">Klik op een naam om hem toe te voegen →</p>`;
    return;
  }
  container.innerHTML = state.shortlist.map(name => `
    <span class="ng-shortlist__tag">
      ${name}
      <button data-ng-remove="${name}" aria-label="${name} verwijderen">✕</button>
    </span>`).join('');
}

function saveShortlist() {
  try { localStorage.setItem('ng_shortlist', JSON.stringify(state.shortlist)); } catch {}
}

function loadShortlist() {
  try {
    const saved = localStorage.getItem('ng_shortlist');
    if (saved) state.shortlist = JSON.parse(saved);
  } catch {}
  renderShortlist();
}

async function copyShortlist() {
  if (!state.shortlist.length) return;
  try {
    await navigator.clipboard.writeText(state.shortlist.join(', '));
    const btn = $('[data-ng-copy]');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ GEKOPIEERD';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
  } catch {}
}

// ── Keyboard accessibility ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('[data-ng-card]');
  if (card) { e.preventDefault(); toggleShortlist(card.dataset.name); }
});

// ── Boot ──────────────────────────────────────────────────────────
init();
