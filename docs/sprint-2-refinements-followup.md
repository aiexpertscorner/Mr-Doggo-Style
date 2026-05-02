# Sprint 2 Refinements — Commerce, Inventory, Internal Linking & Generated Content

## Branch

`sprint2-refinements`

Base: latest `Pupwiki` at branch creation.

## Purpose

Continue the previous Sprint 2 plan from the latest production branch, without carrying older divergent branches forward.

This sprint focuses on:

- fixing build/deploy ordering for data freshness;
- improving generated-content metadata for cluster-aware commerce;
- replacing local article commerce markup with reusable components;
- increasing internal linking to puppy, senior dog and insurance hubs;
- making AWIN/Amazon modules easier to render across generated content.

## Changes

### 1. Build order fixed

`package.json` now runs Amazon sync before content inventory:

```txt
images:hero:ci
content:refresh
images:content:ci
awin:sync:ci
partners:generate
amazon:sync
content:inventory
images:enrich:ci
sitemap:generate
```

Reason: `content:inventory` uses Amazon summary data, so it should read fresh Amazon output.

### 2. Deploy order fixed

The Cloudflare deploy workflow now follows the same logic:

```txt
hero images
content refresh
content images
AWIN sync + audit
partner profiles
Amazon sync
content inventory
breed galleries
sitemap
build
Amazon audit
```

### 3. Blog article route cleaned

`src/pages/blog/[slug].astro` now:

- uses `ArticleCommerceSuite.astro` instead of rebuilding the commerce grid locally;
- removes the large scoped inline style block;
- reads cluster metadata through `getContentCluster`;
- expands AWIN/Amazon topic tags with cluster tags;
- adds puppy, senior dogs and insurance internal links to breed-support posts;
- adds a cluster hub card to the “Continue with PupWiki tools” grid where possible.

### 4. Generated post metadata enriched

`refresh-generated-posts.mjs` now writes:

```yaml
cluster: "dog-food"
productFamilies: ["food", "dog-food"]
awinTopicTags: [...]
amazonQueries: [...]
internalLinkTargets: [...]
indexInBlog: false
```

This helps generated posts support richer modules without bloating markdown content.

### 5. Refresh note improved

Generated posts now explain that the template can add:

- AWIN partner modules;
- validated Amazon.com links;
- fallback Amazon.com search cards;
- internal-link modules.

## Next recommended sprint

### Sprint 2F — First rich PSEO generator layer

Build a dedicated generator that creates missing pages from `pseo-opportunity-backlog.json`, starting with:

1. puppy essentials pages;
2. senior dog care pages;
3. pet insurance planning pages;
4. high-priority breed x food/beds/training pages where gaps remain.

Suggested new script:

```txt
scripts/content/generate-pseo-opportunity-pages.mjs
```

Outputs should be generated markdown with strong frontmatter, but body copy should stay conservative and template-driven.

## Local validation

```bash
npm run content:refresh
npm run amazon:sync
npm run content:inventory
npm run sitemap:generate
npm run build
```

Review:

- `/blog/best-food-for-labrador-retriever`
- `/blog/best-bed-for-french-bulldog`
- `/categories/puppy`
- `/categories/senior-dogs`
- `/categories/insurance`
- `/categories/pupwiki-partners`
