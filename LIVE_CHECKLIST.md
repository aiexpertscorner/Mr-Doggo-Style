# MrDoggoStyle — Pre-Launch Checklist
# Run these in order before going live on Cloudflare

## STAP 1: Image fixes (15 min)

```bash
# Patch de 4 ontbrekende breed images (German Shepherd, Saint Bernard, Bloodhound, Brussels Griffon)
node scripts/patch-breed-images.mjs

# Download product images (brand logos als fallback)
# Dit duurt ~5 min voor 125 producten
node scripts/download-product-images.mjs
```

## STAP 2: Sitemap genereren

```bash
node generate-sitemap.mjs
# Verwacht output: ~3000+ URLs
```

## STAP 3: Final build

```bash
npm run build
# Verwacht: ~2950 pages, 0 errors
(Get-ChildItem -Path dist -Recurse -Filter "*.html").Count
```

## STAP 4: Preview check

```bash
npm run preview
```

Controleer:
- [ ] `localhost:4321/` — homepage laadt correct
- [ ] `localhost:4321/breeds/labrador-retriever` — foto + ranking data + producten
- [ ] `localhost:4321/breeds` — grid met foto's + filters werken
- [ ] `localhost:4321/blog/best-food-for-labrador-retriever` — breed band + cluster links
- [ ] `localhost:4321/dog-names/labrador-retriever` — tabs + themes + FAQ
- [ ] `localhost:4321/dog-names` — hero search + A-Z gids
- [ ] `localhost:4321/sitemap.xml` — URLs zichtbaar
- [ ] `localhost:4321/robots.txt` — correct

## STAP 5: Deploy naar Cloudflare

```bash
git add .
git commit -m "v2 launch: 2931 pages, breed images, product images, sitemap"
git push origin main
```

Cloudflare Pages bouwt automatisch na push (2-3 min).

## STAP 6: Post-deploy checks

- [ ] https://mrdoggostyle.com/ laadt
- [ ] https://mrdoggostyle.com/sitemap.xml bereikbaar
- [ ] https://mrdoggostyle.com/robots.txt bereikbaar

## STAP 7: Google Search Console (dag 1)

1. Ga naar https://search.google.com/search-console
2. Voeg property toe: https://mrdoggostyle.com
3. Verifieer via Cloudflare DNS TXT record
4. Sitemaps → submit: https://mrdoggostyle.com/sitemap.xml
5. URL Inspection → test 3-5 pagina's

## NA LAUNCH (week 1)

- [ ] SiteStripe: top 20 product images ophalen (zie SITESTRIPE_GUIDE.txt)
- [ ] node scripts/download-product-images.mjs (na SiteStripe updates)
- [ ] Google Analytics 4 verifiëren data binnenkomt
- [ ] Bing Webmaster Tools sitemap indienen
- [ ] EmailOctopus account aanmaken voor newsletter

## REVENUE GOALS (maand 1)

Targets:
- 500 organische sessies
- 50 affiliate clicks
- 5 conversies (~$15 commissie)

Verwacht verkeer na indexering: 3-6 weken
Eerste significante verkeer: maand 2-3
