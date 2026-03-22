# Deployment Guide

## Cloudflare Pages (Recommended)

Cloudflare Pages is free for personal projects, has unlimited bandwidth, and deploys globally to 300+ edge locations. Perfect for a static Astro site.

### Step 1: Push to GitHub

```bash
cd mrdoggostyle
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mrdoggostyle.git
git push -u origin main
```

### Step 2: Connect to Cloudflare Pages

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** in the sidebar
3. Click **Create application** → **Pages** → **Connect to Git**
4. Select your GitHub repository
5. Configure build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20
6. Click **Save and Deploy**

Your site will be live at `https://mrdoggostyle.pages.dev` within 2-3 minutes.

### Step 3: Add Custom Domain

1. In Cloudflare Pages project → **Custom domains**
2. Add `mrdoggostyle.com`
3. If your domain is on Cloudflare DNS: auto-configured
4. If elsewhere: update your DNS with the provided CNAME record

---

## GitHub Pages (Alternative)

If you prefer GitHub Pages over Cloudflare:

### astro.config.mjs update needed:
```js
export default defineConfig({
  site: 'https://YOUR_USERNAME.github.io',
  base: '/mrdoggostyle',  // if not a custom domain
  // ...
});
```

### Add GitHub Actions workflow:
The file `.github/workflows/deploy.yml` already handles Cloudflare. For GitHub Pages, replace with:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    permissions:
      pages: write
      id-token: write
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## Environment Variables in Production

Set these in Cloudflare Pages dashboard → Settings → Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `PUBLIC_GA_MEASUREMENT_ID` | G-XXXXXXXXXX | Your GA4 ID |
| `PUBLIC_AMAZON_TAG` | aiexpertscorn-20 | Your affiliate tag |

---

## Post-Deployment Checklist

- [ ] Site loads at custom domain
- [ ] HTTPS certificate active (auto on Cloudflare)
- [ ] `/sitemap-index.xml` accessible
- [ ] `/rss.xml` accessible
- [ ] `/robots.txt` accessible
- [ ] Test 3 affiliate links — verify tag is in URL
- [ ] Check mobile responsiveness
- [ ] Submit sitemap to Google Search Console
- [ ] Set up GA4 and verify traffic coming in

---

## Google Search Console Setup

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → URL prefix: `https://mrdoggostyle.com`
3. Verify ownership (HTML tag method, or DNS if on Cloudflare)
4. Sitemaps → Submit `https://mrdoggostyle.com/sitemap-index.xml`
5. Monitor indexing in Coverage report over first 2-4 weeks

---

## Amazon Associates Account Setup

1. Apply at [affiliate-program.amazon.com](https://affiliate-program.amazon.com)
2. Your website URL: `https://mrdoggostyle.com`
3. Topic: Pet Supplies / Dog Products
4. Traffic sources: SEO / Organic search
5. Once approved, your tag ID will be confirmed (currently using `aiexpertscorn-20`)

**Amazon requirements:**
- You must make 3 qualifying sales within 180 days of approval or your account is closed
- You must have the affiliate disclosure visible on all pages ✅ (already done)
- You cannot bid on Amazon-branded keywords in paid ads

---

## Monetization Timeline Expectations

- **Month 1-2:** Google indexes pages. No traffic yet from SEO.
- **Month 3-4:** First organic search impressions. Minimal clicks.
- **Month 6:** Some keyword rankings. 100-500 monthly visitors possible.
- **Month 12+:** Established rankings. 1,000-10,000+ monthly visitors possible for competitive terms.
- **Commission rate:** Amazon typically pays 4-8% for pet supplies. At $50 average order value, that's $2-4 per sale.

SEO takes time. Focus on adding quality content consistently (2-4 posts/month) and building backlinks.
