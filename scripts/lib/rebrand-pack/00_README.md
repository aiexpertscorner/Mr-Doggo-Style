# PupWiki Rebrand Prompt Pack v4 — Repo-Specific Astro Pack

This is a more **repo-specific** Claude Code pack intended for a site that appears to be built in **Astro** and currently branded as **MrDoggoStyle.com**, with major route families such as:

- `/`
- `/blog/*`
- `/breeds/*`
- `/dog-names/*`
- `/cost-calculator/*`
- `/categories/*`
- `/about`
- `/disclosure`

This pack is optimized for Claude Code working **directly in the current repository**.

## What makes v4 different
This version is more opinionated and more execution-aware.

It assumes Claude is likely working in an Astro codebase and should:
- inspect actual Astro structure first
- identify layout/template entry points
- centralize brand logic where possible
- improve the site by page-type
- preserve routes unless there is a strong reason not to
- improve hub clarity, taxonomy, internal linking, and trust signals

## Core route model likely present
Use the current repo to verify these route families:
- homepage
- breed hub and breed detail pages
- dog name hub and name detail pages
- cost calculator hub/detail pages
- category pages
- blog/article pages
- trust/support pages

## Working philosophy
Claude should optimize for:
- minimal churn
- high leverage
- shared-template changes
- strong SEO hygiene
- clean Astro-friendly implementation
- improved relevance for both future and current dog owners

## Suggested use
Start with:
1. `01_MASTER_REPO_SPECIFIC_PROMPT.md`
2. `02_ASTRO_REPO_AUDIT_PLAYBOOK.md`
3. `03_ASTRO_REBRAND_EXECUTION_MAP.md`

Then move into the specific packs.
