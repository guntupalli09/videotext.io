# ICP Idea Ratings (Codebase Grounded) — 2026-04-22

## Method
- Scored each idea on:
  - **Impact (0–10):** likely lift in activation, retention, paid conversion for creators/teams.
  - **Aha Moment (0–10):** how strongly users feel “this is an unfair advantage”.
- **Final score = (Impact + Aha) / 2**.
- Ratings are grounded in current product gaps and existing capabilities found in the repository.

## Current state snapshot (from grep/code review)
- Product already has transcript branches (summary, chapters, highlights, keywords, clean text, exports), but summary/chapter generation is generic and not content-intent aware.  
- YouTube ingestion exists in backend, but URL mode is currently hidden/temporarily disabled in primary transcript UI and generic URL downloads are disabled in upload route.  
- Collaboration currently supports read-only share links, but no inline comments/review workflows.
- Exports are strong (TXT/SRT/VTT/PDF/DOCX/JSON/CSV/Notion), but “one video → social distribution pack” is not a first-class guided flow.

## Ratings

### 1) Context-aware outputs (podcast/interview/tutorial/talking head/YouTube description mode)
- **Impact: 9/10**
- **Aha moment: 9/10**
- **Final: 9.0/10**
- **Why:** The current summary pipeline uses a generic editorial summarizer prompt, which is useful but not tailored by content format or publishing objective. Adding an explicit output intent layer (or robust inference) would materially improve “first-result quality” and reduce edits, especially for creator workflows.

### 2) Post-transcript content repurposing pack (SEO YouTube description, title ideas, X thread, LinkedIn, blog draft, Shorts/Reels script)
- **Impact: 10/10**
- **Aha moment: 10/10**
- **Final: 10.0/10**
- **Why:** This creates the clearest “unfair advantage” narrative: one upload, multiple publish-ready assets. It compresses the entire post-production content pipeline and directly maps to visible user outcomes (faster shipping, more channels, better consistency).

### 3) Collaboration-friendly workflows (comments on transcript + editor-friendly export)
- **Impact: 7/10**
- **Aha moment: 6/10**
- **Final: 6.5/10**
- **Why:** Comments/review will improve team stickiness and reduce handoff friction. But by itself, it is less “wow” than content multiplication. Editor-friendly export is partly solved already via multiple export formats; biggest missing unlock is collaborative review state (comments, resolved threads, assignments).

### 4) “Drop anything” ingestion (YouTube, Loom, Google Drive, Zoom recordings)
- **Impact: 8/10**
- **Aha moment: 8/10**
- **Final: 8.0/10**
- **Why:** Friction removal increases top-of-funnel completion and repeat usage. Given current URL constraints/disabled states, broadening source ingestion would create immediate perceived ease. Not quite as dramatic as idea #2, but likely a major activation lift.

## Recommended build order for maximum ICP impact
1. **Idea #2 (Repurposing pack)** — fastest route to “unfair advantage” positioning.
2. **Idea #1 (Context-aware generation)** — quality layer that makes #2 outputs feel premium.
3. **Idea #4 (Drop-anything ingestion)** — remove input friction to increase usage volume.
4. **Idea #3 (Collab comments/review)** — strongest after output quality and ingestion are upgraded.

## Suggested v1 scope (tight)
- Add an **“Output Goal” selector** after transcript complete:
  - Podcast show notes
  - Interview recap
  - Tutorial description
  - Talking-head social clip copy
  - YouTube SEO description
- Add **“Generate content pack”** action that returns:
  - 5 YouTube titles (balanced click + clean)
  - 1 SEO description + chapters
  - 1 X/Twitter thread
  - 1 LinkedIn post
  - 1 blog outline (or first draft)
  - 3 shorts scripts with timestamp hooks
- Add source connectors in this sequence:
  1) YouTube stable re-enable
  2) Loom public URLs
  3) Drive file links
  4) Zoom cloud recording links

## KPI hypotheses to validate
- **Activation:** % users who reach “first meaningful output” within one session.
- **Aha proxy:** % transcripts with at least one generated “content pack” asset.
- **Distribution depth:** avg assets exported per processed video.
- **Retention:** D7 repeat usage for users who generated multi-asset packs vs transcript-only users.
