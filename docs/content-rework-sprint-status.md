# PupWiki Content Rework — Sprint Status

| Sprint | Status | Notes |
|--------|--------|-------|
| Sprint 1–5 | ✅ Complete | Config, design system, nav/header/footer, homepage pre-dog sections, Chewy/Amazon flag guards |
| AWIN Sprint | ✅ Complete | sync-awin.mjs pipeline, AwinProductSlot, PageBannerSlot, affiliate-banners.json registry |
| Sprint 6 | ✅ Complete | 50-state + age-bucket insurance calculator, StateAgeSelector component, cost-calculator/[breed] |
| Sprint 7 | ✅ Complete | Enhanced breed filtering (coat, AKC group, lifespan, origin) + URL param shareability |
| Sprint 8 | ✅ Complete | Cross-dataset navigation — health cost panel, pre-dog CTA block, first-dog hub, breed strip on categories |
| Sprint 9 | ✅ Complete | Pupwiki merge + AWIN pipeline (creatives, pagination, pending programmes) + Amazon removed from cost-calc/dog-names/brands + AwinProductSlot on all missing templates + BreadcrumbList JSON-LD on BlogLayout/categories/dog-names/brands/how-we-test/about + token enforcement |
| Sprint 10 | ✅ Complete | BreadcrumbList on contact/blog/dog-names-index; brands/index.astro fixed (was cost-calc duplicate); enriched inspiration section on dog-names/[breed]; about.astro AWIN disclosure; PageBannerSlot on cost-calculator; blog/index category filter chips; FAQPage JSON-LD on all 277 breed pages; config.ts content schema fields; claim safety audit script |

## Architecture Status

| Component | Status |
|-----------|--------|
| `/blog` editorial filter | ✅ `shouldShowInBlog()` respects `indexInBlog` field; falls back to heuristic |
| Blog content schema | ✅ `contentTier`, `indexInBlog`, `generated`, `claimSensitivity`, `monetizationIntent` added as optional |
| Claim safety audit | ✅ `scripts/content/audit-claims.mjs` — read-only, run with `node scripts/content/audit-claims.mjs` |
| FAQPage JSON-LD | ✅ All breed pages (277 breeds + crossbreeds) |
| BreadcrumbList JSON-LD | ✅ All major templates covered |
| AWIN slots | ✅ Breed pages, blog, categories, cost-calculator, dog-names, brands |
| Amazon CTAs | ✅ Removed from all page templates; shared components flag-guarded |

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| `/blog` shows curated editorial only | ✅ heuristic + `indexInBlog` field |
| Generated posts hidden from blog index | ✅ |
| Generated content enriches breed/tool pages | 🔜 Enrichment layer (Sprint 3 content rework pack) |
| Unsafe claims blocked | ✅ Audit script; manual review required |
| Blog layout has no fake newsletter form | ✅ Removed in earlier sprint |
| Affiliate/leadgen offers match page intent | ✅ AwinProductSlot + CAT_AWIN_TAGS mapping |
| Build passes | ✅ |
