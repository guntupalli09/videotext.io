# VIDEOTEXT SEO BASELINE — 2026-08-31

Compiled from Ahrefs PDF/CSV evidence actually inspected in this session. Every figure below is tagged:
**[VERIFIED]** = read directly from an attached PDF/CSV page I opened myself.
**[UNVERIFIED]** = appeared only in the user's narrative brief; no corresponding source PDF was ever attached to this session. Treated as unconfirmed until a source file arrives.

---

## 0. Evidence inventory (what was actually inspected)

### Received and opened (11 PDFs + 3 CSVs, all Ahrefs project `videotext.io`, captured 2026-08-31 ~23:5x UTC unless noted)

| # | Report | Pages | Date range shown | Status |
|---|---|---|---|---|
| 1 | Web Analytics → Channels | 1 | All time | VERIFIED |
| 2 | Web Analytics → Countries | 1 | All time | VERIFIED |
| 3 | Web Analytics → Entry pages | 1 | All time | VERIFIED |
| 4 | Web Analytics → Exit pages | 1 | All time | VERIFIED |
| 5 | Web Analytics → Top pages | 1 | Last 30 days (3 Aug–1 Sep 2026) | VERIFIED |
| 6 | Web Analytics → Sources | 1 | Last 30 days (3 Aug–1 Sep 2026) | VERIFIED |
| 7 | Site Audit → Overview | 1 | Crawl 28 Aug, compared to 21 Aug | VERIFIED |
| 8 | Site Audit → Internal pages | 1 | Crawl 28 Aug | VERIFIED |
| 9 | Site Audit → Indexability | 1 | Crawl 28 Aug | VERIFIED |
| 10 | Site Audit → All Issues | 1 | Crawl 28 Aug, compared to 21 Aug | VERIFIED |
| 11 | Site Explorer → Organic Competitors | 1 | Monthly, US, 1 Sep 2026 | VERIFIED |
| 12 | Site Explorer → Backlinks | 5 | Live, captured 31 Aug | VERIFIED (page 1 of the in-app table only — 50 of 683 rows visible; full row-by-row export not provided) |
| 13 | Site Explorer → Referring domains | 2 (2nd is a blank footer) | Live, captured 31 Aug | VERIFIED (page 1 of 4 in-app pagination — 50 of 168 rows visible) |
| 14 | `docs/Ahrefs- Orphan page (has no incoming internal links).csv` | 499 rows | Crawl ~18 Apr 2026 (older crawl, in repo) | VERIFIED, but **different capture date** — see discrepancy §2 |
| 15 | `docs/Ahrefs- canonical URL has no incoming internal links.csv` | 10 rows | Same Apr crawl | VERIFIED, same caveat |
| 16 | `docs/Ahrefs- Canonical points to redirect.csv` | 1 row | Same Apr crawl | VERIFIED, same caveat |
| 17 | `docs/Ahrefs - Overview - Videotext.pdf` | 1 | **18 Apr 2026** | VERIFIED — superseded by Aug data, kept only as historical baseline |

### Requested but never attached — NOT inspected, treated as UNVERIFIED narrative only

- Ahrefs **Dashboard**
- Site Explorer **Overview** (DR/UR/AR/backlink totals/organic-keyword count/traffic estimate/traffic value)
- Site Explorer **AI Response Visibility**
- Site Explorer **Organic Keywords** (the 13-keyword table)
- Site Explorer **Organic traffic by location**
- Site Explorer **Organic keywords by intent**
- Site Explorer **Organic pages** (the "7 pages" figure)
- Site Explorer **Best by Links**
- Web Analytics **Overview** (the all-time summary tile page — views/bounce/duration roll-up)
- Backlinks pages 2–5 of the in-app pagination (683 total, only ~50 seen) and Referring Domains pages 2–4 (168 total, only ~50 seen)

Every number under these headings in the original brief (DR 11, UR 4.7, AR ~16.27M, 683/849 backlinks, 168/284 referring domains, 13 organic keywords, 83 organic traffic, $14 value, the specific 13-keyword list, AI visibility counts, the 7-organic-pages figure, Best-by-Links table) is **UNVERIFIED** — I have not seen a source file for any of it. Do not treat it as confirmed until the actual PDF is provided.

---

## 1. Discrepancies found

1. **Two completely different Site Audit snapshots exist.** The PDF in `docs/` is dated **18 Apr 2026**: Health Score **2 ("Weak")**, 581 errors / 1,443 warnings / 708 notices, 586 crawled URLs, 499 orphan pages. The newly-supplied Aug 31 Site Audit Overview shows Health Score **87 ("Good")**, 47 errors / 18 warnings / 635 notices, 336 crawled URLs. These are **four and a half months apart** and describe a site in dramatically different technical health — the April data is not a small variance, it looks like a pre-fix baseline. Do not average or blend them.
2. **Orphan-page counts moved from 499 (Apr CSV) to a state where the Aug 31 All-Issues report no longer lists "Orphan page" as a tracked issue at all** — instead "Indexable page not in sitemap" dropped from 57→1 (missing 56) and "Page has only one dofollow incoming internal link" is now the dominant internal-linking issue (42+39=81 URLs). This is consistent with a real remediation between April and August, but I cannot confirm the mechanism without seeing the intermediate crawls.
3. **683 current backlinks (user's brief) vs. what's visible in the PDF**: the Backlinks report page 1 header reads "167 groups of links" — plausible as a de-duplicated-by-domain count consistent with 168 referring domains, but I never saw a page displaying the literal "683" figure, so I can't independently confirm it.
4. **Ahrefs' own UI already labels many referring domains and backlinks "SPAM"** (see §5) — this is Ahrefs' own classification, visible directly in the product, not an inference on my part.
5. Two live Ahrefs banners confirmed verbatim on the Organic Competitors and Backlinks pages: "**28 Aug — Google keyword ranking data disruption**... temporary changes in ranking data" and "**Adaptive organic traffic model (opt-in)**... refreshed weights for SERP features including AI Overviews." Both match the brief.

---

## 2. Web Analytics baseline [VERIFIED]

### Channels (All time)
| Channel | Visitors | Share | Bounce | Duration |
|---|---|---|---|---|
| Direct | 3,392 | 49.8%* | 81.0% | ~7m16s |
| Search | 2,941 | 43.2% | 64.8% | ~5m30s |
| Internal | 333 | 4.9% | 42.0% | ~9m |
| Social | 129 | 1.9% | 62.8% | 4m27s |
| Unknown | 55 | 0.8% | 50.0% | 11m10s |
| Referral | 52 | 0.8% | 79.2% | 3m52s |
| AI search | 27 | 0.4% | 77.8% | 1m37s |
| Email | 10 | 0.1% | 36.4% | 2m53s |

*Share percentages as displayed; Direct+Search alone exceed the brief's 42.5%/43.2% split — read directly off the PDF, flagged per rule 4 if it differs from your transcription.

### Sources (Last 30 days: 3 Aug – 1 Sep 2026) — distinct report from Channels
| Source | Visitors | Share | Bounce | Duration |
|---|---|---|---|---|
| Google | 1,309 | 53.1% | 68.8% | 5m44s |
| Direct/None | 1,017 | 41.3% | 83.9% | 6m—s |
| Internal | 62 | 2.5% | — | — |
| Bing | 53 | 2.2% | 63.6% | 3m52s |
| Yahoo | 9 | 0.4% | 66.7% | 7m36s |
| DuckDuckGo | 9 | 0.4% | 44.4% | 1m34s |
| ChatGPT | 4 | 0.2% | 50.0% | 1m10s |
| fireflies-alternative | 3 | 0.1% | 100% | 0s |
| Coccoc | 2 | <0.1% | 100% | 0s |
| LinkedIn | 2 | <0.1% | 66.7% | 12m8s |
| Gemini | 2 | <0.1% | 100% | 0s |
| copilot.com | 2 | <0.1% | 75.0% | 14s |
| buzz-alternative | 2 | <0.1% | 50.0% | 39m7s |
| Ecosia | 1 | <0.1% | 0% | 71s |
| Facebook | 1 | <0.1% | 100% | 0s |
| Copilot | 1 | <0.1% | 100% | 0s |
| Perplexity | 1 | <0.1% | 100% | 0s |
| submitaitools.org | 1 | <0.1% | 100% | 0s |
| notta-alternative | 1 | <0.1% | 100% | 0s |
| ph.search.yahoo.com | 1 | <0.1% | 50.0% | 18m52s |
| r.search.yahoo.com | 1 | <0.1% | 100% | 0s |

**AI-search referral total (measured): ChatGPT 4 + Gemini 2 + Copilot 1 + Perplexity 1 = 8 visitors/30 days** (the Channels "AI search" bucket shows 27 all-time — different aggregation window/method, don't merge the two numbers).

### Countries (All time, top 25)
US 1,513 (22.2%) · Singapore 997 (14.6%) · China 496 (7.3%) · India 490 (7.2%) · Indonesia 223 (3.3%) · Nigeria 183 · UK 159 · Philippines 148 · Germany 142 · Pakistan 139 · Vietnam 131 · Myanmar 125 · Brazil 101 · Canada 101 · Kenya 93 · Netherlands 73 · Spain 64 · Australia 59 · France 59 · Malaysia 58 · Hong Kong 50 · Iran 49 · Japan 48 · Egypt 47 · Bangladesh 45

### Top pages (Last 30 days)
`/` 379 · `/srt-generator` 288 · `/video-to-transcript` 278 · `/video-to-srt` 243 · `/tools/html-to-srt` 131 · `/tools/video-metadata-viewer` 125 · `/capcut-captions` 124 · `/signup` 100 · `/video-to-subtitles` 94 · `/burn-subtitles` 92 · `/founder` 88 · `/subtitle-tools` 75 · `/burn-subtitles-into-video` 63 · `/pricing` 58 · `/tools/subtitle-validator` 54 · `/translate-subtitles` 50 · `/guideline-format` 36 · `/subtitle-grammar-fixer` 32 · `/fix-subtitles` 27 · `/video-transcription` 27 · `/samples` 25 · `/tools/subtitle-word-counter` 25 · `/tools/subtitle-reading-speed` 23 · `/subtitle-line-break-fixer` 22 · `/site-index` 18

### Entry pages (All time)
`/` 1,413 · `/video-to-transcript` 469 · `/founder` 433 · `/srt-generator` 396 · `/capcut-captions` 316 · `/video-to-srt` 265 · `/tools/video-metadata-viewer` 238 · `/tools/html-to-srt` 237 · `/subtitle-grammar-fixer` 137 · `/tools/subtitle-validator` 129 · `/burn-subtitles` 120 · `/translate-subtitles` 95 · `/guideline-format` 92 · `/burn-subtitles-into-video` 86 · `/unsubscribe` 77 · `/pricing` 76 · `/tools/subtitle-word-counter` 64 · `/tools/subtitle-reading-speed` 53 · `/subtitle-resources` 53 · `/subtitle-tools` 53 · `/subtitle-line-break-fixer` 52 · `/youtube-transcript-generator` 51 · `/tools/merge-srt-files` 49 · `/tools/subtitle-character-checker` 47 · `/chinese-transcription` 45

### Exit pages (All time)
`/` 1,139 (35.0% exit) · `/video-to-transcript` 669 (44.3%) · `/founder` 446 (64.0%) · `/srt-generator` 366 (57.7%… site shows ~67.7%, verify visually if precision matters) · `/capcut-captions` 307 (76.1%) · `/video-to-srt` 246 (67.5%) · `/tools/video-metadata-viewer` 232 (81.6%) · `/tools/html-to-srt` 212 (64.8%) · `/subtitle-grammar-fixer` 132 (72.7%) · `/burn-subtitles` 126 (60.8%) · `/guideline-format` 124 (37.1%) · `/tools/subtitle-validator` 113 (64.4%) · `/pricing` 98 (29.8%) · `/translate-subtitles` 97 (49.2%) · `/video-to-subtitles` 75 (29.7%) · `/burn-subtitles-into-video` 75 (60.0%) · `/signup` 73 (14.4%) · `/unsubscribe` 61 (54.2%) · `/fix-subtitles` 59 (36.1%) · `/tools/subtitle-word-counter` 57 (72.0%) · `/subtitle-tools` 55 (19.3%) · `/youtube-transcript-generator` 55 (64.0%) · `/subtitle-line-break-fixer` 53 (68.9%) · `/subtitle-resources` 53 (86.9%) · `/tools/subtitle-reading-speed` 51 (92.7%)

**Not available**: Web Analytics Overview (all-time totals for views/unique visitors/visits/bounce/duration rollup) — no source PDF received.

---

## 3. Technical (Site Audit) baseline [VERIFIED, crawl 28 Aug 2026, compared to 21 Aug]

- **Health Score: 87 ("Good")**
- Crawled URLs 336 → Internal 334, Resources 2
- Crawl status: 6,732 links found → 5,197 crawled / 1,535 uncrawled
- Issues: 700 total → Errors 47, Warnings 18, Notices 635
- Error distribution: URLs without errors 300, URLs with errors 44 (of 344 tracked)
- HTTP status: 2xx 317 (Overview) / 307 (Internal Pages report), 4xx 21, 3xx 6
- Internal Pages: Total crawled 334, HTML 307, Non-HTML 0, Redirects 6, Broken 21. Protocol: HTTPS 332 / HTTP 2. Subdomains: videotext.io 311, blog.videotext.io 21, www.videotext.io 2
- **Indexability**: Indexable 265 / Non-indexable 69 (Canonicalized 42, Non-200 27). Blocked by robots.txt: 0. Robots directive: Follow,Index 307. Canonical distribution: Self-referencing 265, To canonical page 21, **To broken (4xx) page 21**
- **All Issues** (28 Aug vs. 21 Aug):
  - 4XX page: 21 (−5 vs. last crawl, +1 new)
  - 404 page: 2 (−24, 18 removed)
  - Canonical points to 4XX: 21 (−10, +1 new, 11 missing since last crawl)
  - Indexable page became non-indexable: 1 (new)
  - Inconsistent AI training bot policy: 265 (−57, 56 missing)
  - Indexable page blocked from some AI search bots: 265 (unchanged)
  - Changed pages not submitted to IndexNow: 1 (new)
  - Page has links to redirect: 2
  - Page has only one dofollow incoming internal link (indexable): 42 (−26)
  - Same, not indexable: 39 (−2)
  - Redirected page has no incoming internal links: 1
  - 3XX redirect: 6; HTTP→HTTPS redirect: 2; Redirect chain: 1
  - Meta description too short: 10 (−37)
  - Page/SERP titles mismatch: 4
  - 3XX redirect in sitemap: 2; 4XX page in sitemap: 1 (new); Indexable page not in sitemap: 1 (−56)
  - Structured data rich-results validation error: 13

**Older crawl (18 Apr 2026, `docs/` PDF + 3 CSVs — kept for trend context, NOT the Aug 31 baseline):**
- Health Score 2 ("Weak"), 581 errors/1,443 warnings/708 notices, 586 crawled URLs, 499 orphan pages (mostly `/sitemap-programmatic.xml` long-tail pages like `/zoom-recording-transcription`, `/news-interview-transcript`), 10 canonical-URL-has-no-inlinks pages **including the homepage itself** (0 canonical inlinks vs. 18 href inlinks), 1 canonical-points-to-redirect case: `/otter-ai-alternative` → 301 → `/otter-alternative`.
- Net read: between April and August the site went from Health Score 2 to 87 and orphan-page-type issues dropped by roughly 55+ — a large, real improvement, not noise.

---

## 4. Site Explorer baseline

### Organic Competitors [VERIFIED — Monthly, US, 1 Sep 2026]
| Domain | Keyword overlap | Common w/ VideoText | Share | DR | Traffic | Value | Pages |
|---|---|---|---|---|---|---|---|
| srtgen.com | 26 | 3 | 10.3% | 8 | 127 | $131 | 3 |
| subtitletools.com | 216 | 2 | 0.8% | 55 | 1.6K | $732 | 17 |
| podsqueeze.com | 427 | 1 | 0.2% | 54 | 3.0K | $4.6K | 96 |
| maestra.ai | 4,843 | 7 | 0.1% | 71 | 67.5K | $37.6K | 575 |
| ffmpeg.org | 730 | 1 | 0.1% | 88 | 52.5K | $10.4K | 185 |
| clideo.com | 14,549 | 5 | 0.0% | 77 | 289.7K | $129.4K | 921 |
| sourceforge.net | 66,843 | 1 | 0.0% | 92 | 478.0K | $364.0K | 33.4K |
| freesubtitles.ai | 21 | 0 | 0.0% | 29 | 101 | $79 | 5 |
| happyscribe.com | 17,082 | 7 | 0.0% | 77 | 220.8K | $136.8K | 3.3K |
| clipchamp.com | 10,201 | 2 | 0.0% | 82 | 255.2K | $217.5K | 648 |
| gotranscript.com | 3,549 | 1 | 0.0% | 72 | 28.5K | $27.2K | 606 |
| typito.com | 1,147 | 0 | 0.0% | 65 | 6.3K | $1.9K | 119 |
| animaker.com | 4,139 | 0 | 0.0% | 75 | 48.6K | $28.3K | 245 |
| techsmith.com | 6,751 | 0 | 0.0% | 84 | 110.9K | $129.0K | 742 |
| veed.io | 18,476 | 3 | 0.0% | 86 | 198.3K | $129.5K | 1.6K |
| canva.com | 576,106 | 0 | 0.0% | 93 | 38.8M | $32.5M | 23.8K |
| cnet.com | 492,846 | 0 | 0.0% | 91 | 4.0M | $2.2M | 61.8K |
| github.com | 772,412 | 0 | 0.0% | 97 | 9.5M | $13.5M | 459.2K |
| quora.com | 11,844,796 | 0 | 0.0% | 92 | 30.8M | $16.6M | 4.9M |
| kapwing.com | 40,521 | 5 | 0.0% | 80 | 299.9K | $126.0K | 4.0K |

**Competitor classification:**
- **Direct product competitors** (subtitle/SRT generation tools, comparable scope): srtgen.com, subtitletools.com, freesubtitles.ai, kapwing.com (partial)
- **Feature/adjacent competitors** (broader video tools that include captioning as one feature): clideo.com, clipchamp.com, veed.io, typito.com, animaker.com, techsmith.com
- **Transcription-space competitors** (overlap via transcription, not subtitle-burning): podsqueeze.com, maestra.ai, gotranscript.com, happyscribe.com
- **SERP-incidental / not real competitors**: sourceforge.net, canva.com, cnet.com, github.com, quora.com, ffmpeg.org — these share keywords VideoText ranks for (e.g., generic "srt"/"video to text" queries) but are not businesses competing for the same customer.

### Referring Domains [VERIFIED, page 1 of 4 — 168 domains total, ~50 rows seen]
Top of list (highest DR, legitimate): medium.com (DR94), hashnode.com (DR83), fazier.com (DR83), topmate.io (DR81), submitaitools.org (DR75), facmags.com (DR74, flagged SPAM by Ahrefs despite DR), indiehunt.io (DR62), bitcode.com (DR59), betterlaunch.co (DR58).

Then a long, near-uniform run of domains **Ahrefs itself tags "SPAM"** starting ~DR29–56: backlinksplace.site, askmatchbox.com, launchboosts.com, parse.gl, and a cluster of `.shop` domains at DR29 — seopd-organic-boost-lab.shop, seo-traffic-growth-lab.shop, seo-growth-optimization-hub.shop, seo-performance-authority-engine.shop, seo-growth-authority-boost-hub.shop, seo-optimization-lab.shop, gosoogle.co, domainrankprovider.shop, rankscollective.shop, domainrankresults.shop, pageseotoolkit.shop, domainrankacademy.shop, domainrankteam.shop, siterankacademy.shop, siterankbuilders.shop, webrankinsights.shop, rankgrowthmarket.shop, serpcollective.shop, rankseomasters.shop, pageseoexpress.shop, seolinkcentral.shop, backlinkbuilders.shop, seogrowthpipeline.shop, linkgrowthinsights.shop, organicrankdirect.shop, linkcollective.shop, rankwingroup.shop, domainrankpartners.shop, pageseoexpress.shop, pageseonetwork.shop, searchrankgroup.shop, seolinkfactory.shop, seoboostsystems.shop, rankgrowthmasters.shop, seogrowthresults.shop — nearly all show **0 traffic, 0 keywords**, near-identical naming pattern, same DR band, same first-seen window (Jul–Aug 2026). This is a textbook link-farm/PBN pattern, and Ahrefs has already auto-flagged it.

### Backlinks [VERIFIED, page 1 of the in-app table — 50 of 683 rows]
Legitimate/product-relevant rows visible: IndieHunt project & category listings (DR62, dofollow), Fazier launch listing (DR83, dofollow, "Visit"), SubmitAITools review/alternatives listing (DR75, nofollow), LaunchBoost feature listing (DR45, dofollow), Linguistics News article on transcript readability (DR5, dofollow, editorial), Hashnode discussion posts authored by **Santhosh Guntupalli himself** on "Multi-Tool Transcription Workflows" and "Speaker Diarization Problems" (DR83, dofollow, genuine founder content, real topical relevance to product).

Spam-flagged rows visible: multiple `Site page/Home` and `Article/Comparison` entries from `.shop` domains (rankseoservice.shop, seodepot.shop, seokart.shop, pageseopartners.shop, searchrankbuilders.shop, organicranknetwork.shop, organicrankservice.shop, seolinkcentral.shop, seogrowthengine.shop, primebacklinks.shop, secgear.shop, nexabacklinks.shop, searchrankgroup.shop, googleseoauthority.shop, florta.shop, domainrankexperts.shop, pageseoexpress.shop, seogrowthalliance.shop) — DR mostly 0–32, near-identical boilerplate anchor/promo text about "premium guest posts, contextual backlinks, on-page and local SEO," all **nofollow**, all pointing at the homepage, dated almost entirely Apr–Aug 2026. Several rows explicitly display Ahrefs' own "SPAM" tag.

**Not available**: pages 2–5 of Backlinks (633 more rows), pages 2–4 of Referring Domains (118 more domains), Site Explorer Overview, AI Response Visibility, Organic Keywords table, Organic traffic-by-location, Keyword-intent breakdown, Organic Pages, Best by Links.

---

## 5. What could not be verified at all

Per the brief's own Section D/F/H requirements (Organic Keywords per-row table, AI Response Visibility, Best by Links, Organic Pages, Site Explorer Overview/Dashboard totals) — **no source file for these was ever attached to this session**, across all 18 files received in 4 messages. I am not fabricating them. If they exist as separate Ahrefs exports, please attach them; otherwise the baseline in Sections F and H of your original brief cannot be built with verified data and should be marked "pending source" in any report you circulate internally.
