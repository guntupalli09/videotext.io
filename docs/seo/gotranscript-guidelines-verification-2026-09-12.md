# GoTranscript guidelines verification

**Verified against:** [GoTranscript Transcription Guidelines](https://gotranscript.com/transcription-guidelines)  
**Fetched:** 2026-09-12 (Cloud Agent)  
**Next review due:** 2026-12-12 (quarterly)  
**Scope:** `GOTRANSCRIPT_DATA` (`client/src/data/brandGuidelineData.ts`), GoTranscript entries in `seoRegistry.ts`, `gotranscript` preset in `guidelineFormatPresetData.ts`

---

## Executive summary

Our **SEO pages** (`GOTRANSCRIPT_DATA` + registry FAQ) contain several **material errors** vs GoTranscript’s published transcriber guidelines. The **Guideline Format preset** (`guidelineFormatPresetData.ts`) is partially aligned on clean-verbatim/slang rules but **contradicts the SEO pages** on timestamps and inaudible tags.

**Do not publish spoke pages until SEO data is corrected.** Spoke content should be written from this document + primary source, not copied from `GOTRANSCRIPT_DATA` as-is.

**Internal split-brain (fix together):**

| Topic | SEO (`brandGuidelineData`) | Tool preset (`guidelineFormatPresetData`) | Official GoTranscript |
|-------|---------------------------|-------------------------------------------|------------------------|
| Timestamps | Mandatory `[HH:MM:SS]` every speaker change | “Not included by default” | Job-dependent: every 2 min **or** every speaker change; test job = **no timestamping** |
| Inaudible | `[inaudible H:MM]` | `[inaudible]` (no time) | `[inaudible 00:00:00]` (full `HH:MM:SS`, bold) |
| Crosstalk | Treat as `[inaudible]` | (not specified) | `[crosstalk]` — separate tag |
| Numbers | Numerals except sentence start | (not in preset) | Spell out 0–9; numerals 10+ |

---

## Official source notes (primary)

GoTranscript publishes a single transcriber guideline page with an **update log** (e.g. 2019-11-18 no `[sic]`; 2020-04-22 keep “Oh”; 2022-03-09 speaker separation / `?Speaker` labels). Key rules:

### Verbatim types
- **Full verbatim (FV):** speech errors, false starts, fillers, slang, stutters, repetitions kept (with listed exceptions for mm-hmm / uh-huh).
- **Clean verbatim (CV):** remove speech errors, false starts (unless add info), stutters, repetitions (keep emphasis repetitions), fillers per context; **keep** “Oh…” expressions; **expand slang** (gonna → going to, etc.); yeah/yep → yes; Okay never OK/Ok.

### Timestamps
- Format: `[00:00:00]` — **always bold**.
- Types: **every 2 minutes** OR **every time the speaker changes** (per job/client).
- File-relative: if transcribing minutes 20–30, stamps start at 20:00, not 00:00.
- **Test job:** “clean verbatim; **no timestamping needed**” ([same page, bottom](https://gotranscript.com/transcription-guidelines)).

### Inaudible / unclear audio
- **`[inaudible 00:00:00]`** — cannot hear (noise/recording).
- **`[unintelligible 00:00:00]`** — can hear but not understand (accent/manner).
- Do not invent other markings.

### Speaker labels
- **Bold**, colon, single space (no tab): `Mark:`, `Speaker 1:`, descriptive roles (`Interviewer:`, `Host:`).
- Use names when known; `?David` if uncertain who is speaking.
- Always label even single-speaker files.

### Sound events (not crosstalk → inaudible)
- `[crosstalk]`, `[silence]`, `[background noise]`, `[pause 00:00:00]` (>10s), `[laughs]` / `[laughter]`, etc.
- Sound notes: brackets, lowercase, present tense, ≤2 words; timestamps on time-stamped marks only.

### Numbers
- Spell out **single-digit** (zero through nine); numerals for 10+ (with listed exceptions: money, years, percentages, etc.).

### Other material rules we omit or get wrong on SEO pages
- Never use **exclamation marks**.
- Never use `[sic]`.
- Do not correct speakers’ **grammar** (but do use correct spelling for misspoken words).
- Paragraph max ~**500 symbols** (~100 words), not 300–400 characters.
- Double dash `--` for false starts / incomplete sentences; single dash for interruption patterns.
- Accuracy **ratings** 96–100% = editor score 5 — not a published “97% minimum” threshold.

---

## Claim-by-claim audit: SEO layer

Source files: `GOTRANSCRIPT_DATA`, `/gotranscript-*` FAQ blocks in `seoRegistry.ts`.

| # | Our claim (SEO) | Verdict | Official rule | Risk if wrong |
|---|----------------|---------|---------------|---------------|
| 1 | Timestamps required at **every** speaker segment `[HH:MM:SS]` | **PARTIAL** | Required only when job uses “every speaker change” timestamping; alternative is every 2 minutes; test job has **no** timestamping | Missing stamps on timestamped jobs; unnecessary stamps on non-timestamped jobs |
| 2 | Timestamp format `[HH:MM:SS]` | **OK** | `[00:00:00]` equivalent | Low |
| 3 | Timestamps must be **bold** | **MISSING** | Required bold on timestamps, speaker labels, time-stamped tags | QA rejection |
| 4 | Inaudible: `[inaudible H:MM]` e.g. `[inaudible 3:45]` | **WRONG** | `[inaudible 00:00:00]` full HH:MM:SS | Rejection |
| 5 | No `[unintelligible]` distinction | **MISSING** | Separate tag for heard-but-unclear | Wrong tag used |
| 6 | Crosstalk → treat as `[inaudible]` | **WRONG** | Use `[crosstalk]` | Rejection |
| 7 | Speaker labels `Speaker 1:` no brackets | **OK** (format) | Bold + colon + space | Missing bold in plain-text exports |
| 8 | Use names when known | **OK** | Matches | Low |
| 9 | Descriptive roles (Interviewer, Host) | **UNDERSTATED** | Explicitly encouraged | Missed best practice |
| 10 | `?Speaker` when uncertain | **MISSING** | Required since 2022-03-09 | Wrong attribution |
| 11 | Clean verbatim: remove fillers/false starts | **OK** | Matches (with emphasis/context exceptions) | Low |
| 12 | Keep contractions as spoken | **OK** | “Never change spoken contractions” | Low |
| 13 | Style guide FAQ: gonna → going to | **OK** | Clean verbatim slang rule | — |
| 14 | Numbers: numerals except sentence start | **WRONG** | Spell out 0–9; numerals 10+ | Systematic number errors |
| 15 | 97% accuracy minimum | **UNVERIFIED / LIKELY WRONG** | Rating scale 96–100% = score 5; no “97% minimum” on page | Misleading expectations |
| 16 | Test evaluates timestamps | **WRONG** | Test = clean verbatim, **no timestamping** | Test failure from over-formatting |
| 17 | Paragraph break ~300 characters | **WRONG** | ~500 symbols (~100 words) | Formatting rejection |
| 18 | `[music]` notation | **PARTIAL** | Specific sound-event rules; not generic `[music]` | Minor |
| 19 | Pay $0.60–$0.90/min | **UNVERIFIED** | Not on guidelines page | Could be outdated |
| 20 | Passing score 85–90% on test | **UNVERIFIED** | Not stated on guidelines page | Misleading |

---

## Claim-by-claim audit: Guideline Format preset

Source: `client/src/pages/guidelineFormatPresetData.ts` → `gotranscript` preset.

| Rule ID | Preset text | Verdict | Notes |
|---------|-------------|---------|-------|
| `verbatim_full` / `verbatim_clean` / `slang_clean` / `always_keep` | FV/CV/slang/Oh rules | **Mostly OK** | Aligns with official clean/FV sections |
| `contractions` | Keep y'all, don't, etc. | **OK** | Matches official |
| `speaker_labels` | Names, roles, drop titles | **OK** | Missing bold + `?Speaker` uncertainty |
| `inaudible_tag` | `[inaudible]` | **WRONG** | Must be `[inaudible 00:00:00]`; add `[unintelligible 00:00:00]` |
| `timestamps` | “Not included by default” | **OK** (default jobs) | **Conflicts with SEO pages** saying mandatory |
| `sound_events` | [laughs], [laughter], etc. | **PARTIAL** | Missing [crosstalk], [silence], [pause 00:00:00] rules |

---

## Spoke-page readiness (do not publish yet)

| Proposed spoke | Can source from official? | Blockers |
|----------------|---------------------------|----------|
| Timestamp format | Yes — §Timestamping types | Fix SEO claims; document job-dependency + bold + file-relative time |
| Speaker labels | Yes — §13 | Add bold, `?Speaker`, role examples |
| Inaudible / unintelligible tags | Yes — §1 | Replace `[inaudible H:MM]` everywhere |
| Verbatim / clean rules | Yes — FV/CV sections | Align numbers + crosstalk + test-job note |

**Repurpose candidate:** `/gotranscript-transcription-format` (0 Bing citations) — only after content rewrite from this audit.

**Do not 301:** `/gotranscript-style-guide` (104 citations), `/gotranscript-transcription-rules` (28).

**Hub:** `/gotranscript-guidelines` — add spoke links only; **do not trim** existing content until spokes earn citations (~3 months).

---

## Recommended fix order

1. **Correct `GOTRANSCRIPT_DATA` + registry FAQ** — timestamps (job-dependent), inaudible/unintelligible, crosstalk, numbers, paragraph length, test-job note, remove unverified pay/pass-rate claims or mark “community report, not official”.
2. **Align `guidelineFormatPresetData` gotranscript preset** — inaudible/unintelligible tags; optional timestamp rule card when client requests.
3. **Add visible “Source & verified date” footer** component for GoTranscript pages linking to official URL + `lastVerified: 2026-09-12`.
4. **Hub link block** to spokes (after spokes exist).
5. **Quarterly review** — re-fetch guidelines page, diff update log, run this checklist, IndexNow changed URLs.

---

## Review cadence (ops)

| Cadence | Action |
|---------|--------|
| **Quarterly** | Re-fetch https://gotranscript.com/transcription-guidelines; check update log at top; update `lastVerified` dates |
| **On GoTranscript update log change** | Full re-audit within 1 week |
| **Before any new GoTranscript URL ships** | Sign-off against this doc + primary source |
| **After preset/SEO fix** | IndexNow submit changed URLs; note in changelog |

**Owner:** SEO/content (no dedicated owner in repo — assign in team).  
**Archive:** Save plain-text snapshot of guidelines page in `docs/seo/sources/gotranscript-transcription-guidelines-2026-09-12.txt` for diff-on-next-review.

---

## Appendix: Official update log (as of 2026-09-12)

From GoTranscript guidelines page header:

- 2019-11-18: Do not use `[sic]` tag  
- 2019-11-25: Simplified number rules  
- 2020-03-05: Fixed grammatical mistakes  
- 2020-04-22: Keep “Oh” regardless of verbatim  
- 2022-03-09: Separate speakers; `?` prefix when speaker uncertain  
