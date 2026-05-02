# Sprint 2 — Mapping Dataset Audit & PSEO Cluster Upgrade Plan

## Current goal
Build PupWiki into a scalable rich-content and monetization system, not only a blog. The priority is a structured PSEO engine that can generate and interlink high-intent content around:

- lifecycle clusters: puppy, senior dogs, adult dog care;
- product clusters: dog food, toys, beds, grooming, supplements, training, travel, smart tech;
- service clusters: insurance, vet planning, cost planning;
- breed-specific subclusters: breed x food, breed x toys, breed x beds, breed x grooming, breed x supplements, breed x training, breed x health;
- monetization layers: AWIN partners, Amazon.com search deeplinks, validated SiteStripe product links, future insurance/service partners.

---

## Audit summary

### 1. Category hub config is strong, but too category-only
`src/lib/categories/categoryConfig.ts` already defines commercial category hubs and their SEO copy, AWIN tags, related links and preferred breeds.

Current category hubs:

- dog-food
- toys
- health
- training
- grooming
- beds
- supplements
- smart-tech
- travel
- lifestyle

Strengths:

- Good separation from `src/pages/categories/[category].astro`.
- Has SEO titles/descriptions per category.
- Has AWIN tag sets and related category cards.
- Has breed-guide mapping through `CATEGORY_TO_LINK_KEY`.

Gaps:

- Missing lifecycle hubs: `puppy`, `senior-dogs`, likely `adult-dogs` later.
- Missing service hubs: `insurance`, `vet-care`, possibly `dog-costs`.
- Category intent is not yet normalized to one central cluster model.
- Amazon query mapping lives separately from category mapping.
- Health/supplement categories are commercial but need stronger safety constraints.

Recommendation:

Create a central `contentClusterConfig.ts` / `intentGraph.ts` that owns lifecycle/product/service cluster metadata and lets categoryConfig become a thin view of that graph.

---

### 2. Category route is clean and reusable
`src/pages/categories/[category].astro` is already short and componentized. It uses:

- `CategoryHero`
- `CategoryQuickNav`
- `CategoryPartnerBlock`
- `CategoryAmazonBlock`
- `CategoryBreedGuides`
- `CategoryOwnerResources`
- `CategoryArticleGrid`
- `CategoryRelatedTopics`
- `CategoryEmptyState`

Strengths:

- Good base route for future generated hubs.
- Category helper functions keep route logic under control.
- Structured data is already generated for collection pages and ItemLists.

Gaps:

- Static paths are hardcoded in the route.
- New clusters must be added in several places.
- Category route should use `CATEGORY_SLUGS` directly.
- Lifecycle pages may need different sections than product pages.

Recommendation:

Convert category route to read all route paths from a unified cluster registry, then render page variants by `cluster.type`:

- `product` layout for food/toys/beds/grooming/training/travel;
- `lifecycle` layout for puppy/senior-dogs;
- `service` layout for insurance/cost/vet-care;
- `sensitive` modifier for health/supplements.

---

### 3. Breed content status is extensive but binary
`src/data/content-status.json` maps many breeds to booleans such as:

- food_post
- toy_post
- bed_post
- grooming_post
- training_post
- supplement_post
- health_post
- names_page
- hub
- cost_calculator

Strengths:

- Good coverage for many breeds.
- Enables category hubs to show only existing generated pages.
- Supports internal linking from breed pages and blog posts.

Gaps:

- Boolean-only status cannot prioritize quality, freshness, monetization readiness or indexability.
- `cost_calculator` is mostly false, but calculators can be route-driven rather than generated file-driven.
- No lifecycle coverage: puppy/senior/adult variants are absent.
- No content quality state: draft, thin, needs refresh, good, money-ready.

Recommendation:

Replace or supplement with `content-inventory.json` records:

```json
{
  "slug": "labrador-retriever",
  "type": "breed",
  "pages": {
    "food": { "exists": true, "quality": "refresh", "monetization": "medium", "lastUpdated": "2026-05-01" },
    "puppy": { "exists": false, "priority": 94 },
    "senior-dogs": { "exists": false, "priority": 88 }
  }
}
```

This lets scripts decide what to generate next.

---

### 4. PSEO copy engine is powerful but family-limited
`scripts/lib/pseo-copy-engine.mjs` currently supports these families:

- food
- toys
- beds
- grooming
- supplements
- health
- training

Strengths:

- Many title templates per family.
- Uses breed facets: size, energy, coat, training, health.
- Adds sensitivity, monetization intent, content tier, review method and medical disclaimer.
- Good foundation for mass-refreshing generated support posts.

Gaps:

- Missing lifecycle families: puppy, senior-dogs.
- Missing service families: insurance, cost, vet-care.
- No Amazon query bundle emitted per generated post.
- No AWIN topic tag bundle emitted per generated post.
- No article outline variants per page intent.
- Current `refresh-generated-posts` only refreshes existing files; it does not create a prioritized backlog or generate new cluster pages.

Recommendation:

Split into:

1. `pseo-family-config.mjs` — templates and sensitivity rules.
2. `pseo-intent-engine.mjs` — breed + cluster + audience → page plan.
3. `generate-pseo-content.mjs` — creates missing markdown files from a backlog.
4. `refresh-generated-posts.mjs` — only refreshes existing posts.
5. `audit-pseo-inventory.mjs` — reports missing/low-quality pages.

Each generated post should include frontmatter:

```yaml
cluster: "puppy"
clusterType: "lifecycle"
productFamilies: ["crate", "training", "cleanup", "toys"]
amazonQueries: ["puppy starter kit", "puppy crate training essentials"]
awinTopicTags: ["puppy", "training", "food", "insurance"]
contentTier: "money"
monetizationIntent: "high"
claimSensitivity: "medium"
```

---

### 5. Amazon product dataset is useful but too manually constrained
`src/data/amazon-products-summary.json` shows:

- 90 total rows
- 32 enabled products
- 32 enabled with affiliate URL
- 32 live eligible
- 12 category groups
- no missing links

Current category groups:

- beds_comfort
- cleanup_odor
- crates_gates_home
- food_bowls_feeding
- grooming_shedding
- health_adjacent
- puppy_starter
- tech_tracking
- toys_enrichment
- travel_safety
- treats_training
- walking_harness_leash

Strengths:

- Good early seed taxonomy.
- Compliance risk exists.
- Target page slugs and topic tags exist.
- Live eligibility is calculated.

Gaps:

- The dataset only works when hand-filled SiteStripe URLs exist.
- It does not generate valid Amazon.com fallback search links from `amazonSearchQuery + tag`.
- It does not expose lifecycle intent strongly enough.
- Category groups are good but not mapped to the broader content cluster graph.
- There is a likely config issue: default tag should be `pupwiki-20`, and `ENABLE_AMAZON_BUTTONS` should not be inverted.

Recommendation:

Introduce a two-level Amazon model:

1. Validated products from CSV/SiteStripe/ASIN links, preferred when available.
2. Generated Amazon.com search deeplinks, used as safe fallback per page/cluster.

Generated URL format:

```txt
https://www.amazon.com/s?k=<encoded query>&tag=pupwiki-20
```

Recommended dataset additions:

```json
{
  "id": "puppy-crate-training-essentials",
  "type": "search_deeplink",
  "enabled": true,
  "categoryGroup": "puppy_starter",
  "clusterSlugs": ["puppy", "training"],
  "lifeStages": ["puppy"],
  "amazonSearchQuery": "puppy crate training essentials",
  "topicTags": ["puppy", "crate-training", "home-setup"],
  "targetPageSlugs": ["/categories/puppy", "/blog/[breed]-puppy-training-checklist"],
  "complianceRisk": "low"
}
```

---

### 6. AWIN program config is narrow but high-quality
`src/data/awin-program-config.json` currently contains strong editorial mappings for:

- ChefPaw — food/nutrition/fresh food
- Raw Wild — raw/freeze-dried/sensitive-stomach food
- JugBow — training/collars/leashes/harnesses
- Crown & Paw — gifts/lifestyle/portraits

Strengths:

- Good topic tags.
- Exclusion tags exist.
- Priorities, EPC and conversion rate exist.
- Partner intent is clear.

Gaps:

- Only a handful of programs are configured.
- Lifecycle mapping is missing: puppy/senior dogs.
- Service-style partners are not yet part of the core category graph: insurance, vet, telehealth, DNA, training courses.
- Programs without product feeds need more robust deeplink variants per cluster, not one generic deeplink.

Recommendation:

Add `deeplinkTemplates` per program:

```json
{
  "id": "jugbow",
  "deeplinkTemplates": {
    "training": "...",
    "puppy": "...",
    "walking_harness_leash": "..."
  },
  "clusterSlugs": ["training", "puppy"],
  "productFamilies": ["harness", "leash", "training"]
}
```

---

## Max improvement proposal

### Phase A — Central intent graph
Create:

```txt
src/lib/content/contentClusterConfig.ts
src/lib/content/contentIntentGraph.ts
```

This should define all commercial and editorial clusters once.

Core cluster types:

- lifecycle: puppy, senior-dogs, adult-dogs
- product: dog-food, toys, beds, grooming, supplements, training, travel, smart-tech
- service: insurance, cost-planning, vet-care, dna-tests
- breed: breed hubs and breed support posts

Each cluster should include:

- SEO title/description templates
- primary/secondary keywords
- AWIN topic tags
- Amazon fallback queries
- related clusters
- internal links
- claim sensitivity
- monetization allowed/blocked areas
- recommended page modules

### Phase B — Upgrade category hubs into cluster hubs
Convert `/categories/[category]` into `/categories/[cluster]` powered by the graph.

Add immediate new hubs:

- `/categories/puppy`
- `/categories/senior-dogs`
- `/categories/insurance`

Potential later hubs:

- `/categories/dog-costs`
- `/categories/vet-care`
- `/categories/dog-dna-tests`
- `/categories/home-cleanup`

### Phase C — Amazon.com fallback deeplink engine
Add:

```txt
src/lib/amazon/amazonDeeplink.ts
```

Core functions:

```ts
buildAmazonSearchUrl(query, tag)
getAmazonFallbackSearches(context)
mergeValidatedAndFallbackProducts(validated, fallback)
```

Rules:

- Always use `rel="sponsored noopener"`.
- Prefer validated SiteStripe/ASIN products when available.
- Use search deeplinks when no validated product exists.
- Never show health-adjacent Amazon blocks on medical/emergency/vet-critical pages.
- Mark generated links as `source: amazon-search-template`.

### Phase D — PSEO inventory and backlog generator
Add script:

```txt
scripts/content/audit-content-inventory.mjs
```

Output:

```txt
src/data/content-inventory-summary.json
src/data/pseo-opportunity-backlog.json
```

Backlog scoring:

- search intent/commercial potential
- breed popularity
- product coverage availability
- AWIN partner coverage
- Amazon fallback query availability
- internal-link gap
- safety risk

### Phase E — Generate richer content pages
New generator should create:

1. Lifecycle hubs
   - puppy essentials
   - senior dog care
2. Breed x lifecycle posts
   - Labrador puppy essentials
   - French Bulldog senior dog care
3. Product x lifecycle posts
   - best puppy crates
   - orthopedic beds for senior dogs
4. Breed x product posts
   - existing families, but upgraded with cluster metadata
5. Service pages
   - pet insurance by breed
   - dog cost planning by breed

### Phase F — Design and layout integration
After content model is stable:

- refactor article and blog layouts fully;
- add `ClusterHubHero`, `ClusterCommerceSuite`, `ClusterArticleGrid`, `ClusterProductQueryGrid`;
- make category/blog/breed pages consume the same cluster modules;
- avoid duplicating affiliate copy and disclosures.

---

## Recommended immediate implementation order

1. Add `contentClusterConfig.ts` with puppy/senior/insurance and existing product categories.
2. Add `amazonDeeplink.ts` and fix Amazon config fallback tag to `pupwiki-20`.
3. Update `AmazonProductSlot` so it can show fallback search cards when no validated products match.
4. Add `puppy` and `senior-dogs` to category config and static paths.
5. Add content inventory audit script.
6. Generate first high-value content backlog.
7. Only then expand the page generator to create new markdown posts.

---

## Highest-value initial clusters

### Tier 1
- puppy
- senior-dogs
- dog-food
- training
- beds
- insurance

### Tier 2
- grooming
- toys
- travel
- supplements
- health

### Tier 3
- smart-tech
- lifestyle
- home-cleanup
- DNA tests

---

## Compliance notes

- Health, supplements, senior mobility and insurance pages must avoid medical claims.
- Use wording like “options to compare”, “questions to ask your vet”, “owner planning”, not “best treatment”.
- Amazon fallback search links should be clearly disclosed and marked sponsored.
- Product availability/prices should not be hardcoded.
- Search deeplinks are safer than fake product cards when API access is unavailable.
