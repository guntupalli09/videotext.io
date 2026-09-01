# VIDEOTEXT SEO BASELINE — 2026-08-31

Two evidence layers make up this baseline, tagged throughout:
- **[VERIFIED]** = read directly from a PDF/CSV image opened by Claude in this session.
- **[USER-EXTRACTED]** = supplied by Santhosh as a manual transcription of the same 2026-08-31 Ahrefs screenshot package, covering reports Claude could not independently open (Dashboard, Site Explorer Overview, Organic Keywords, Best by Links, Web Analytics Overview) and providing exact figures for reports Claude only partially saw (Backlinks, Referring Domains — Claude saw page 1 of the in-app pagination only). Treated as authoritative per Santhosh's instruction; flagged wherever it conflicts with something Claude saw directly.

Within both layers, source type is tagged per Santhosh's taxonomy:
**ESTIMATED** = Ahrefs Site Explorer. **MEASURED** = Ahrefs Web Analytics. **CRAWLED** = Ahrefs Site Audit. **INFERRED** = Claude's own conclusion, never presented as source data.

---

## 0. Evidence inventory

18 Ahrefs PDFs (2026-08-31 23:48–23:59 UTC captures) covering Dashboard, Site Explorer (Overview 2pg, Organic keywords, Best by links, Referring domains, Backlinks 5pg, Organic competitors), Web Analytics (Overview, Sources, Top pages, Countries, Channels, Entry pages, Exit pages), Site Audit (Overview, Indexability, All issues, Internal pages) — full list in Santhosh's Section 1. Claude directly opened and rendered 11 of these + 3 CSVs + 1 older PDF already in `docs/`; the remaining 7 (Dashboard, Site Explorer Overview, Organic Keywords, Best by Links, Web Analytics Overview, and full row sets for Backlinks/Referring Domains beyond page 1) are covered only via Santhosh's manual extraction below.

Two live Ahrefs banners confirmed on pages Claude opened directly: **"28 Aug — Google keyword ranking data disruption"** (temporary ranking-data noise from a recent Google change) and **"Adaptive organic traffic model (opt-in)"** (refreshed SERP-feature weights including AI Overviews). Both apply only to Site Explorer ESTIMATED figures — do not use them to explain movement in MEASURED Web Analytics or CRAWLED Site Audit numbers.

---

## 1. Discrepancies (preserved, not silently reconciled)

1. **`docs/Ahrefs - Overview - Videotext.pdf` is a different, older crawl** — dated 18 Apr 2026, Health Score 2 ("Weak"), 581 errors, 586 crawled URLs, 499 orphan pages. This is ~4.5 months before the Aug 31 baseline and is kept only for trend context, never blended with Aug 31 figures.
2. **Exit pages, `/founder` row**: Santhosh's own extraction flags this row as visually anomalous (446 visitors but an Exits value that reads ~978, exceeding visitors — a ratio impossible under a normal exit-rate definition) and asks that it be rechecked directly in Ahrefs rather than trusted as transcribed. Carried forward as an open data-quality flag, not corrected by assumption.
3. **Compact competitor widget (Site Explorer Overview) vs. dedicated Organic Competitors report** show slightly different keyword-overlap/share numbers for the same five domains (e.g., srtgen.com: 3 common/8.5% share/26 competitor keywords in the widget vs. 3 common/10.3% share/26 in the dedicated report). Different report context/index date — preserved separately, not reconciled.
4. **Organic Pages bucket math**: Site Explorer Overview reports 7 organic pages total, with 28.6% (2 pages) at zero traffic and 71.4% (5 pages) in the 1–1,000 traffic bucket, yet 100% of *traffic* is attributed to the 1,001+ bucket in one line of the source while pages show 0% there — an internal inconsistency in the source screenshot itself, flagged rather than resolved.
5. **683 current backlinks / 168 referring domains** (Site Explorer Overview, ESTIMATED) vs. the Backlinks report page 1 header Claude read directly ("167 groups of links") — consistent within rounding, not a real conflict.
6. Between the Apr and Aug crawls, Health Score moved 2→87 and orphan-page-class issues dropped by 55+ — a large, real technical improvement. Whatever was done between April and August is working; don't undo it while chasing new fixes.

---

## 2. Executive scorecard

| Metric | Value | Source type |
|---|---|---|
| Health Score | 87 ("Good") | CRAWLED |
| Domain Rating | 11 (+3) | ESTIMATED |
| Referring domains | 168 (+30), all-time 284 | ESTIMATED |
| Backlinks | 683 current, 849 all-time | ESTIMATED |
| Organic keywords | 13 (+10), Top 3: 0 | ESTIMATED |
| Organic traffic (Ahrefs estimate) | 83/mo (+78) | ESTIMATED |
| Organic traffic value | $14 | ESTIMATED |
| Web Analytics total visitors (all time) | 6.8K unique / 8K visits / 14.1K views | MEASURED |
| Google visitors, last 30 days | 1,309 | MEASURED |
| Bounce rate (all time) | 71.7% | MEASURED |
| AI response appearances | 11 (5 pages) | ESTIMATED |
| AI-search channel visitors (all time) | 27 | MEASURED |

**The central tension**: Ahrefs Site Explorer sees a nearly invisible site (13 keywords, 83 est. monthly organic visits, $14 value). Ahrefs Web Analytics measures a site with 8K visits and 1,309 real Google visitors in 30 days alone. Both are true simultaneously — see §7.

---

## 3. Site Explorer baseline

### 3.1 Dashboard [USER-EXTRACTED, ESTIMATED/CRAWLED mixed]
Health Score 87 · Crawled 344 (Δ−133) · Redirects 6 · Broken 21 (Δ−5) · Blocked 0 · DR 11 (Δ+3) · Referring domains 168 (Δ+30) · Total visitors 2.5K (Δ+540) · Organic traffic 83 (Δ+78) · Traffic value $14 · Organic keywords 13 (Δ+10). Keyword-location deltas: US 9 (+7) · IN 3 (+2) · AU 2 (+2) · CA 2 (+2) · ID 1 (+1) · Other 2 (+2).

### 3.2 Authority / links overview [USER-EXTRACTED, ESTIMATED]
DR 11 · UR 4.7 · Ahrefs Rank 16,271,964 · Backlinks: 683 current / 849 all-time · Referring domains: 168 current / 284 all-time.

### 3.3 Search overview [USER-EXTRACTED, ESTIMATED]
Organic keywords 13 · Top 3: 0 · Est. organic traffic 83 · Est. traffic value $14 · Paid keywords/ads/traffic: 0.

### 3.4 AI response visibility [USER-EXTRACTED, ESTIMATED]
All platforms: 11 appearances / 5 pages. AI Overviews 1/1 · AI Mode 0/0 · ChatGPT 0/0 · Gemini 0/0 · Perplexity 1/1 · Copilot 9/4 · Grok (paused) 0/0.
This is Ahrefs' AI-response index, not AI-referral traffic — compare only against §5's measured AI-search channel (27 all-time / 8 in last 30 days), never merge.

### 3.5 Organic traffic by location [USER-EXTRACTED, ESTIMATED]
India: 71 traffic, 84.5% share, 3 keywords · US: 8, 9.5%, 9 keywords · Canada: 2, 2.4%, 2 · Australia: 2, 2.4%, 2 · UK: 1, 1.2%, 1.
This is an estimate built from only 13 total ranking keywords and should not be compared to Web Analytics geography (§6) without noting Web Analytics captures all channels, not just organic search.

### 3.6 Organic keyword intent [USER-EXTRACTED, ESTIMATED]
Branded 2 kw / 0 traffic · Non-branded 11 / 83 · Informational 13 / 83 · Navigational 0/0 · Commercial 8 / 79 · Transactional 0/0 · Local 0/0 · Non-local 13/83.
Nearly all estimated traffic is non-branded, informational-leaning but commercially relevant. Do not infer conversion rate from intent labels alone.

### 3.7 Organic keywords — all 13 rows [USER-EXTRACTED, ESTIMATED]

| # | Keyword | Volume | Traffic | Position | Locations | Top location | Top-loc. volume | Top-loc. traffic |
|---|---|---|---|---|---|---|---|---|
| 1 | srt file generator | 1.4K | 68 | 8 | 2 | India | 1.4K | 65 |
| 2 | srt file maker | 260 | 7 | 10 | 2 | India | 200 | 5 |
| 3 | burn subtitles into video | 30 | 3 | 43 | 1 | United States | 30 | 3 |
| 4 | srt generator | 40 | 2 | 6 | 1 | Canada | 40 | 2 |
| 5 | create srt file | 80 | 2 | 10 | 1 | United Kingdom | 30 | 1 |
| 6 | video srt | 40 | 1 | 9 | 1 | United States | 40 | 1 |
| 7 | free srt generator | 30 | 1 | 10 | 1 | United States | 30 | 1 |
| 8 | srt file creator | 30 | 1 | 8 | 2 | United States | 30 | 1 |
| 9 | srt to vtt | 700 | 1 | 27 | 1 | United States | 700 | 1 |
| 10 | srt caption generator | 10 | 0 | 9 | 1 | United States | 10 | 0 |
| 11 | create srt file free | 10 | 0 | 8 | 1 | United States | 10 | 0 |
| 12 | videotext | 60 | 0 | 5 | 1 | United States | 60 | 0 |
| 13 | subtitletools | 80 | 0 | 4.8* | 2 | United States | 20 | 0 |

*Row 13's position field showed "4.8" in the source — non-integer position values are unusual for Ahrefs and may reflect an averaged/blended position across two tracked locations; transcribed as-is, not corrected.

**Opportunity read**: Rows 1–2 (srt file generator/maker, positions 8 & 10) are closest to Top-3/Top-10 breakout and already carry the most volume (1.4K, 260) — highest-leverage existing rankings to push. Row 9 (srt to vtt, 700 vol, position 27) has real volume but is far from page 1. Rows 10–13 have near-zero volume/traffic and are low priority for optimization.

### 3.8 Organic pages by traffic [USER-EXTRACTED, ESTIMATED]
7 organic pages total · 28.6% zero-traffic, 71.4% in 1–1,000 bucket · (see discrepancy §1.4 on the traffic-share figure). Only 7 of the site's ~265 indexable pages (§4) are estimated to receive any organic search traffic at all — a 36:1 gap between indexable inventory and pages Ahrefs credits with search traffic.

### 3.9 Site Explorer crawled pages [USER-EXTRACTED, ESTIMATED/CRAWLED]
710 crawled · 200 OK 648 (91.3%) · 3XX 62 (8.7%) · 404/4XX/5XX: 0.
This is a **different crawl context from Site Audit's 334 internal pages** (§4) — different tool, different methodology. Not reconciled; both preserved.

### 3.10 Organic Competitors [VERIFIED — Claude opened this directly, Monthly, US, 1 Sep 2026]

| Domain | Competitor kw | Common | Share | DR | Traffic | Value | Pages |
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

**Classification**:
- **Direct product competitors**: srtgen.com, subtitletools.com, freesubtitles.ai
- **Feature/adjacent competitors** (video tools where captioning is one feature): clideo.com, clipchamp.com, veed.io, typito.com, animaker.com, techsmith.com, kapwing.com
- **Transcription-space competitors**: podsqueeze.com, maestra.ai, gotranscript.com, happyscribe.com
- **SERP-incidental, not real competitors**: sourceforge.net, canva.com, cnet.com, github.com, quora.com, ffmpeg.org — share keywords via generic terms, not businesses competing for the same customer.

### 3.11 Best by Links — 22 target pages [USER-EXTRACTED, ESTIMATED]

| Target | UR | Ref. domains | Top DR | Links to page | Dofollow | Nofollow |
|---|---|---|---|---|---|---|
| Homepage (canonical, https) | 4.7 | 159 | 94 | 647 | 74 | 573 |
| `http://videotext.io/` (non-canonical variant) | 4.7 | 4 | — | 10 | 4 | 0 |
| `/?ref=fazier` | — | 1 | 83 | 1 | 1 | — |
| `/?ref=indiehunt` | — | 1 | 62 | 2 | 2 | — |
| `/compare` | 4.5 | 1 | 94 | 1 | 0 | 1 |
| `/google-docs-voice-typing-alternative` | — | 1 | 5 | 5 | 2 | — |
| `/interview-transcription-tool` | 4.5 | 1 | 83 | 38 | — | — |
| `/subtitle-reading-speed` | 4.5 | 1 | 5 | 5 | 1 | — |
| `/tools/merge-srt-files` | 4.5 | 1 | 5 | 5 | 1 | — |
| `/tools/subtitle-character-checker` | 4.5 | 1 | 5 | 5 | 1 | — |
| `/?ref=external-publisher` | — | 1 | 81 | 1 | 1 | — |
| `/video-to-subtitles` | 4.9 | 1 | 81 | 1 | 1 | — |
| `/video-to-transcript` | 4.9 | 1 | 81 | 1 | 1 | — |
| `/video-recorder` | 4.5 | 1 | 81 | 1 | 1 | — |
| `/youtube-transcript-generator` | — | 1 | 81 | 1 | 1 | — |
| `blog.videotext.io/` | — | 1 | 83 | 1 | 1 | — |
| blog: hidden-cost-of-multi-tool-transcription-workflows | — | 1 | 83 | 3 | 2 | — |
| blog: how-agencies-process-100-hours-audio | — | 1 | 83 | 2 | 2 | — |
| blog: manual-timestamp-fixing-is-wasting-hours | — | 1 | 83 | 2 | 2 | — |
| blog: speaker-diarization-problems-nobody-talks-about | — | 1 | 83 | 2 | 2 | — |
| blog: whisper-large-v3-accuracy-difficult-audio | — | 1 | 83 | 1 | 1 | — |
| blog: why-formatting-is-the-most-annoying-part-of-transcription | — | 1 | 83 | 2 | 2 | — |

**Read**: Link equity is massively concentrated on the homepage (159 referring domains, 647 links) with every other page sitting at exactly 1 referring domain. Commercially important tool pages that already carry real Web Analytics traffic (`/srt-generator`, `/burn-subtitles`, `/tools/html-to-srt`, `/capcut-captions`, `/translate-subtitles`) **do not appear in this top-22-by-links list at all** — they have essentially zero external link equity despite meaningful actual usage. `/video-to-transcript` and `/video-to-subtitles` each have exactly 1 referring domain despite being top-5 Entry/Exit pages by real traffic. This is the single clearest "traffic without external authority" gap in the whole evidence set.

### 3.12 Referring Domains [VERIFIED page 1 directly by Claude + USER-EXTRACTED confirms/extends]
168 domains total. Followed 61 (36.3%) / not followed 107 (63.7%) [USER-EXTRACTED, ESTIMATED].

Top of list (legitimate, high-DR): medium.com DR94 (traffic ~20.3M, kw ~3.6M) · hashnode.com DR83 (traffic 48,788, kw 1,109) · fazier.com DR83 (traffic 331, kw 34) · topmate.io DR81 (traffic 53,888, kw 21,563) · submitsaas.com DR75 — **flagged SPAM by Ahrefs** · saasframe.com DR74 — **SPAM** · indiehunt.io DR62 · ycode.com DR59 — **SPAM** · betterlaunch.ca DR58 · backlinkplace.site DR56 — **SPAM** · aimatchbox.com DR51 — **SPAM** · launchboost.com DR45 · bellofline.com DR40 — **SPAM** · page.gd DR38 (traffic 921, kw 414).

Below that: a large, near-uniform cluster of DR29–32 domains **explicitly Ahrefs-tagged SPAM**, mostly `.shop` naming (seogrowth-*, domainrank-*, rankseo-*, siterank-*, pageseo-*, searchrank-*, linkgrowth-*, organicrank-*), 0 traffic / 0 keywords each, first-seen clustered Jul–Aug 2026.

**Note**: Claude's directly-opened screenshot named a few of these domains slightly differently than Santhosh's transcription (e.g., "facmags.com" vs. not mentioned in the extraction, "bitcode.com" vs. "ycode.com"/"bellofline.com" in the extraction) — small-text OCR variance between two independent reads of similar-looking rows. Both readings agree on the core fact: a large SPAM-tagged cluster exists at DR29–56.

**Do not** read 168 referring domains as 168 editorial endorsements — a large minority are Ahrefs-confirmed link-farm placements.

### 3.13 Backlinks — all 5 pages [VERIFIED page 1 directly by Claude + USER-EXTRACTED covers all 5]
187 groups of links, 683 total backlinks. Followed 108 (15.8%) / not followed 575 (84.2%, all nofollow) / UGC 2 (0.3%) / Sponsored 0. **100% of current backlinks fall in the UR <10 bucket** — every UR bucket from 10–19 through 90–100 shows 0 [USER-EXTRACTED, ESTIMATED].

Legitimate/product-relevant, confirmed across both reads: IndieHunt (project + category listings, DR62, dofollow), Fazier (DR83, dofollow), SubmitAITools (DR75, nofollow), LaunchBoost (DR45, dofollow), SaaSFrame review page, Nerta review page, Linguistics News editorial article on transcript readability (DR5, dofollow), and — most notably — **Hashnode discussion posts authored by Santhosh Guntupalli himself** ("Hidden Cost of Multi-Tool Transcription Workflows," "Speaker Diarization Problems Nobody Talks About," DR83, dofollow) — genuine founder-authored content, directly on-topic.

Spam cluster, confirmed across both reads: dozens of `.shop` domains (rankseoservice, seodepot, seokart, pageseopartners, searchrankbuilders, organicranknetwork, organicrankservice, seolinkcentral, seogrowthengine, primebacklinks, secgear, nexabacklinks, searchrankgroup, googleseoauthority, florta, domainrankexperts, seogrowthalliance, backlinkorbit, speedpost, and more) — DR 0–32, nofollow, near-identical promotional anchor text ("Boost videotext.io using premium guest posts, contextual backlinks, on-page and local SEO... Rank First Page Google"), first-seen concentrated Apr–Aug 2026. This is a coordinated, templated pattern — evidence supports **monitoring**, not yet disavowal (no evidence of ranking harm; DR/traffic remain positive-trending per §3.1).

---

## 4. Technical (Site Audit) baseline [CRAWLED, 28 Aug 2026, compared to 21 Aug]

- **Health Score: 87 ("Good")**
- Crawled URLs 336 (Internal 334, Resources 2)
- Crawl status: 6,732 links found → 5,197 crawled / 1,535 uncrawled
- Issues: 700 total (Errors 47, Warnings 18, Notices 635)
- Error distribution: 300 URLs without errors / 44 with errors (of 344 tracked)
- HTTP status: 2xx 317, 4xx 21, 3xx 6
- Internal Pages: 334 crawled, HTML 307, Non-HTML 0, Redirects 6, Broken 21. Protocol HTTPS 332 / HTTP 2. Subdomains: videotext.io 311, blog.videotext.io 21, www.videotext.io 2.
- Indexability: Indexable 265 / Non-indexable 69 (Canonicalized 42, Non-200 27). Blocked by robots.txt: 0. Robots directive Follow,Index: 307. Canonical distribution: Self-referencing 265, To canonical page 21, **to broken (4xx) page 21**.
- **What's new since 21 Aug**: 4XX page in sitemap (+1, new) · Changed pages not submitted to IndexNow (+1, new) · Indexable page became non-indexable (+1, new).
- Bulk export: Internal URLs 344 · Uncrawled links 3,684 · Anchor texts 6,732 · Images w/o alt 0 · Blocked-by-robots links 0 · Links to 4xx URLs 22.
- **All Issues** (Actual 20, New 3, All tracked 176):
  - 4XX page 21 (Δ−5, +1 added, 6 missing) · 404 page 2 (Δ−24, 18 removed, 6 missing)
  - Canonical points to 4XX 21 (Δ−10, +1 added, 11 missing) · Indexable page became non-indexable 1 (new)
  - Inconsistent AI training bot policy 265 (Δ−57, 1 removed, 56 missing) · Indexable page blocked from some AI search bots 265 (Δ−57) · Changed pages not submitted to IndexNow 1 (new)
  - Page has links to redirect 2 · Page has only one dofollow incoming internal link 42 (Δ−26, 26 missing) + 39 (Δ+2, 2 missing) [two distinct groupings in source] · Redirected page has no incoming internal links 1
  - 3XX redirect 6 · HTTP→HTTPS redirect 2 · Redirect chain 1
  - Meta description too short 10 (Δ−37, 37 missing) · Page/SERP titles mismatch 4
  - 3XX redirect in sitemap 2 · 4XX page in sitemap 1 (new, +1) · Indexable page not in sitemap 1 (Δ−56, 56 missing)
  - Structured data rich-results validation error 13

**Older crawl (18 Apr 2026, `docs/` PDF + CSVs, historical only)**: Health Score 2, 581 errors, 586 crawled, 499 orphan pages (mostly `/sitemap-programmatic.xml` long-tail pages), 10 canonical-no-inlinks pages including the homepage, 1 canonical-to-redirect case (`/otter-ai-alternative` → 301 → `/otter-alternative`).

**Net read**: real, large remediation between April and August (Health Score 2→87, orphan-class issues down 55+). Remaining Aug 31 issues are smaller in scale but concrete: 21 canonical→4xx pages, 81 single-internal-link pages, 265 pages with inconsistent AI-bot policy, 13 structured-data errors.

---

## 5. Web Analytics baseline [MEASURED]

### Overview (All time) [USER-EXTRACTED]
Total views 14.1K · Unique visitors 6.8K · Total visits 8K · Views/visit 1.8 · Bounce 71.7% · Duration 6m36s.
Browsers: Chrome 81.4%, Safari 7.1%, Edge 4.0%, Firefox 2.4%, Opera 0.9%, Google Search App 0.7%, WeChat 0.6%, Douyin 0.5%, Samsung Browser 0.4%, LinkedIn 0.4%.
Tracked event: Outbound link clicks — 18 visitors, 22 count, 0.3% conversion rate. **No signup or pricing-click event is captured in Web Analytics** — this is a measurement gap, not evidence signups aren't happening (product-side signup data would live in the app's own analytics, not Ahrefs).
Overview top-page tile (all-time, %-of-total framing — different aggregation from Top Pages report below): `/` 1,700/24.8% · `/video-to-transcript` 905/13.3% · `/founder` 487/7.1% · `/srt-generator` 404/5.9% · `/signup` 346/5.1% · `/capcut-captions` 317/4.7% · `/video-to-srt` 275/4.0% · `/guideline-format` 256/3.8% · `/pricing` 256/3.8% · `/tools/video-metadata-viewer` 239/3.5%.

### Channels (All time) [VERIFIED by Claude directly]
Direct 3,392 (49.8%, 81.0% bounce, 7m16s) · Search 2,941 (43.2%, 64.8%, ~5m30s) · Internal 333 (4.9%, 42.0%, 9m32s) · Social 129 (1.9%, 62.8%, 4m27s) · Unknown 55 (0.8%, 50.0%, 11m10s) · Referral 52 (0.8%, 79.2%, 3m52s) · AI search 27 (0.4%, 77.8%, 1m37s) · Email 10 (0.1%, 36.4%, 2m53s).

### Sources (Last 30 days: 3 Aug–1 Sep 2026) [VERIFIED by Claude directly — distinct from Channels]
Google 1,309 (53.1%, 68.8% bounce, 5m44s) · Direct/None 1,017 (41.3%, 83.9%, 6m) · Internal 62 (2.5%, 39.1%, 6m42s) · Bing 53 (2.2%, 63.6%, 3m52s) · Yahoo 9 (0.4%, 66.7%, 7m36s) · DuckDuckGo 9 (0.4%, 66.7%, 1m34s) · ChatGPT 4 (0.2%, 50.0%, 1m10s) · fireflies-alternative 3 · Coccoc 2 · LinkedIn 2 (12m8s) · Gemini 2 · copilot.com 2 · buzz-alternative 2 (39m7s) · Ecosia 1 · Facebook 1 · Copilot 1 · Perplexity 1 · submitaitools.org 1 · notta-alternative 1 · ph.search.yahoo.com 1 (18m52s) · r.search.yahoo.com 1.

**Measured AI-search referrals (30-day): ChatGPT 4 + Gemini 2 + Copilot 1 + Perplexity 1 = 8.** Channels' all-time AI-search bucket shows 27 — different window/method, kept separate, never merged with the Site Explorer AI Response Visibility count of 11 (§3.4).

### Countries (All time)
US 1,513 (22.2%) · Singapore 997 (14.6%) · China 496 (7.3%) · India 490 (7.2%) · Indonesia 223 (3.3%) · Nigeria 183 (2.7%) · UK 159 (2.3%) · Philippines 148 (2.2%) · Germany 142 (2.1%) · Pakistan 139 (2.0%) · Vietnam 131 (1.9%) · Myanmar 125 (1.8%) · Brazil 101 (1.5%) · Canada 101 (1.5%) · Kenya 93 (1.4%) · Netherlands 73 (1.1%) · Spain 64 (0.9%) · Australia 59 (0.9%) · France 59 (0.9%) · Malaysia 58 (0.9%) · Hong Kong 50 (0.7%) · Iran 49 (0.7%) · Japan 48 (0.7%) · Egypt 47 (0.7%) · Bangladesh 45 (0.7%).

### Top Pages (Last 30 days, 3 Aug–1 Sep 2026)
`/` 379/45s/43.5% bounce · `/srt-generator` 288/3m13s/69.2% · `/video-to-transcript` 278/2m4s/66.2% · `/video-to-srt` 243/3m53s/71.9% · `/tools/html-to-srt` 131/1m38s/61.9% · `/tools/video-metadata-viewer` 125/2m35s/85.3% · `/capcut-captions` 124/4m35s/84.5% · `/signup` 100/29s/20.0% · `/video-to-subtitles` 94/3m23s/76.2% · `/burn-subtitles` 92/5m11s/76.3% · `/founder` 88/58s/78.0% · `/subtitle-tools` 75/25s/65.2% · `/burn-subtitles-into-video` 63/3m7s/56.5% · `/pricing` 58/1m13s/43.5% · `/tools/subtitle-validator` 54/2m19s/72.2% · `/translate-subtitles` 50/2m10s/71.8% · `/guideline-format` 36/1m40s/75.0% · `/subtitle-grammar-fixer` 32/2m10s/81.8% · `/fix-subtitles` 27/1m55s/60.0% · `/video-transcription` 27/1m55s/81.5% · `/samples` 25/6s/66.7% · `/tools/subtitle-word-counter` 25/4m57s/75.0% · `/tools/subtitle-reading-speed` 23/1m21s/95.7% · `/subtitle-line-break-fixer` 22/1m48s/81.0% · `/site-index` 18/0s/100%.

### Entry Pages (All time)
`/` 1,413 (4m36s) · `/video-to-transcript` 469 (7m21s) · `/founder` 433 (12m59s) · `/srt-generator` 396 (6m9s) · `/capcut-captions` 316 (10m16s) · `/video-to-srt` 265 (8m17s) · `/tools/video-metadata-viewer` 238 (3m10s) · `/tools/html-to-srt` 237 (3m19s) · `/subtitle-grammar-fixer` 137 (6m40s) · `/tools/subtitle-validator` 129 (6m42s) · `/burn-subtitles` 120 (8m49s) · `/translate-subtitles` 95 (8m41s) · `/guideline-format` 92 (8m38s) · `/burn-subtitles-into-video` 86 (6m) · `/unsubscribe` 77 (2m12s) · `/pricing` 76 (7m23s) · `/tools/subtitle-word-counter` 64 (5m42s) · `/tools/subtitle-reading-speed` 53 (2m54s) · `/subtitle-resources` 53 (7m32s) · `/subtitle-tools` 53 (3m57s) · `/subtitle-line-break-fixer` 52 (4m33s) · `/youtube-transcript-generator` 51 (8m32s) · `/tools/merge-srt-files` 49 (1m12s) · `/tools/subtitle-character-checker` 47 (3m13s) · `/chinese-transcription` 45 (4m27s).

### Exit Pages (All time)
`/` 1,139/35.0% · `/video-to-transcript` 669/44.3% · `/founder` 446/**flagged anomalous, see §1.2** · `/srt-generator` 366/57.7% · `/capcut-captions` 307/76.1% · `/video-to-srt` 246/67.5% · `/tools/video-metadata-viewer` 232/81.6% · `/tools/html-to-srt` 212/64.8% · `/subtitle-grammar-fixer` 132/72.7% · `/burn-subtitles` 126/60.8% · `/guideline-format` 124/37.1% · `/tools/subtitle-validator` 113/64.4% · `/pricing` 98/29.8% · `/translate-subtitles` 97/49.2% · `/video-to-subtitles` 75/29.7% · `/burn-subtitles-into-video` 75/60.0% · `/signup` 73/14.4% · `/unsubscribe` 61/54.2% · `/fix-subtitles` 59/36.1% · `/tools/subtitle-word-counter` 57/72.0% · `/subtitle-tools` 55/19.3% · `/youtube-transcript-generator` 55/64.0% · `/subtitle-line-break-fixer` 53/68.9% · `/subtitle-resources` 53/86.9% · `/tools/subtitle-reading-speed` 51/92.7%.

---

## 6. Page-level cross-reference (traffic vs. link equity vs. technical status)

| Page | 30d visitors | Entry (all time) | Backlink equity (Best by Links) | Read |
|---|---|---|---|---|
| `/` | 379 | 1,413 | 159 ref. domains, 647 links | Anchor page, correctly link-rich |
| `/srt-generator` | 288 | 396 | **not in top-22** | High real traffic, zero external authority |
| `/video-to-transcript` | 278 | 469 | 1 ref. domain, 1 link | High traffic, near-zero link equity |
| `/video-to-srt` | 243 | 265 | **not in top-22** | High traffic, zero link equity |
| `/tools/html-to-srt` | 131 | 237 | **not in top-22** | Real traffic, zero link equity |
| `/capcut-captions` | 124 | 316 | **not in top-22** | Real traffic, zero link equity |
| `/founder` | 88 | 433 | **not in top-22** | High engagement (12m59s entry), brand/trust page |
| `/burn-subtitles` | 92 | 120 | **not in top-22** | Real traffic, zero link equity |
| `/video-to-subtitles` | 94 | — | 1 ref. domain, 1 link | Matches, minimal equity |
| `/youtube-transcript-generator` | — | 51 | 1 ref. domain, 1 link | Matches, minimal equity |

**This is the single most actionable finding in the evidence set**: the pages driving actual measured demand are almost entirely absent from the Best-by-Links table. Link-building and internal-linking effort should go to these pages before any new page is created.

---

## 7. Why 13 Ahrefs keywords but thousands of measured visitors (evidence-based answer)

1. **Direct (49.8% of all-time visitors, 3,392) and Internal (333) are not Site-Explorer-visible traffic at all** — brand recall, bookmarks, word of mouth, tool-directory referrals (IndieHunt/Fazier/SubmitAITools) that land as Direct, not Search.
2. **Search channel (2,941 all-time, 1,309 Google in last 30 days alone) is real, but Ahrefs' organic-keyword index (13 keywords) only reflects queries where VideoText has an Ahrefs-trackable ranking position.** Long-tail, branded, and navigational queries ("videotext", "srt generator" variants at position 5–10) drive real clicks without registering as a large keyword footprint, especially under the Aug 28 "Google keyword ranking data disruption" Ahrefs itself is warning about.
3. **Referral/directory traffic (Fazier, IndieHunt, SaaSFrame, SubmitAITools, Nerta) is classified as Referral/Direct in Web Analytics, not Search** — it never touches the organic-keyword count but is real acquisition.
4. Ahrefs' organic-traffic estimate is a **modeled projection from a shallow keyword index (13 terms)** — with that few tracked rankings, the model has very little to extrapolate from, so its output (83/mo) understates real search-driven traffic by a wide margin. This is a known limitation of keyword-index-based traffic models on low-keyword-count sites, not a data error.

---

## 8. What remains genuinely unverified

- Full row-level Backlinks (only ~50 of 683 seen in detail; remaining 4 pages summarized by Santhosh at a category level, not row-by-row)
- Full row-level Referring Domains (only ~50 of 168 seen in detail)
- The `/founder` Exit-page anomaly (§1.2) — needs a direct Ahrefs recheck, not assumed
- Organic Pages bucket internal-consistency issue (§1.4)
- No Web Analytics event data exists for signup/pricing conversions — any conversion-rate claim needs the product's own analytics, not Ahrefs

Everything else in this document is now backed by either a directly-opened Ahrefs PDF or Santhosh's manual transcription of the same 2026-08-31 capture. Ready to proceed to codebase audit (Section 27).
