# 🚀 Upgrade Installation Guide
# Drop these files into your existing mrdoggostyle project

## What's in this pack

| File/Folder | Action | Description |
|---|---|---|
| `src/layouts/BaseLayout.astro` | **Replace** | Full schema, GA4, exit popup, breadcrumbs |
| `src/layouts/BlogLayout.astro` | **Replace** | Sidebar, progress bar, TOC support, inline CTAs |
| `src/components/SidebarWidget.astro` | **Add new** | Sticky product CTA in sidebar |
| `src/components/InlineCTA.astro` | **Add new** | Revenue CTA block every ~500 words |
| `src/components/ProductReviewCard.astro` | **Add new** | Full card with pros/cons + Review schema |
| `src/components/FAQSection.astro` | **Add new** | Accordion FAQ with FAQPage schema |
| `src/components/TableOfContents.astro` | **Add new** | Scroll-spy TOC |
| `src/components/VerdictBox.astro` | **Add new** | "Our Verdict" editorial callout |
| `src/pages/breeds/[breed].astro` | **Add new** | 5 breed guide pages |
| `src/content/blog/*.md` | **Add new** | 5 new blog posts |
| `EMAIL_SEQUENCE.md` | **Reference** | 5 onboarding emails to set up in your ESP |
| `SEO_LAUNCH_PACK.md` | **Reference** | Keyword targets, internal links, schema checklist |

---

## Step-by-Step Install

### 1. Back up your current project
```bash
cp -r mrdoggostyle mrdoggostyle-backup
```

### 2. Copy upgraded layout files
```bash
# From mrdoggostyle-upgrade/ into mrdoggostyle/
cp src/layouts/BaseLayout.astro  ../mrdoggostyle/src/layouts/BaseLayout.astro
cp src/layouts/BlogLayout.astro  ../mrdoggostyle/src/layouts/BlogLayout.astro
```

### 3. Copy new components
```bash
cp src/components/SidebarWidget.astro       ../mrdoggostyle/src/components/
cp src/components/InlineCTA.astro           ../mrdoggostyle/src/components/
cp src/components/ProductReviewCard.astro   ../mrdoggostyle/src/components/
cp src/components/FAQSection.astro          ../mrdoggostyle/src/components/
cp src/components/TableOfContents.astro     ../mrdoggostyle/src/components/
cp src/components/VerdictBox.astro          ../mrdoggostyle/src/components/
```

### 4. Copy new pages
```bash
mkdir -p ../mrdoggostyle/src/pages/breeds
cp src/pages/breeds/[breed].astro  ../mrdoggostyle/src/pages/breeds/
```

### 5. Copy new blog posts
```bash
cp src/content/blog/*.md  ../mrdoggostyle/src/content/blog/
```

### 6. Set up GA4 (optional but recommended)
In your Cloudflare Pages environment variables, add:
```
PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX
```
Replace with your actual GA4 Measurement ID from analytics.google.com.

### 7. Test the build
```bash
cd mrdoggostyle
npm run dev
```

Check these pages work:
- http://localhost:4321 (homepage)
- http://localhost:4321/blog/best-dog-food-large-breeds (sidebar + progress bar)
- http://localhost:4321/breeds/golden-retriever (breed page)
- http://localhost:4321/breeds/german-shepherd

### 8. Build for production
```bash
npm run build
```

---

## Using the New Components in Blog Posts

### Add an InlineCTA every ~500 words:
```mdx
import InlineCTA from '../../components/InlineCTA.astro';

<InlineCTA
  name="Purina Pro Plan Large Breed"
  asin="B0042EFNXW"
  price={54.99}
  rating={4.8}
  label="Our Top Pick"
  note="26% protein, glucosamine included"
/>
```

### Add a FAQ section with schema:
```mdx
import FAQSection from '../../components/FAQSection.astro';

<FAQSection faqs={[
  { question: "How much should I feed my large breed dog?", answer: "Follow the bag guidelines as a starting point, then adjust based on body condition score..." },
  { question: "When should I switch to adult food?", answer: "Large breeds: 12-18 months. Giant breeds: 18-24 months." },
]} />
```

### Add a verdict box at the end:
```mdx
import VerdictBox from '../../components/VerdictBox.astro';

<VerdictBox
  winner="Purina Pro Plan Large Breed Adult"
  winnerAsin="B0042EFNXW"
  winnerNote="Best combination of research backing, palatability, and value for large breed adults."
  budgetPick="Iams ProActive Health Large Breed"
  budgetAsin="B004QOKRH2"
  budgetNote="Genuine quality at budget pricing — backed by Mars Petcare research."
/>
```

### Enable BlogLayout sidebar for a post:
In the post's frontmatter (if using new BlogLayout), add `featuredProduct`:
```yaml
---
title: "Best Dog Food for Large Breeds 2026"
featuredProduct:
  name: "Purina Pro Plan Large Breed"
  asin: "B0042EFNXW"
  price: 54.99
  rating: 4.8
---
```

---

## New Breed Pages

Five pages are now generated at:
- `/breeds/golden-retriever`
- `/breeds/german-shepherd`
- `/breeds/labrador-retriever`
- `/breeds/french-bulldog`
- `/breeds/husky`

**To add more breeds:**
Edit `src/pages/breeds/[breed].astro` and add a new entry to the `breeds` array:
```js
{
  slug: 'australian-shepherd',
  name: 'Australian Shepherd',
  emoji: '🐕',
  description: '...',
  traits: ['Very high energy', 'Herding drive', ...],
  topFood: { name: '...', asin: '...', price: 0, rating: 4.5, verdict: '...' },
  topToy: { ... },
  topBed: { ... },
  topSupplement: { ... },
  seoTitle: '...',
  seoDesc: '...',
  relatedPosts: [...]
}
```

---

## Email Sequence Setup

See `EMAIL_SEQUENCE.md` for all 5 emails.

**Mailchimp setup:**
1. Audience → Automations → Welcome series
2. Create 5-step automation
3. Paste each email, set delays (immediately, +2 days, +4, +6, +8)
4. Set trigger: subscribes to list

**ConvertKit setup:**
1. Automations → Sequences
2. Create sequence with 5 emails
3. Set delays between emails
4. Trigger via form submission tag

**EmailOctopus:**
1. Automation → Create automation
2. Trigger: contact subscribed
3. Add 5 email steps with delays

Replace all `[First Name]` with your ESP's first-name merge tag.
Replace all affiliate links if your tag has changed.

---

## Schema Validation After Deploy

After deploying to Cloudflare Pages, test these URLs:
1. https://search.google.com/test/rich-results?url=https://mrdoggostyle.com/blog/best-dog-food-large-breeds
2. https://search.google.com/test/rich-results?url=https://mrdoggostyle.com/breeds/golden-retriever
3. https://validator.schema.org/#url=https://mrdoggostyle.com

Target: 0 errors, any warnings reviewed.

---

## Revenue Optimization: Quick Wins After Launch

1. **Add InlineCTA to your 5 highest-traffic posts first** (usually 2-3 months after launch, use GSC to find them)
2. **Set up email welcome sequence** — subscribers who get the sequence convert 3-5x better
3. **A/B test exit popup text** — "Free Guide" vs "Product Recommendations" 
4. **Add FAQ sections to top posts** — FAQ schema frequently earns rich results in Google
5. **Submit breed pages to Google manually** via Search Console URL inspection

Good luck — you've got a solid foundation. The rest is content + links + time.
