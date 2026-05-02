# Sprint 1 — Homepage + Breeds Rework

## Goal
Create a cleaner, scalable PupWiki design and layout foundation, then apply it first to the highest-value SEO and monetization surfaces: the homepage, the breed directory, and breed profile pages.

## Full programme

### Sprint 1 — Home + breeds foundation
- Introduce global design primitives for containers, sections, grids, cards, buttons, chips, typography and media frames.
- Clean the global layout so scripts, SEO, structured data and body classes are managed predictably.
- Rework homepage hero into a markup-only component that uses global styles instead of inline component CSS.
- Keep the homepage index thin and data/component-driven.
- Prepare breed directory and breed detail pages for component extraction and page-specific CSS migration.

### Sprint 2 — Category hubs + blog money pages
- Rework category pages into reusable hub layouts.
- Add consistent above-the-fold monetization zones where intent is high.
- Standardize editorial cards, related guides, product/partner slots and disclosure placement.

### Sprint 3 — Affiliate/product placement system
- Unify Awin and Amazon placement logic into a small number of page-aware components.
- Add safe ranking/selection rules by category, breed size, lifecycle, health/food/training intent and commercial score.
- Avoid aggressive affiliate density on informational pages.

### Sprint 4 — Technical SEO and internal linking
- Audit canonical URLs, structured data, breadcrumbs, ItemList coverage, FAQ use and indexable filter/collection links.
- Add stronger internal linking from breed profiles to cost, food, health, training and product-intent guides.
- Improve crawl paths for breed collections and high-intent blog clusters.

### Sprint 5 — Visual polish and performance
- Remove remaining inline component styles.
- Consolidate page styles into `public/styles/pages/*` or component/foundation files.
- Audit image loading, LCP surfaces, hydration/scripts, layout shift and mobile ergonomics.

## Sprint 1 implementation notes

### Added
- `public/styles/foundation/layout.css`
- `public/styles/foundation/components.css`
- `public/styles/pages/home.css`
- `src/components/home/HomeHeroClean.astro`

### Updated
- `public/styles/main.css` now imports foundation and homepage styles.
- `src/layouts/BaseLayout.astro` now removes inline skip-link CSS, disables hardcoded AdSense loading, makes Awin MasterTag conditional, and standardizes the body root class.
- `src/pages/index.astro` now uses `HomeHeroClean.astro` and a `pw-page` body foundation class.

## Design rules introduced
- Use `pw-container`, `pw-section`, `pw-grid`, `pw-stack`, `pw-card`, `pw-btn`, `pw-chip`, `pw-stat-card` as the shared visual vocabulary.
- Page-specific CSS should only handle unique page behavior and complex local components.
- New components should be markup-first; no scoped `<style>` blocks unless there is a strong reason.
- Affiliate placements should use consistent disclosure patterns and avoid pushing informational content too far down on mobile.

## Next Sprint 1 steps
- Extract `BreedDirectoryCard.astro` from the large breed directory page.
- Extract breed filter client script into a dedicated module or smaller component-owned script.
- Move breed profile page inline CSS into `public/styles/pages/breed-profile.css`.
- Add a reusable `BreedMoneyPanel.astro` for food/training/gift partner placements.
- Run production build and inspect `/`, `/breeds`, and a high-value breed profile such as `/breeds/pug` or `/breeds/labrador-retriever`.
