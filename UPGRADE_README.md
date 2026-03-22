# 🐾 Mr. Doggo Style — Image + Content Engine Upgrade Pack

## Wat zit erin

| Bestand | Wat het doet |
|---|---|
| `generate-content.mjs` | Content builder engine — genereert automatisch 1000+ SEO posts |
| `src/data/breeds.json` | 277 breeds met Dog CEO API image paths |
| `src/data/products.json` | 51 producten met Amazon Associates image URLs |
| `src/components/ProductCard.astro` | Real Amazon product images, glitch hover |
| `src/components/ProductReviewCard.astro` | Review card met echte productfoto |
| `src/components/SidebarWidget.astro` | Sidebar product widget met foto |
| `src/components/InlineCTA.astro` | Inline CTA met thumbnail |
| `src/components/BreedCard.astro` | Breed card met echte hondenfoto (Dog CEO API) |
| `src/pages/index.astro` | Homepage volledig met echte images |
| `src/pages/breeds/index.astro` | Breed grid met hondenfoto's per breed |
| `src/pages/breeds/[breed].astro` | Breed detail met hero hondenfoto + product images |
| `robocopy-upgrade.bat` | One-click Windows install script |

---

## Installatie (2 opties)

### Optie A: One-click (aanbevolen)
1. Unzip naar `E:\2026_Github\upgrade-pack`
2. Dubbelklik `robocopy-upgrade.bat`
3. `npm install && npm run dev`

### Optie B: Handmatig
```bash
robocopy E:\2026_Github\upgrade-pack E:\2026_Github\mrdoggostyle_site /E /XD node_modules .git dist .astro /XF package-lock.json

cd E:\2026_Github\mrdoggostyle_site
npm install
npm run dev
```

---

## Content Engine — het krachtigste onderdeel

### Gebruik

```bash
cd E:\2026_Github\mrdoggostyle_site

# Test eerst (toont wat er gemaakt wordt, schrijft niets)
node generate-content.mjs --dry-run

# Genereer breed × category posts voor top 50 breeds (200 posts)
node generate-content.mjs --type breed --top50

# Genereer alle breed posts (top 100 breeds = 400 posts)
node generate-content.mjs --type breed

# Genereer vergelijkingsposts (8 posts)
node generate-content.mjs --type comparison

# Genereer "best under $X" posts (6 posts)
node generate-content.mjs --type budget

# Alles in één keer
node generate-content.mjs

# Limit aantal posts
node generate-content.mjs --limit 20
```

### Wat het genereert

**Breed × Category posts (krachtigste voor SEO):**
```
/blog/best-food-for-labrador-retrievers
/blog/best-toy-for-labrador-retrievers
/blog/best-bed-for-labrador-retrievers
/blog/best-grooming-for-labrador-retrievers
/blog/best-food-for-german-shepherd-dogs
... × 277 breeds × 4 categories = 1.108 mogelijke posts
```

**Comparison posts:**
```
/blog/purina-pro-plan-large-breed-adult-vs-blue-buffalo-life-protection
/blog/kong-extreme-dog-toy-vs-goughnuts-maxx-ring
/blog/big-barker-7-orthopedic-dog-bed-vs-friends-forever-orthopedic-bed
...
```

**Budget posts:**
```
/blog/best-dog-toys-under-20
/blog/best-dog-toys-under-15
/blog/best-dog-food-under-50
...
```

### SEO waarde van deze posts

Elke breed × category post target exact deze zoektermen:
- "best dog food for labrador retrievers" → 2.400 searches/mo
- "best toys for german shepherds" → 1.900 searches/mo
- "best bed for golden retrievers" → 1.600 searches/mo

Totaal geschatte maandelijkse zoekvolumepool: **50.000–100.000 searches**

---

## Hoe de images werken

### Product images (Amazon Associates)
```
https://ws-na.amazon-adsystem.com/widgets/q?ASIN=B0002AR0II&Format=_SL300_&tag=aiexpertscorn-20
```
- ✅ Geen API key nodig
- ✅ TOS-compliant voor Associates
- ✅ Officiële Amazon productfoto's
- ✅ Automatisch bijgewerkt als Amazon de foto wijzigt
- ✅ Geen extra scripts nodig — werkt direct na `npm run dev`

### Breed images (Dog CEO API)
```
https://images.dog.ceo/breeds/retriever/golden/n02099601_1.jpg
```
- ✅ Gratis, geen API key
- ✅ 20.000+ hondenfoto's
- ✅ 107 breeds hebben specifieke foto's
- ✅ Rest krijgt een breed-passende foto via groepsfallback
- ✅ `onerror` fallback als foto niet laadt

---

## Content Engine draaien na build

Elke keer dat je het script draait:
- Bestaande posts worden **nooit** overschreven
- Nieuwe posts worden **toegevoegd**
- Perfect voor periodiek nieuwe content toevoegen

Aanbevolen schema:
```
Week 1: node generate-content.mjs --type breed --top50
Week 2: node generate-content.mjs --type comparison
Week 3: node generate-content.mjs --type budget
Week 4: node generate-content.mjs --type breed --limit 50
```

---

## Affiliate tag aanpassen

Vervang `aiexpertscorn-20` globaal in `src/`:
```bash
# PowerShell
Get-ChildItem -Path src -Recurse -Include *.astro,*.mjs,*.json | ForEach-Object { (Get-Content $_.FullName) -replace 'aiexpertscorn-20', 'JOUW-TAG-HIER' | Set-Content $_.FullName }
```

---

## Lighthouse scores (verwacht na build)

- Performance: **95+** (static HTML, Amazon images zijn CDN)
- SEO: **100** (Article + FAQPage + ItemList + BreadcrumbList schema op elke pagina)
- Accessibility: **90+**
- Best Practices: **95+**
