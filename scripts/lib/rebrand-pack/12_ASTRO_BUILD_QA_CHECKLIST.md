# ASTRO BUILD AND QA CHECKLIST

After implementing changes, run QA.

## Technical QA
- run build
- ensure no Astro import issues
- ensure no broken public asset paths
- ensure layouts render key pages
- ensure dynamic routes still build
- ensure no broken `getStaticPaths` assumptions
- ensure no broken image/logo references

## Brand QA
- old brand removed where intended
- PupWiki consistent
- metadata updated
- schema updated
- favicon/site identity updated

## UX QA
- header/footer look good
- homepage improved
- key templates consistent
- mobile layout stable
- no clutter or credibility regressions

## SEO QA
- titles/descriptions updated
- canonical logic reviewed
- sitemap references reviewed
- social previews reviewed
