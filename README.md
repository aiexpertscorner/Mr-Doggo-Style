# 🐾 Mr. Doggo Style

A production-ready Astro.js affiliate website for dog product reviews, monetized via Amazon Associates.

**Live URL:** https://mrdoggostyle.com  
**Amazon Tag:** `aiexpertscorn-20`  
**Tech Stack:** Astro.js 4, Tailwind CSS, Cloudflare Pages

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start local dev server
npm run dev
# → Opens at http://localhost:4321

# 3. Production build
npm run build
# → Outputs to /dist

# 4. Preview production build
npm run preview
```

---

## Project Structure

```
mrdoggostyle/
├── src/
│   ├── pages/
│   │   ├── index.astro              # Homepage
│   │   ├── about.astro              # About page
│   │   ├── disclosure.astro         # Affiliate disclosure (FTC required)
│   │   ├── rss.xml.js               # RSS feed
│   │   ├── blog/
│   │   │   ├── index.astro          # Blog listing page
│   │   │   └── [slug].astro         # Dynamic blog post template
│   │   └── categories/
│   │       └── [category].astro     # Category pages (auto-generated)
│   ├── content/
│   │   └── blog/                    # All 20 blog posts (.md files)
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ProductCard.astro        # Amazon product card with affiliate link
│   │   ├── ComparisonTable.astro    # Product comparison table
│   │   ├── AffiliateDisclosure.astro
│   │   ├── Newsletter.astro
│   │   └── RelatedPosts.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro         # Global layout (SEO, fonts, header/footer)
│   │   └── BlogLayout.astro         # Blog post layout
│   └── data/
│       └── products.json            # Product database (50+ products)
├── public/
│   ├── robots.txt
│   └── favicon.svg
├── .github/
│   └── workflows/
│       └── deploy.yml               # Auto-deploy to Cloudflare Pages
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── .env.example
```

---

## Adding a New Blog Post

Create a new `.md` file in `src/content/blog/`:

```markdown
---
title: "Best Dog Backpacks for Hiking 2026"
description: "We tested 8 dog backpacks on real trails..."
pubDate: 2026-03-15
category: "Training"
tags: ["outdoor", "hiking", "gear"]
---

Your full post content here...
```

The post automatically appears in:
- `/blog` (listing page)
- `/blog/your-slug` (post page)
- `/categories/training` (category page)
- `/rss.xml` (RSS feed)
- Sitemap

---

## Using ProductCard in Blog Posts

Add to any `.astro` page:

```astro
---
import ProductCard from '../../components/ProductCard.astro';
---

<ProductCard
  name="KONG Extreme Dog Toy"
  asin="B0002AR0II"
  price={17.99}
  rating={4.7}
  reviewCount={42000}
  badge="Editor's Pick"
  features={[
    "Ultra-durable natural rubber",
    "Stuffable for mental stimulation",
    "Dishwasher safe"
  ]}
/>
```

**All affiliate links automatically include the tag** `aiexpertscorn-20`.

---

## Using ComparisonTable in Blog Posts

```astro
---
import ComparisonTable from '../../components/ComparisonTable.astro';

const products = [
  {
    name: "KONG Extreme",
    asin: "B0002AR0II",
    price: 17.99,
    rating: 4.7,
    highlight: "Best overall for most chewers",
    badge: "Top Pick"
  },
  {
    name: "Goughnuts MAXX",
    asin: "B004RWVB5K",
    price: 38.99,
    rating: 4.5,
    highlight: "For extreme power chewers"
  }
];
---

<ComparisonTable products={products} />
```

---

## Changing the Amazon Affiliate Tag

The tag is set in two places:

1. **Default in components** — `src/components/ProductCard.astro` and `ComparisonTable.astro` have `tag = "aiexpertscorn-20"` as a default prop.
2. **Override per component** — Pass `tag="your-tag"` to any component.

To update globally, do a find-replace for `aiexpertscorn-20` across the entire `src/` directory.

---

## Adding Product Images

Product images go in `public/images/products/`. Reference them in `products.json`:

```json
"image": "/images/products/kong-extreme.jpg"
```

**Recommended image sources:**
- Download from Amazon product pages (check their terms)
- Use Amazon's Product Advertising API to serve official images
- Use placeholder services during development: `https://placedog.net/400/300`

---

## SEO Configuration

Each page gets full SEO treatment via `BaseLayout.astro`:
- `<title>` tag (auto-formatted)
- Meta description
- Open Graph tags
- Twitter Card tags
- Canonical URL
- JSON-LD schema markup (articles get Article schema, pages get WebPage)

The `@astrojs/sitemap` integration auto-generates `sitemap-index.xml` at build time.

---

## Deploying to Cloudflare Pages

### Option 1: Connect GitHub (Recommended)

1. Push this repo to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com)
3. Connect your GitHub repository
4. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Add secrets in Cloudflare dashboard:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### Option 2: Manual Deploy via Wrangler

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=mrdoggostyle
```

### Option 3: GitHub Actions Auto-Deploy

The `.github/workflows/deploy.yml` handles automatic deployment on push to `main`. Add these GitHub Secrets:
- `CLOUDFLARE_API_TOKEN` — from Cloudflare API Tokens
- `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare dashboard URL

---

## Setting Up Google Analytics

1. Create a GA4 property at analytics.google.com
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Uncomment the GA script block in `src/layouts/BaseLayout.astro`
4. Replace `G-XXXXXXXXXX` with your ID

---

## Setting Up Newsletter (Mailchimp Example)

1. Create a Mailchimp account and audience
2. Go to Audience > Signup Forms > Embedded Forms
3. Copy the form action URL
4. In `src/components/Newsletter.astro`, replace the `action` attribute:

```html
<form action="https://yourlist.us1.list-manage.com/subscribe/post?u=XXX&id=XXX" method="POST">
```

---

## Performance Notes

Target Lighthouse scores (achieved with SSG + Tailwind):
- Performance: 95+
- Accessibility: 95+
- Best Practices: 100
- SEO: 100

Key optimizations included:
- Static Site Generation (no server required)
- Tailwind CSS (purged at build — tiny CSS output)
- Google Fonts with `display=swap`
- Lazy-loaded images (`loading="lazy"` on all product images)
- No JavaScript frameworks — Astro ships zero JS by default

---

## FTC Compliance Checklist

- ✅ Affiliate disclosure banner on every blog post (`AffiliateDisclosure.astro`)
- ✅ Disclosure footer on every page (`Footer.astro`)
- ✅ Dedicated `/disclosure` page
- ✅ `rel="nofollow sponsored"` on all affiliate links
- ✅ "As an Amazon Associate" language in footer

---

## Content Calendar: Next Posts to Write

Based on keyword research, high-priority additions:
1. Best Dog Crates for Large Breeds
2. Best Dog Collars for Large Breeds
3. Best Automatic Dog Feeders
4. Best Dog Water Fountains
5. Best Dog Strollers
6. Best Dog Car Seat Covers
7. Best Dog Cooling Mats
8. Best Flea & Tick Prevention Collars
9. Chewy vs Amazon for Dog Food
10. Best Dog First Aid Kits

---

## License

Content and code © 2026 Mr. Doggo Style. All rights reserved.  
Amazon, the Amazon logo, and Amazon Associates are trademarks of Amazon.com, Inc.
