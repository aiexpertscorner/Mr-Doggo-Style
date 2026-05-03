# Sprint 3A — Breed Detail Rework Plan

## Branch

`breeds-rework-audit`

## Goal

Rework the PupWiki breed detail experience into a modern, mobile-first, conversion-aware breed hub without changing existing URLs.

The current `/breeds/[breed]` page has strong data and sections, but it is too monolithic. Sprint 3A should create a clean structure where the route becomes thin and the UI is built from reusable breed components.

## Core principles

1. Preserve SEO value and URLs.
2. Do not remove existing content sections until the replacement component is ready.
3. Move visual styling into global/page-level CSS, not inline or scattered component CSS.
4. Put internal links and commerce modules higher in the page journey.
5. Use AWIN-led Sprint 2F partner clusters as part of the breed page monetization flow.
6. Keep health/insurance wording conservative and safety-aware.

## Desired page order

```txt
Breed hero
Decision snapshot
Breed Resource Hub
Breed Commerce Suite
Trait/data snapshot
Health context
Owner fit / lifestyle fit
Related guides
FAQ / sidebar
```

## Phase 1 — Foundation build

Create reusable components and styles that can be dropped into the existing route safely:

- `BreedResourceHub.astro`
- `BreedCommerceSuite.astro`
- `BreedDecisionSnapshot.astro`
- `src/styles/pages/breed-page.css`

Update global CSS imports so the new design layer is available everywhere.

## Phase 2 — Safe route integration

Integrate new components into `/breeds/[breed].astro` without removing old sections yet:

- Add Resource Hub after hero.
- Add Commerce Suite before lower affiliate blocks.
- Add Decision Snapshot near top.
- Preserve old guide grids/sidebar until new modules are verified.

## Phase 3 — Route slimming

Create:

```txt
src/lib/breeds/buildBreedPageModel.ts
```

Move page-model logic out of `[breed].astro`:

- links
- status
- commerce tags
- health profile
- image data
- resource hub items
- partner cluster links
- schema-friendly metadata

## Phase 4 — Replace old sections

Once the model and components are stable:

- remove duplicate guide grids;
- remove legacy commerce blocks;
- remove inconsistent section styles;
- keep only one structured internal-link journey;
- keep only one commerce suite.

## Phase 5 — Directory polish

After the detail page is stable, refine `/breeds`:

- stronger mobile result cards;
- owner-resource chips;
- links to partner clusters;
- better card CTA hierarchy.

## Build start in this sprint

This branch starts with Phase 1:

1. Add `BreedResourceHub.astro`.
2. Add `BreedCommerceSuite.astro`.
3. Add `BreedDecisionSnapshot.astro`.
4. Add `breed-page.css`.
5. Import `breed-page.css` from `public/styles/main.css`.
6. Keep existing route intact until component integration can be done safely.

## Quick validation checklist

```bash
npm run build
```

Then visually review:

```txt
/breeds/labrador-retriever
/breeds/french-bulldog
/breeds/german-shepherd-dog
/breeds/goldendoodle
```

## Next patch after Phase 1

Integrate the new components into `[breed].astro` and start extracting the page model.
