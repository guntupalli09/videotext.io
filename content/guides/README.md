# Ryze-sourced guides

90 articles imported from `videotext.byryze.com` (Ryze-hosted) on 2026-09-18.

## Why they moved

Every article self-canonicalled to `videotext.byryze.com`, so Google credited
**byryze.com** with the rankings and topical authority. videotext.io received only
two outbound links per article. These are the source copies, to be served from
`videotext.io/guides/*` so the authority lands on our own domain.

## What was corrected during import

- **Truncated slugs** — 61 of 90 were cut mid-slug upstream
  (`/best-live-transcription-software-in` → `best-live-transcription-software-in-2026`).
  Slugs are re-derived from each article's H1.
- **Internal cross-links** — 404 links pointed back at `videotext.byryze.com`
  with the old truncated slugs; all rewritten to `videotext.io/guides/<slug>`.
- **Missing meta descriptions** — none survived extraction; backfilled from
  `og:description`, falling back to the first substantive paragraph.
- **One broken upstream link** — `/best-best-speaker-diarization-software-in`
  (doubled prefix, 404 on Ryze's own site) repointed at the correct guide.

## Files

- `<slug>.md` — article with frontmatter; `source_path` records the original Ryze path.
- `_redirect-map.json` — old path → new path, with title and word count.
- `_byryze-301-map.csv` — the same as a 301 table to hand to Ryze.

Regenerate with `scripts/blog/import-ryze-articles.py <outdir> <urls-file>`.

## Still outstanding

1. **Ryze must 301** every `videotext.byryze.com` URL to its `videotext.io/guides/`
   equivalent (`_byryze-301-map.csv`). Until then both copies are indexable and
   compete for the same keywords.
2. These articles are **not yet routed or rendered** — `/guides/*` needs a route,
   prerendering, and sitemap entries before the redirects are switched on.
