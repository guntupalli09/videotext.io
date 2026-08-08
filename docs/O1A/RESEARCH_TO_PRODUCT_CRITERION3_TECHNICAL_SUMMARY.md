# Technical Summary: ICCS 2026 Research and VideoText.io  
**O-1A Criterion 3 — Original Contributions of Major Significance (research ↔ product)**

**Submission-ready Word file (generated):** `docs/O1A/RESEARCH_TO_PRODUCT_CRITERION3_TECHNICAL_SUMMARY.docx` — regenerate after edits with `python docs/O1A/generate_o1a_technical_summary_docx.py`.

The Word file includes an **appendix** that auto-lists all posts under `content/blog/` (canonical URLs `https://blog.videotext.io/{slug}`). Add **Medium** (or other) URLs in `docs/O1A/extra_public_writing_urls.txt` (one line per article: `Title | URL | Medium`) and regenerate.

**Publication (camera-ready):** Santhosh Guntupalli, *Deterministic Execution Frameworks for Hybrid Symbolic–Probabilistic Computational Pipelines* (ICCS 2026).  
**Product:** VideoText.io — production SaaS for video transcription, subtitles, translation, caption tooling, batch processing, and related media workflows.

**Third-party product presence (published listings / features):**

- **IndieHunt** — VideoText.io is **featured** on IndieHunt (independent product discovery).
- **Fazier** — Product carries the **Fazier** badge / listing on the Fazier platform.
- **G2** — Product profile **published** on [G2](https://www.g2.com/) (business software reviews and comparison).
- **Capterra** — Product profile **published** on [Capterra](https://www.capterra.com/) (software discovery and reviews).

*For the immigration packet: add direct URLs or PDF screenshots of each listing as exhibits.*

---

## Current production snapshot (field-level significance)

Figures below are drawn directly from VideoText.io's internal operations dashboard (sourced from the canonical Postgres `business_users` / `business_jobs` views described in the analytics-architecture section below) as of **2026-08-08**. Operational/quality metrics only — no revenue or subscriber-count figures — offered as direct evidence that the deterministic-core engineering choices translate into fast, reliable, well-received service under real usage.

| Metric | Value | Window |
|---|---|---|
| Registered users | **489** | cumulative, as of snapshot date |
| New signups | **201** (+67% week-over-week) | trailing 30 days |
| Jobs completed across all tools | **≈1,480** | trailing 30 days |
| Average job processing time | **24.5 s** | trailing 30 days, completed jobs |
| P95 job processing time | **116.5 s** | trailing 30 days, completed jobs |
| Job failure rate | **5.1%** | trailing 30 days |
| Average customer rating | **4.6 / 5** (38 ratings) | cumulative |
| Top tool by volume | Video → Subtitles (153 jobs) | trailing 30 days |

*Counsel: attach a dated screenshot of the dashboard view as a labeled exhibit; refresh these figures immediately before filing since they change daily.*

---

## Executive summary

The ICCS paper contributes a **computational framework** for hybrid pipelines: a **deterministic execution layer** (normalized input, ordered logic, versioned configuration) that owns all state transitions and primary outputs, while **stochastic models are confined to non-authoritative post-hoc layers** that cannot alter deterministic findings. The paper validates this design with **100% execution determinism and 100% traceability** on a structured-text corpus, contrasted with **0% determinism** for pure LLM and schema-constrained LLM baselines, and reports **verifiable execution traces**, **O(n)** rule scaling, and explicit **security boundaries** (e.g., prompt injection treated as data in the symbolic core).

VideoText.io is a **commercial deployment of the same architectural discipline** in a different domain (professional video and timed text). The product’s backbone is an explicit **upload → validate → queue → worker → download** pipeline with tier-aware orchestration. **Deterministic, non-LLM stages** (FFmpeg-based media transforms, deterministic transcript normalization, structured exports keyed off fixed segments, deterministic cache keys) bound the **repeatable, customer-facing artifacts**. **Optional LLM features** (e.g., transcript summary, chapter titling from timestamped segments) are **computed only after** the primary timed transcript exists and are **stored and delivered as separate fields**, so they **do not redefine** the core subtitle/transcript payload that customers treat as authoritative for editing, compliance-style review, or downstream automation. Separately, **purely rule-based product logic** (e.g., in-app guidance triggers) is implemented **without AI**, mirroring the paper’s emphasis on **traceable, reproducible decision paths** where human operators expect stability. On raw throughput, the same production pipeline processes long-form video at roughly **47× realtime** on a representative nearly-two-hour file — a **measured, code-instrumented benchmark**, not a marketing estimate — showing the deterministic discipline below did not cost commercial performance.

The applicant has independently applied the same discipline to a **second, unrelated system**: VideoText.io's internal business-analytics platform, which defines a single canonical, governed metric layer, separates a deterministic system of record (Postgres/Stripe) from an explicitly-labeled probabilistic layer (browser session analytics), and requires every canonical field to pass reconciliation against the raw system of record with **zero unexplained discrepancies** before any dashboard may read from it. This is not a second scholarly contribution — it is corroborating evidence that the paper's central methodology (a governed deterministic core with clearly bounded, non-authoritative probabilistic layers) is a **repeatable engineering judgment**, applied a second time, on the applicant's own initiative, in production.

Neural automatic speech recognition (Whisper-class models) is **not** the paper’s symbolic rule engine; spoken audio lacks a closed finite pattern inventory like templated contracts. The honest linkage for immigration purposes is therefore **not** “the SaaS re-runs the contract engine,” but rather: **(i)** the applicant’s **peer-reviewed framework** establishes execution-invariance and auditability as first-class engineering constraints for LLM-containing systems; **(ii)** VideoText.io applies those constraints **where production reality allows** (deterministic media and text processing, explicit pipeline ordering, non-mutating generative add-ons, reproducible caching), **and reapplies them independently** in its analytics architecture; **(iii)** **paying customers** demonstrate **field-level significance** that purely academic artifacts cannot, by showing the same researcher ships **defensible hybrid AI systems** under real latency, privacy, billing, and support obligations.

---

## One-page mapping (paper concept → product implementation)

| **Paper concept** | **Role in the framework** | **VideoText.io analogue (production)** |
|-------------------|----------------------------|----------------------------------------|
| Deterministic execution boundary | All authoritative state transitions and structured outputs live inside a verifiable layer. | FFmpeg pipelines (extract, merge, burn, compress); deterministic transcript post-processing (`transcriptFormatter` — no LLM); structured exports built from fixed segment lists. |
| Formal execution identity \(S = (D, R, \theta, \sigma)\) | Identical execution state ⇒ identical deterministic outputs. | Result cache keyed by **user + content hash + tool type + sorted options** (`computeOptionsHash`), so repeat jobs with identical inputs resolve to the same cached artifact when enabled. |
| Stochastic layer as post-hoc explainer | LLM cannot introduce or change deterministic classifications. | **Transcript text and segments are materialized first**; optional **summary / chapters** run afterward and attach as **separate metadata** (including **deferred** summary when Redis is available so the primary download path stays transcript-first). Chapter generation is constrained to **timestamps present in deterministic segment input**. |
| Traceability / auditability | Every decision attributable to logic and input spans. | Timestamped segments, JSON exports, job and request identifiers, operational logging — suitable for professional workflows that require **accountability** of outputs. |
| Rule-based deterministic control | Pattern logic without stochastic decoding. | **Rule-based, deterministic in-app triggers** (e.g., Tex workflow suggestions: no model inference). |
| Domain note in paper | Framework described as domain-agnostic; contract study is evaluation, not the only application. | VideoText extends the **engineering pattern** to **media and timed-text pipelines**, where reproducibility applies to **encoding, formatting, exports, and orchestration**, while ASR remains a known stochastic component bounded by the pipeline contract above. |

---

## A second, independent application of the same engineering discipline

Criterion 3 is strengthened when the same original methodology recurs in an independent setting — it shows transferable engineering judgment, not a single publication-shaped result. Separate from the media pipeline mapped above, the applicant designed and is deploying a canonical business-analytics architecture governing every product and revenue metric VideoText.io reports.

- **Same core pattern, different domain.** The analytics architecture separates a single deterministic system of record (Postgres for identity/usage, Stripe for money) from a probabilistic, explicitly-labeled layer (browser session analytics), and requires every metric to resolve to exactly one canonical definition, one source, one code path — the same structural move as the paper’s deterministic/stochastic boundary.
- **Independently measured, not just designed.** The canonical layer was validated field-by-field against the raw system of record before any dashboard was allowed to read from it, with every reconciled field passing with **zero unexplained discrepancies** — an empirical traceability check in the same spirit as the paper’s measured 100% traceability result, here applied to a live commercial system.
- **Governed, not one-time.** New metrics require a documented definition, declared source, owner, and automated validation rule before shipping; any judgment-dependent metric (e.g., model-derived LTV, allocation-dependent margin) is explicitly labeled at reduced confidence rather than presented with false precision — the same intellectual honesty about the boundary of deterministic guarantees that the paper insists on.

This second application is offered as **corroborating evidence of originality and consistent engineering judgment**, not as a second scholarly contribution — the applicant reapplying the peer-reviewed framework's central idea a second time, on a different system, at his own initiative, in production.

---

## Why this supports “major significance” for Criterion 3

1. **Originality (research):** The ICCS work is not a prompt tweak; it is a **reproducibility-first execution model** with **empirical measurement** of determinism, traceability, variance, and cost, including **negative results** for “structured output” LLM baselines that still fail execution invariance.

2. **Significance (industry):** VideoText.io converts that research mindset into **shipping software** with **subscriptions and usage metering**, proving the applicant can operationalize hybrid AI systems **beyond a lab benchmark** — a relatively rare combination in O-1A filings that often show **either** publications **or** a product, **not** a coherent bridge between the two. That the applicant then **independently re-applied** the same governed-determinism methodology to a second, unrelated system — reaching a measured zero-unexplained-discrepancy reconciliation result without being asked to — indicates repeatable engineering judgment, and the production pipeline’s own throughput (**~47× realtime**, measured) shows the discipline was applied without sacrificing commercial performance. **Independent distribution and review channels reinforce field recognition:** the product is **featured on IndieHunt**, carries a **Fazier** badge / listing, and is **published on G2 and Capterra**, which are widely used by buyers to evaluate software—evidence that the contribution sits in the **commercial marketplace**, not only in a private deployment.

3. **Integrity for adjudication:** The strongest argument is **architectural and professional continuity** (deterministic cores where feasible, explicit boundaries for generative layers, traceable artifacts, production hardening), **plus** the paper’s **quantitative guarantees in its evaluated domain**. Claiming VideoText reproduces the paper’s **100% determinism** for **speech transcription** would be inaccurate and should **not** be asserted; the accurate claim is **controlled hybrid design and commercial proof of impact** grounded in the same research-led engineering philosophy.

---

## Third-party recognition (exhibit checklist)

Use this block when assembling Criterion 3 evidence; keep URLs current on the exhibit cover sheet.

| Channel | Claim in this document | Suggested exhibit |
|--------|-------------------------|-------------------|
| IndieHunt | Featured listing / feature placement for VideoText.io | Screenshot or link to the IndieHunt feature page |
| Fazier | Fazier badge or product page | Screenshot of badge on site and/or Fazier product URL |
| G2 | Published product profile | G2 product page URL + screenshot |
| Capterra | Published product profile | Capterra product page URL + screenshot |

---

*Prepared as a concise technical exhibit for counsel; last regenerated 2026-08-08. Attach the camera-ready PDF. The operational snapshot above is current as of the regeneration date — refresh it from the live dashboard immediately before filing. Add redacted revenue and subscriber-count figures only as a separate exhibit if counsel approves.*
