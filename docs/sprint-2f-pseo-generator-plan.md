# Sprint 2F — AWIN-Led Rich PSEO Generator Plan

## Goal

Generate rich commerce/PSEO pages from the most recent joined and active AWIN data, not from hardcoded lifecycle buckets.

`puppy`, `senior-dogs` and `insurance` remain useful internal clusters, but they should not be the primary generator driver. The primary driver is current monetization coverage:

- joined + active AWIN programmes;
- AWIN topic tags;
- programme deeplinks;
- product/feed rows;
- logos and creatives when available;
- KPI signals such as EPC, conversion rate, approval percentage and commission range;
- Amazon.com validated rows and fallback search opportunities;
- inventory/backlog alignment.

## Build policy

The production prebuild may automatically generate only a limited set of AWIN-led commerce cluster pages:

```bash
npm run content:generate:pseo:ci
```

This is intentionally limited to `--mode=clusters --limit=12 --apply` and wrapped as a non-blocking CI step. Breed-specific mass generation remains manual:

```bash
npm run content:generate:pseo:breed-pages
```

## Initial commerce clusters

- Dog food, broth and nutrition partners
- Dog training, recall, harness and safety gear partners
- Personalized dog gifts, portraits and lifestyle partners
- Dog beds, comfort and home setup partners
- Dog health, wellness and vet-adjacent partner resources

## Why this approach

This creates more useful commercial pages because pages can combine multiple AWIN partners/products into one rich guide, rather than creating thin single-program or generic lifecycle pages.

## Validation sequence

```bash
npm run awin:sync:local
npm run partners:generate
npm run amazon:sync
npm run content:inventory
npm run content:generate:pseo:check
npm run content:generate:pseo:clusters
npm run content:refresh
npm run content:inventory
npm run sitemap:generate
npm run build
```

## Next audit focus

After this is merged to `Pupwiki`, audit the existing site structure and prioritize the full breeds section rework. Highest expected ROI:

1. Breed detail page layout and mobile UX.
2. Breed index/filter/search UX.
3. Breed support pages and internal linking.
4. Image/gallery consistency.
5. Commerce modules tied to breed intent.
