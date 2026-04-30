# ASTRO REPO AUDIT PLAYBOOK

Start by auditing the current Astro repo.

## Step 1 — Confirm actual structure
Inspect the repository for likely Astro surfaces such as:
- `astro.config.*`
- `package.json`
- `src/pages/**`
- `src/layouts/**`
- `src/components/**`
- `src/content/**`
- `src/data/**`
- `src/lib/**`
- `src/utils/**`
- `public/**`
- sitemap/robots/meta helpers
- content collections
- MD/MDX sources
- route generators or dynamic `[slug]` routes

## Step 2 — Find brand surfaces
Search for:
- `MrDoggoStyle`
- `mrdoggostyle`
- old domain references
- old site title / description strings
- old organization/publisher strings
- old logo / favicon references
- old social preview assets
- old schema references
- old disclosure/about copy
- old navigation labels

## Step 3 — Find page-type entry points
Identify actual implementation paths for:
- homepage
- blog template(s)
- breed template(s)
- dog names template(s)
- cost calculator template(s)
- category template(s)
- about/disclosure/support pages
- header/footer/navigation components
- SEO/meta component(s)
- schema helpers
- related-content logic
- internal-link blocks

## Step 4 — Find configuration opportunities
Look for places where brand strings and layout logic can be centralized, such as:
- `site.ts`
- `config.ts`
- `consts.ts`
- SEO helper files
- nav/footer data files
- shared layout props
- content collection schemas

## Required output
Return:
1. actual Astro architecture summary
2. page-type inventory with file paths
3. brand touchpoints inventory
4. best centralization opportunities
5. SEO/schema entry points
6. internal-linking entry points
7. highest-leverage implementation sequence
8. risky areas requiring caution
