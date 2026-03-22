# 🎨 MR. DOGGO STYLE — Streetwear Redesign Pack
## Bold Brutalist · Cyber Lime · Dark Midnight

---

## What Changed

| Area | Old (Classic Luxury) | New (Streetwear Brutalist) |
|---|---|---|
| **Colors** | Warm bark brown, cream | Deep Midnight `#0A0A0A` + Cyber Lime `#CCFF00` |
| **Typography** | Playfair Display serif | Anton + Archivo Black (uppercase, tight tracking) |
| **Body copy** | Source Serif 4 | Barlow Condensed (fast, editorial) |
| **Buttons** | Soft rounded, gradient | Hard 4px shadow, sharp corners |
| **Cards** | Soft shadows, warm borders | `border: 2px solid rgba(255,255,255,0.12)` bento style |
| **Product hover** | Subtle lift | CSS Glitch effect (hue-rotate + clip-path animation) |
| **Ticker** | None | Fast-moving marquee strip in every section break |
| **Hero** | Traditional centered | Massive 10rem Anton type, full-viewport bento grid |
| **Background** | Cream white | Grain texture SVG overlay on midnight black |

---

## How to Install

### Option A: Full replace (recommended)
```bash
# From inside E:\2026_Github\mrdoggostyle_site
node E:\2026_Github\migrate-streetwear.mjs --backup
npm install
npm run dev
```

### Option B: Manual copy
Copy the following into your existing project, overwriting:

**New files (copy directly):**
```
src/layouts/BaseLayout.astro      ← Full redesign
src/layouts/BlogLayout.astro      ← Full redesign + sidebar
src/components/Header.astro       ← Dark + marquee ticker
src/components/Footer.astro       ← Bold Anton logotype
src/components/Marquee.astro      ← NEW — infinite scroll strip
src/components/ProductCard.astro  ← Bento + glitch hover
src/components/ProductReviewCard.astro
src/components/ComparisonTable.astro
src/components/InlineCTA.astro
src/components/VerdictBox.astro
src/components/FAQSection.astro
src/components/AffiliateDisclosure.astro
src/components/Newsletter.astro
src/components/SidebarWidget.astro
src/components/RelatedPosts.astro
src/components/PriceComparisonWidget.astro
src/components/TableOfContents.astro
src/pages/index.astro             ← Full bento homepage
src/pages/blog/index.astro        ← Dark filter grid
src/pages/blog/[slug].astro       ← (no change needed)
src/pages/categories/[category].astro
src/pages/about.astro
src/pages/disclosure.astro
tailwind.config.mjs               ← New design tokens + animations
```

---

## Design Tokens

Use these CSS variables anywhere in your custom styles:

```css
--midnight:       #0A0A0A   /* Primary background */
--concrete:       #222222   /* Card background */
--concrete-light: #2E2E2E   /* Hover state, image zones */
--lime:           #CCFF00   /* ALL accent usage */
--lime-dim:       #AADD00   /* Dimmed accent */
--ash:            #888888   /* Muted text */
--smoke:          #AAAAAA   /* Secondary text */
--offwhite:       #F0F0F0   /* Primary text */
```

---

## Fonts Loaded

| Font | Usage | Weight |
|---|---|---|
| **Anton** | Hero headings, big display text | 400 (italic + regular) |
| **Archivo Black** | Section headings, buttons, labels | 400 |
| **Barlow Condensed** | Body text, UI text | 300, 400, 600, 700 |
| **Space Mono** | Labels, stats, metadata | 400, 700 |
| **Source Serif 4** | Blog post body content | 400 |

---

## New CSS Classes

```css
.display-text    /* Anton + uppercase + tight tracking */
.btn-lime        /* Lime fill button with hard shadow */
.btn-outline     /* White bordered button with hard shadow */
.btn-amazon-street  /* Lime CTA button for product links */
.sticker-lime    /* Lime sticker badge, slight rotation */
.sticker-white   /* White sticker badge */
.sticker-red     /* Red sticker badge */
.sticker-black   /* Black/lime sticker badge */
.card-dark       /* Dark concrete card with white border */
.card-lime-border  /* Dark card with lime border + hard shadow */
.glitch-wrap     /* Text glitch on hover */
.glitch-img      /* Image hue-rotate glitch on hover */
.marquee-track   /* Base marquee track */
.marquee-track.play     /* Normal speed */
.marquee-track.fast     /* Fast scroll */
.marquee-track.slow     /* Slow scroll */
.marquee-track.reverse  /* Right-to-left */
.prose-street    /* Dark mode blog post typography */
.disclosure-street  /* Lime bordered disclosure block */
.reveal          /* Scroll-triggered fade-in */
```

---

## Using the Marquee Component

```astro
---
import Marquee from '../components/Marquee.astro';
---

<!-- Default lime strip -->
<Marquee />

<!-- Custom items, dark background -->
<Marquee
  items={["SALE LIVE NOW", "LIMITED STOCK", "FREE SHIPPING"]}
  speed="fast"
  bg="var(--midnight)"
  color="var(--lime)"
/>

<!-- Reverse direction -->
<Marquee direction="right" speed="slow" />
```

---

## Using Glitch Effects

**Text glitch (hover):**
```html
<h2 class="glitch-wrap" data-text="KONG EXTREME">KONG EXTREME</h2>
```

**Image glitch (hover):**
```html
<div class="glitch-img">
  <img src="/product.jpg" alt="Product" />
</div>
```

---

## Bento Grid Pattern

The homepage uses a 12-column bento grid for product layouts:

```html
<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:1rem">
  <!-- Spans 8 of 12 cols on desktop -->
  <div style="grid-column:span 12" class="lg-col-8">Hero card</div>
  <!-- Spans 4 of 12 cols on desktop -->
  <div style="grid-column:span 12" class="lg-col-4">Side card</div>
</div>
```

---

## Affiliate Tag

All links use: **`aiexpertscorn-20`**

To change globally, find-replace `aiexpertscorn-20` in `src/`.

---

## Deploy

```bash
npm run build    # → /dist (static HTML, zero server)
# Push to GitHub → Cloudflare Pages auto-deploys
```

Lighthouse targets with this build:
- Performance: **95+** (static HTML, no JS frameworks)
- SEO: **100** (full schema, canonical, OG, Twitter cards)
- Accessibility: **90+** (semantic HTML, aria labels)
