# Sprint 2b/3 + Sprint 5 Phase 1 Audit

## Reference Direction

The Anipat reference works because it is visually calm, mobile-friendly, image-led, and section-driven. PupWiki should not copy it directly, but should borrow the structure: clear first viewport, repeated section rhythm, friendly service/product cards, generous breathing room, and consistent responsive stacking.

PupWiki should keep its current color direction, but move toward a cleaner UI system with fewer one-off page styles.

## Sprint 2b/3 Controlled Content Apply

The content refresh generator now supports controlled runs:

```bash
npm run content:refresh:check -- --families=health,beds --limit=50 --report
node scripts/content/refresh-generated-posts.mjs --apply --families=health,beds --slugs=affenpinscher,beagle --report
```

Priority batches:

- Services and partner guides: dog services, insurance, training help, grooming appointments, vet-adjacent resources.
- Health: cautious language, breed risk context, vet-first guidance, no treatment promises.
- Beds: remove hard claims, improve sizing, comfort, senior and first-month setup language.
- Partner guides: promote active AWIN and Amazon coverage through useful dog-care decisions.

## Sprint 5 Phase 1 Findings

Inline design audit command:

```bash
npm run design:audit:inline
```

Current audit summary:

- 122 files scanned.
- 80 files flagged.
- 607 inline style attributes.
- 14 Astro style blocks.
- 788 hardcoded color values.
- 3418 layout-style declarations in scoped or page CSS.

Highest-risk areas:

- `src/pages/brands/brand-page.astro` and `src/pages/brands/[brand].astro`: heavy inline styling and duplicate brand page patterns.
- `src/pages/cost-calculator/[breed].astro` and `src/pages/cost-calculator/index.astro`: very large page files with embedded layout styling.
- `src/pages/dog-names/[breed].astro`, `src/pages/dog-names/index.astro`, and `src/styles/names.css`: large isolated design island.
- `src/pages/blog/index.astro`, `src/pages/how-we-test.astro`, `src/pages/contact.astro`, `src/pages/privacy.astro`: page-local style systems.
- Duplicate component families: `Header/Footer`, `BlogCard`, `ProductCard`, affiliate/product slot components.

## Sprint 5 Phase 2 Plan

Build a real design foundation before adding more layouts:

- Define one app shell: header, footer, page main, section bands, content width, breadcrumbs.
- Define tokens beyond colors: spacing, radii, shadows, borders, type scale, section rhythm, card density.
- Create reusable primitives: `PageHero`, `Section`, `DecisionCard`, `ResourceGrid`, `PartnerCard`, `ComparisonPanel`, `TrustNote`, `CTAInline`.
- Consolidate duplicate components before restyling every page.
- Move page-local style blocks into `src/styles/pages/*` only when the page is truly unique.
- Use CSS variables and shared utility classes instead of inline `style=`.
- Rework highest-traffic templates first: home, breed detail, category hub, blog article, partner/service guide.

## Guardrails

- No new page should add a large local `<style>` block unless the design system is missing a primitive.
- No public content should mention technical, SEO, affiliate-network, feed, tracking, KPI, or generator language.
- Product and service monetization must appear as useful decision support for dog people, not as promotional filler.
