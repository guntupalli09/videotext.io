# Videotext SEO Automation Operating System

## Goal
Build a repeatable SEO machine that improves:
- non-brand impressions,
- top-10 keyword count,
- CTR,
- signups from SEO landing pages.

This document defines the **fully automated loop** and the human checkpoints.

---

## Automation architecture

### 1) Weekly opportunity discovery (already running)
- Workflow: `.github/workflows/seo-weekly.yml`
- Script: `npm run seo:weekly`
- Output:
  - `scripts/seo/output/seo-proposals.json`
  - `scripts/seo/output/changelog.md`

What it does:
- Collects demand signals from configured collectors.
- Runs decision engine.
- Produces new page/update proposals.

### 2) KPI monitor from GSC exports (new)
- Script chain:
  - `npm run seo:fetch` (Search Console API fetch)
  - `npm run seo:kpi` (KPI action generation)
- Input (default):
  - `scripts/seo/data/gsc-latest.json`
- Output:
  - `scripts/seo/output/seo-kpi-actions.json`
  - `scripts/seo/output/seo-kpi-report.md`

What it does automatically:
- Detects page-2 quick wins.
- Detects high-impression + low-CTR queries.
- Detects pages with impressions but no clicks.
- Flags canonical split risk (`www` vs non-`www`).
- Emits prioritized actions (`P0/P1/P2`) for execution.

### 3) Auto-PR generation
In weekly workflow:
- Apply allowed proposals to registry (`seo:apply-proposals`).
- Sync routes, validate registry, regenerate sitemap.
- Open PR for review.

### 4) Continuous verification
- `npm run seo:verify`
- `npm run seo:validate-registry`
- `npm run seo:validate-sitemap`

These guardrails prevent broken SEO output from shipping.

---

## Ranking system: execution policy

### P0 (execute this sprint)
- Queries ranked 10–20 with meaningful impressions.
- Queries with high impressions and CTR < 2.5% while ranking <= 15.
- Technical canonical/indexation issues.

### P1 (next sprint)
- Pages with impressions but 0 clicks.
- Internal-linking gaps to money pages.

### P2 (backlog)
- Low-impression experiments.
- Broad TOFU pages with weak conversion path.

---

## High-intent page operating template (required)
For any page expected to rank and convert, include:
1. Proof layer (specific outcomes, speed, structure claims).
2. Step-by-step workflow.
3. Output examples (what user gets).
4. Comparison section.
5. Use-case segmentation.
6. CTA in multiple placements.

This is already implemented for:
- `/youtube-url-to-transcription`
- `/podcast-transcription-tool`

---

## KPI targets (90-day)
- Increase non-brand impressions by 3x.
- Double keywords in positions 4–15.
- Lift average CTR on priority pages to 4%+.
- Lift SEO landing-page signup conversion by 30%+.

---

## Weekly runbook (operator)
1. Trigger workflow (`SEO Weekly`) or run locally:
   - `npm run seo:weekly`
   - `npm run seo:kpi`
2. Review generated actions (`seo-kpi-report.md`).
3. Approve/adjust proposal PR.
4. Merge and request indexing for newly shipped P0 pages.
5. Next week: compare movement on P0 targets only.

---

## Why this is “full automation” (with control)
- Discovery, prioritization, proposal generation, registry edits, route sync, sitemap generation, and PR creation are automated.
- KPI diagnostics for impressions/CTR/rank are automated weekly.
- Human approval remains at merge point to avoid low-quality or cannibalizing pages.

This gives speed without losing content quality control.
