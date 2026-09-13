# Reference-layer refresh process

These assets go stale. Refresh the **content**, not the URL, unless a genuine intent split appears.

## Citation hub (`/transcription-statistics`)

Cadence: quarterly, plus immediately after a major primary source revision (WHO fact sheet, Edison Infinite Dial, Pew platform fact sheet, Ofcom access-services report, NIDCD quick stats).

1. **Source-link verification**  
   Run `npm run seo:validate-citation-hub`. Failed HTTP fetches are reported as unverified — they do not prove a number is wrong, but they block a silent pass.

2. **Statistic freshness**  
   For each retained record, check whether the issuing organization published a newer equivalent. Prefer the newer figure when it measures the same population and definition.

3. **Replace, do not stack**  
   If WHO updates “1.5 billion” to a new official figure, replace the record and keep the same `id` when the claim is the same fact. Add a short methodology note that the previous edition was superseded.

4. **Page year in the H1/title**  
   Change “2026” only when the page was genuinely re-verified in that calendar year. Do not mint `/transcription-statistics-2027/` duplicates.

5. **Preserve the URL**  
   `/transcription-statistics` is the durable citation target. Section anchors may be added; do not create year-folder copies.

6. **Do not average incompatible studies**  
   Hearing-loss prevalence from WHO (global, clinical) and NIDCD (US, self-report) stay in separate cards.

7. **First-party data stays out**  
   New VideoText benchmark numbers go to `/research/transcription-accuracy-benchmark-2026` or a future published benchmark — not silently into this hub.

8. **Update `verifiedAt` and the visible last-updated date** together.

## Glossary

Cadence: quarterly for published terms; add new terms from the inventory when they clear the quality bar.

1. Re-check `sources[]` URLs.
2. Update definitions when a standard changes (WCAG, WebVTT, TTML, Netflix TTSC, FCC rules).
3. Add terminology only when the entity is real (standard, documented practice, or a term users need for VideoText workflows).
4. Expand in-body internal links when neighboring terms are published.
5. Consolidate if two published slugs start targeting the same query — keep one URL, 301 only if the retired slug was indexed.
6. Never publish inventory rows with `status=draft`.

## Yearly editorial pass

- Re-run candidate discovery (new government reports, new Infinite Dial, new Whisper-class papers).
- Recalculate retained count and update the H1 number to match.
- Re-score the next 20 glossary terms for publication.
- Confirm commercial pages still own transactional intent.

## Ownership

VideoText editorial team (Organization). No invented individual expert is required to refresh the pages.
