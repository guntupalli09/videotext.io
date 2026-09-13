# Reference-layer measurement

Prepared: 2026-09-13  
Baselines: **awaiting data**. No GSC, Ahrefs, or analytics numbers are invented for the new URLs.

The repository contains older GSC exports (root CSVs, `videoptext gsc 05-06-26/`, `docs/Performance-extracted/`, `reports/gsc-predeploy-*.csv`). Those describe **other** URLs. They are not launch baselines for `/transcription-statistics` or `/glossary/*`.

## Citation hub (`/transcription-statistics`)

Establish at launch (week 0) and review monthly.

| Metric | How to collect | Launch baseline |
|---|---|---|
| Indexed status | GSC URL Inspection + Coverage | awaiting data |
| Impressions | GSC Performance, page = hub URL | awaiting data |
| Clicks | GSC Performance | awaiting data |
| Average position | GSC Performance | awaiting data |
| Queries containing statistics / stats / data / percent / percentage / how many | GSC query filter | awaiting data |
| Referring domains to the hub | Ahrefs / GSC Links (if available) | awaiting data |
| New backlinks to the hub | Ahrefs / GSC Links | awaiting data |
| Links to specific sections | Only if fragment/UTM tracking is later added | not tracked at launch |
| AI / search citations | Manual spot-checks in ChatGPT/Perplexity/Google AI Overviews when reliably observable | awaiting data |

Do not treat HTTP 200 or sitemap inclusion as a ranking result.

## Glossary

| Metric | How to collect | Launch baseline |
|---|---|---|
| Indexed glossary URLs | GSC Coverage filtered to `/glossary` | awaiting data |
| Impressions per URL | GSC Performance, page filter | awaiting data |
| Total glossary impressions | Sum of `/glossary*` | awaiting data |
| Total glossary clicks | Sum of `/glossary*` | awaiting data |
| Average position | GSC | awaiting data |
| Number of ranking queries | GSC query count per URL | awaiting data |
| Pages in top 20 / top 10 | GSC position buckets | awaiting data |
| Internal-link coverage | `scripts/seo/validate-reference-layer.ts` + discoverability crawl | computed at build |
| Orphan count | `seo:validate-discoverability` | must be 0 for published URLs |
| Impressions by cluster | Join GSC pages to `docs/seo/glossary-inventory.csv` cluster column | awaiting data |

## Shared operational checks (not traffic claims)

- Citation-hub validator exit code
- Reference-layer validator exit code
- Sitemap contains every published URL and no unpublished glossary slug
- Prerender HTML contains H1 + statistic/definition text without JS
- Source URL availability report (separate from “number is correct”)

## What not to report

- Projected clicks, rankings, or referring domains
- “Expected to rank” language
- Combined/averaged statistics from incompatible studies as if they were one KPI
