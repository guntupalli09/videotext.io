# Missing Prerender Root Causes

Generated: 2026-05-15

## Summary

The affected URLs were not missing because SSR crashed. They were missing because route inventories were inconsistent: React routes, hub links, sitemap/indexable route sources, and prerender route metadata did not share one complete inventory. Several URLs appeared in hub/prerender-discoverability link lists, so the audit treated them as routes that needed local HTML, but the build/prerender inventory did not generate files for those exact paths.

## Per-route findings

| Route | Exists in React Router | Reachable | Registered for prerender before fix | Path mismatch / alias issue | SSR failure? | Root cause |
| --- | --- | --- | --- | --- | --- | --- |
| `/accuracy-test` | Yes | Yes | No | No | No evidence of SSR failure | Manual React + SEO metadata route was omitted from `CORE_PATHS` / indexable sitemap inventory, so `mergeRouteMetaWithSitemapCoverage()` did not add it to prerender output. |
| `/ai-transcription-tools` | Yes | Yes | No | No | No evidence of SSR failure | Manual React + SEO metadata route existed, but only appeared in hub links / React Router, not the indexable route inventory used by prerender. |
| `/ai-transcription-workflow` | Yes | Yes | No | No | No evidence of SSR failure | Manual React + SEO metadata route existed, but was absent from sitemap/indexable route inventory and therefore absent from generated `/dist` HTML. |
| `/fastest-transcription-software` | Yes | Yes | No | No | No evidence of SSR failure | Manual React + SEO metadata route existed, but was omitted from `CORE_PATHS`; hub links exposed it to audits without prerender output. |
| `/free-captions-and-subtitles` | No before fix | Linked from subtitle hub | No | Yes: hub linked a bare marketing slug with no route / SEO metadata | No SSR entry existed | Hub/prerender link inventory referenced the slug, but React Router, SEO metadata, sitemap inventory, and prerender generation did not register the page. |
| `/google-meet-transcription` | SEO-intent route via registry-driven SEO route | Yes through `SeoToolPage` once generated | No | No | No evidence of SSR failure | Programmatic generator expected this URL in sibling lists, but `google meet` was missing from `transcriptionTargets`, so no programmatic SEO entry or prerender file was generated. |
| `/subtitle-character-checker` | No before fix | Linked from subtitle hub | No | Yes: actual utility route was `/tools/subtitle-character-checker` | No SSR entry existed for bare slug | Hub links and audit discovered the bare slug, but only the `/tools/...` path had a React route and SEO metadata. |
| `/subtitle-reading-speed` | No before fix | Linked from subtitle hub | No | Yes: actual utility route was `/tools/subtitle-reading-speed` | No SSR entry existed for bare slug | Hub links and audit discovered the bare slug, but only the `/tools/...` path had a React route and SEO metadata. |
| `/subtitle-validator` | No before fix | Linked from subtitle hub | No | Yes: actual utility route was `/tools/subtitle-validator` | No SSR entry existed for bare slug | Hub links and audit discovered the bare slug, but only the `/tools/...` path had a React route and SEO metadata. |
| `/subtitle-word-counter` | No before fix | Linked from subtitle hub | No | Yes: actual utility route was `/tools/subtitle-word-counter` | No SSR entry existed for bare slug | Hub links and audit discovered the bare slug, but only the `/tools/...` path had a React route and SEO metadata. |
| `/teams-meeting-transcription` | SEO-intent route via registry-driven SEO route | Yes through `SeoToolPage` once generated | No | No | No evidence of SSR failure | Programmatic generator expected this URL in sibling lists, but `teams meeting` was missing from `transcriptionTargets`, so no programmatic SEO entry or prerender file was generated. |
| `/transcription-benchmark` | Yes | Yes | No | No | No evidence of SSR failure | Manual React + SEO metadata route was omitted from `CORE_PATHS` / indexable sitemap inventory, so prerender did not write `/dist/transcription-benchmark/index.html`. |
| `/translation` | Yes | Yes | No | Alias of `/translate-subtitles`, but no independent sitemap/prerender metadata | No evidence of SSR failure | React Router served the alias, but sitemap/prerender inventory only covered `/translate-subtitles`, so `/dist/translation/index.html` was not written. |
| `/voice-recorder` | Yes | Yes | Not effectively audited/generated as indexable | No | No evidence of SSR failure | The route was treated inconsistently: it appeared in product navigation and programmatic skip lists, but `content-audit` explicitly excluded it as non-indexable and core route inventory did not include it for prerender coverage. |

## Cross-cutting causes resolved

1. **Inventory gap:** `scripts/seo/registry.ts` did not include several public manual pages and aliases in the indexable route set used by sitemap generation and prerender coverage.
2. **Programmatic target gap:** `client/src/data/seoPages.ts` did not include `google meet` or `teams meeting`, even though those pages were referenced as sibling URLs.
3. **Bare utility slug mismatch:** Subtitle utility hub links used bare slugs while React Router and metadata only registered `/tools/...` URLs.
4. **Audit exclusion mismatch:** `/voice-recorder` was excluded from the local content audit even though it is public and linked as a product route.
5. **Pipeline hardening gap:** The build pipeline did not fail when indexable URLs were missing local HTML or when generated files contained only an SPA shell.
