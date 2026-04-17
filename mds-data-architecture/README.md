# MrDoggoStyle — Data Architecture

Single source of truth for all PSEO content generation.

---

## File structure

```
src/data/
├── master-breeds.json          ← 277 breeds, merged from all datasets
├── products.json               ← 125 products, 10 categories
├── product-index.json          ← Flat product lookup: id → full object
├── cluster-definitions.json    ← 10 PSEO page type definitions
├── content-status.json         ← Tracks what pages have been generated
├── breed-link-map.json         ← Internal URLs per breed × page type
├── dog-names.json              ← 7,267 curated dog names
├── breed-name-map.json         ← Breed → name style mapping
├── fci_taxonomy.json           ← FCI classification (364 breeds)
├── category-taxonomy.json      ← AKC/FCI group → content angle mapping
│
│   (copy these from your uploads:)
├── dogs-ranking-dataset.csv    ← 87 breeds with intelligence/cost data
└── dog-breeds-by-country-2025.csv  ← 49 countries with breed counts

scripts/
├── enrich-breeds.mjs           ← Enrichment pipeline
└── data-audit.mjs              ← Full data readiness audit
```

---

## Installation

```bash
robocopy src\data  E:\2026_Github\Mr-Doggo-Style\src\data /Y /XF breeds.json
robocopy scripts   E:\2026_Github\Mr-Doggo-Style\scripts  /Y

# Do NOT overwrite breeds.json — it's the existing AKC data
# master-breeds.json is the merged version you use going forward
```

---

## master-breeds.json schema

Every breed record contains:

```json
{
  "slug":             "labrador-retriever",
  "name":             "Labrador Retriever",
  "description":      "...",
  "temperament":      "Friendly, Active, Outgoing",
  "size_category":    "large",
  "height":           { "min_in": 21.5, "max_in": 24.5 },
  "weight":           { "min_lbs": 55, "max_lbs": 80 },
  "life_expectancy":  { "min": 10, "max": 12 },
  "akc_group":        "Sporting Group",
  "akc_popularity":   1,
  "fci_group":        8,
  "fci_group_name":   "Retrievers, Flushing Dogs and Water Dogs",
  "fci_section":      "Retrievers",
  "fci_status":       "recognized",
  "coat_type":        "short",
  "energy_level":     "active",
  "training_level":   "easy",
  "shedding_level":   "heavy",
  "traits": {
    "energy_value":       1.0,
    "shedding_value":     0.8,
    "grooming_value":     0.4,
    "trainability_value": 1.0,
    "demeanor_value":     1.0
  },
  "name_styles":      ["Classic", "Trendy"],
  "name_inspirations":["Classic Pet", "Nature"],
  "product_picks": {
    "dog-food":   "purina-pro-plan-large-breed",
    "toys":       "chuckit-ultra-ball",
    "beds":       "big-barker-orthopedic",
    "grooming":   "furminator-deshedding",
    "training":   "ruffwear-front-range",
    "supplements":"nutramax-cosequin",
    "health":     "embark-dna-test",
    "smart-tech": "fi-series-4-gps",
    "travel":     "ruffwear-travel-bowl",
    "lifestyle":  "earth-rated-poop-bags"
  },
  "content": {
    "hub_page":        true,
    "food_post":       false,
    "toy_post":        false,
    "bed_post":        false,
    "grooming_post":   false,
    "training_post":   false,
    "supplement_post": false,
    "names_page":      false,
    "health_post":     false,
    "cost_calculator": false
  },
  "seo": {
    "title":       "Best Products for Labrador Retrievers 2026",
    "description": "Complete Labrador Retriever care guide..."
  },
  "enrichment": {
    "has_fci_data":      true,
    "has_ranking_data":  false,
    "has_country_data":  false,
    "image_verified":    false
  }
}
```

---

## PSEO page potential

| Page type       | URL pattern                        | Priority | Count |
|-----------------|-------------------------------------|----------|-------|
| hub             | /breeds/[slug]                     | P1       | 277   |
| food_post       | /blog/best-food-for-[slug]         | P1       | 277   |
| toy_post        | /blog/best-toys-for-[slug]         | P1       | 277   |
| names_page      | /dog-names/[slug]                  | P1       | 277   |
| bed_post        | /blog/best-bed-for-[slug]          | P2       | 277   |
| grooming_post   | /blog/best-grooming-for-[slug]     | P2       | 277   |
| health_post     | /blog/[slug]-health-problems       | P2       | 277   |
| training_post   | /blog/training-a-[slug]            | P3       | 277   |
| supplement_post | /blog/best-supplements-for-[slug]  | P3       | 277   |
| cost_calculator | /breeds/[slug]/cost                | P3       | 277   |
| **TOTAL**       |                                    |          | **2,770** |

---

## Content engine commands (once generate-content.mjs is updated)

```bash
# Check readiness before generating
node scripts/data-audit.mjs

# Enrich with CSV data (copy CSVs to src/data/ first)
node scripts/enrich-breeds.mjs --step ranking
node scripts/enrich-breeds.mjs --step country

# Generate content batches
node generate-content.mjs --type food  --top50        # P1: top 50 breeds × food
node generate-content.mjs --type toys  --top50        # P1: top 50 breeds × toys
node generate-content.mjs --type names --all           # P1: all 277 name pages
node generate-content.mjs --type beds  --top100       # P2: top 100 breeds × beds
```

---

## Next steps after installing

1. **Run audit:** `node scripts/data-audit.mjs` → check readiness score
2. **Copy CSVs:** `dogs-ranking-dataset.csv` + `dog-breeds-by-country-2025.csv` → `src/data/`
3. **Run enrichment:** `node scripts/enrich-breeds.mjs` → adds ranking + country data
4. **Update generate-content.mjs** to read from `master-breeds.json` instead of `breeds.json`
5. **Run first batch:** `node generate-content.mjs --type food --top50`
