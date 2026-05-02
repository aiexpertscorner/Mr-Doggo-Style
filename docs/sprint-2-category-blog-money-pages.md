# Sprint 2 — Category Hubs, Blog Money Pages & Pexels Images

## Goal
Improve PupWiki’s highest commercial editorial surfaces after the Sprint 1 foundation: category hubs, blog index, blog articles, generated support posts, and partner/product placements.

## Audit summary

### Strong areas already present
- Category hub route is already componentized through `src/components/category/*`.
- Category pages already include Awin and Amazon partner blocks.
- Blog article route already has breed-aware context, Awin slots, Amazon slots, banner slots and related tools.
- Generated support posts are excluded from the public blog index, which keeps the blog feed cleaner.

### Problems found
- Blog index has large inline CSS and a local filter script.
- Blog detail page has a large inline style block for support notes, breed context, commerce blocks and related tools.
- Monetization UI patterns are repeated rather than centralized.
- Generated posts and blog pages often rely on fallback images or breed images instead of smart article-specific hero images.
- Build flow did not yet use the newly available `PEXELS_API_KEY`.

## Sprint 2 implementation

### Added Pexels image enrichment
New script:

```txt
scripts/enrich-content-images.mjs
```

It scans `src/content/blog/*.md` and adds or updates frontmatter:

```yaml
heroImage: "..."
image: "..."
heroImageAlt: "..."
imageAlt: "..."
imageSource: "pexels"
imageCredit: "Photo by ... on Pexels"
imageCreditUrl: "..."
imageSearchQuery: "..."
```

The script:
- loads `.env` and `.env.local` automatically for local runs;
- uses `PEXELS_API_KEY`;
- builds smart queries from category, title, post type and breed context;
- caches selected images in `src/data/image-cache/pexels-content-images.json`;
- skips posts that already have an image unless `--force` is used;
- exits safely if the key is missing so CI does not destroy builds.

### Added package scripts

```json
"images:content": "node scripts/enrich-content-images.mjs --apply --limit 120",
"images:content:force": "node scripts/enrich-content-images.mjs --apply --force --limit 120",
"images:content:ci": "node scripts/enrich-content-images.mjs --apply --limit 80 || echo \"Pexels content image enrichment failed or skipped; continuing build with existing images\""
```

`prebuild` now runs:

```txt
content:refresh → images:content:ci → awin:sync:ci → images:enrich:ci → amazon:sync
```

### Updated deploy workflow
The GitHub deploy workflow now passes:

```yaml
PEXELS_API_KEY: ${{ secrets.PEXELS_API_KEY }}
```

and runs Pexels image enrichment after generated content refresh and before the build.

### Added shared monetization CSS
New file:

```txt
public/styles/components/monetization.css
```

Shared classes:

```txt
pw-money-panel
pw-money-panel__head
pw-money-panel__label
pw-money-grid
pw-affiliate-note
pw-disclosure-note
pw-commerce-strip
pw-commercial-safe-note
```

This prepares category/blog/breed money modules to use one consistent partner/product visual language.

### Updated env docs
`.env.example` now includes:

```env
PEXELS_API_KEY=
PUBLIC_ENABLE_AWIN_MASTERTAG=true
```

## How to run locally

```bash
npm run images:content
npm run images:content:force
npm run build
```

Use force only when intentionally replacing existing hero images.

## Next Sprint 2 build steps

1. Move blog index inline CSS into `public/styles/pages/blog.css`.
2. Move blog article inline CSS into `public/styles/pages/article.css`.
3. Convert article commerce/support sections to use `pw-money-panel` and `pw-money-grid` classes.
4. Add `ArticleCommerceSuite.astro` so `src/pages/blog/[slug].astro` gets smaller.
5. Add `BlogCard.astro` and `BlogTopicCard.astro` for cleaner blog index composition.
6. Audit category components and migrate repeated local styles to the new foundation and monetization CSS.

## Commercial strategy

Priority pages for monetization work:

1. Product-roundup blog posts with non-health-sensitive intent.
2. Category hubs: dog-food, training, toys, beds, grooming, lifestyle.
3. Breed pages with strong owner-intent: food, training, beds, grooming, cost.
4. Blog editorial guides that naturally support partner tools or Amazon products.
5. Health/supplement pages only with conservative placement, clear disclaimers and no overclaiming.
