# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Dev Commands

```bash
npm run dev        # Start Astro dev server
npm run build      # Production build → dist/
npm run preview    # Preview the production build locally
node generate-sitemap.mjs   # Regenerate public/sitemap.xml after adding new pages/breeds
```

There are no lint or test scripts configured. The build (`astro build`) is the primary validation step.

Data/content utility scripts live in both the root directory and `scripts/`. They are run with `node <script>.mjs` directly and handle tasks like enriching breed data, downloading product images, and auditing content status.

## Architecture

This is a fully static Astro 4 site deployed to Cloudflare Pages via GitHub Actions (`.github/workflows/deploy.yml`). All pages are statically generated at build time using `getStaticPaths()`.

**Page routes and their data sources:**

- `/breeds/[breed]` — one page per entry in `src/data/master-breeds.json`, enriched with `src/data/product-index.json`, `src/data/breed-link-map.json`, and `src/data/content-status.json`
- `/blog/[slug]` — sourced from Astro content collections at `src/content/blog/` (Markdown files)
- `/categories/[category]` — statically defined set of 10 category slugs; filters blog posts by category/tag
- `/dog-names/[breed]` — one per breed, sourced from `src/data/dog-names.json` and `master-breeds.json`
- `/cost-calculator/[breed]` — per-breed cost calculator
- `/brands/[brand]` — sourced from `src/data/brands.json`

**Data layer (`src/data/`):**

The core data files are JSON, imported directly into `.astro` files:
- `master-breeds.json` — canonical breed records (slug, traits, size, temperament, AKC/FCI data, `product_picks` mapping category→product-id)
- `product-index.json` — flat keyed map of product objects (id, ASIN, price, rating, image URL)
- `products.json` — products organized by category array
- `breed-link-map.json` — maps each breed slug to all its cluster page URLs (food_post, toy_post, bed_post, etc.)
- `content-status.json` — tracks which cluster content types exist per breed (boolean flags)
- `brands.json`, `category-taxonomy.json`, `cluster-definitions.json` — supporting reference data

**Content collections (`src/content/blog/`):**

Markdown posts use Astro content collections. The schema is defined in `src/config.ts` and requires: `title`, `description`, `pubDate`. Optional: `updatedDate`, `image`, `category`, `tags`, `author`.

**Layouts:**

- `BaseLayout.astro` — root layout with full `<head>`, OG/Twitter meta, Schema.org WebSite JSON-LD, GA4 (via `PUBLIC_GA_MEASUREMENT_ID` env var), and a single `main.css` import
- `BlogLayout.astro` — extends BaseLayout; adds article hero, affiliate disclosure notice, and a two-column article + sidebar layout

**Styling:**

CSS is split into a design token system at `src/styles/`:
- `tokens.css` — all CSS custom properties (colors, typography, spacing, shadows, z-index, transitions)
- `main.css` — entry point that imports tokens, base, grid, and all component/feature CSS files
- Tailwind CSS (`tailwind.config.mjs`) is also active and used in many `.astro` files alongside the custom CSS

The site uses a light theme only (dark mode intentionally left empty in tokens.css). Primary brand color is teal (`#0D9488`), accent is amber (`#F59E0B`). The Tailwind config extends with custom colors (`midnight`, `concrete`, `lime`/`#CCFF00`) and animations (marquee, glitch, flicker) for streetwear-aesthetic sections.

## Key Conventions

**Affiliate links:** Amazon Associates tag `aiexpertscorn-20` is hardcoded in breed/dog-names pages as `const AFFILIATE_TAG`. Product ASINs are stored in `product-index.json`; the helper `amzUrl(asin)` constructs the full Amazon link.

**Breed cluster model:** Each breed has a "cluster" of up to 10 content types (food, toys, beds, grooming, training, supplements, names, health, cost calculator, hub page). `breed-link-map.json` stores the URLs; `content-status.json` stores booleans for what exists. Pages check these before rendering links.

**Static paths pattern:** All dynamic routes call `getStaticPaths()` that maps over the relevant JSON data file. Example: `masterBreeds.map(b => ({ params: { breed: b.slug } }))`.

**Sitemap:** The built-in `@astrojs/sitemap` integration is disabled. The sitemap is generated manually with `node generate-sitemap.mjs` and committed to `public/sitemap.xml`.

**No framework JavaScript:** The site ships no client-side JS framework. Interactivity (mobile menu, search trigger) is handled with vanilla JS in `<script>` tags within `.astro` files or in `public/scripts/`.

**Blog frontmatter:** Posts optionally include `breedSlug` and `breedName` to associate them with a breed cluster, and `topProduct` (with `asin`) to populate the sidebar product widget.

**Environment variable:** `PUBLIC_GA_MEASUREMENT_ID` enables Google Analytics 4 in the base layout when set.
