# Brands + Cost Calculator Pack — Install Guide

## Files in this pack

| File | Destination |
|---|---|
| brands.json | src/data/brands.json |
| chewy-taxonomy.json | src/data/chewy-taxonomy.json |
| brand-page.astro | src/pages/brands/[brand].astro |
| brands-index.astro | src/pages/brands/index.astro |
| cost-calculator.astro | src/pages/cost-calculator/[breed].astro |
| ProductCard.astro | src/components/ProductCard.astro |
| download-brand-logos.mjs | scripts/download-brand-logos.mjs |

## Install commands (PowerShell from Downloads folder)

```powershell
$src = "$env:USERPROFILE\Downloads"
$dst = "E:\2026_Github\Mr-Doggo-Style"

# Data files
Copy-Item "$src\brands.json"          "$dst\src\data\brands.json"          -Force
Copy-Item "$src\chewy-taxonomy.json"  "$dst\src\data\chewy-taxonomy.json"  -Force

# Create dirs
New-Item -ItemType Directory -Force "$dst\src\pages\brands"
New-Item -ItemType Directory -Force "$dst\src\pages\cost-calculator"
New-Item -ItemType Directory -Force "$dst\public\images\brands"

# Pages
Copy-Item -LiteralPath "$src\brand-page.astro"       "$dst\src\pages\brands\[brand].astro" -Force
Copy-Item "$src\brands-index.astro"                   "$dst\src\pages\brands\index.astro"   -Force
Copy-Item -LiteralPath "$src\cost-calculator.astro"  "$dst\src\pages\cost-calculator\[breed].astro" -Force

# Component
Copy-Item "$src\ProductCard.astro"  "$dst\src\components\ProductCard.astro" -Force

# Scripts
Copy-Item "$src\download-brand-logos.mjs" "$dst\scripts\download-brand-logos.mjs" -Force
```

## Run after install

```bash
# Download all 100 brand logos (from Clearbit CDN, ~3 min)
node scripts/download-brand-logos.mjs

# Build and push
npm run build
git add .
git commit -m "brands: 100 brand hubs, dual CTAs, cost calculators (277 pages)"
git push
```

## What this adds

- 100 brand hub pages (/brands/kong, /brands/purina-pro-plan, etc.)
- 277 cost calculator pages (/cost-calculator/labrador-retriever, etc.)
- Dual Amazon + Chewy CTA on all ProductCards
- Brand logo in every ProductCard
- brands/index.astro directory
- chewy-taxonomy.json for subcategory page generation (session 3)

## Total new pages after this pack

| Before | After |
|---|---|
| 2931 pages | ~3308 pages |
| 0 brand pages | 100 brand hubs |
| 0 cost pages | 277 cost calculators |
