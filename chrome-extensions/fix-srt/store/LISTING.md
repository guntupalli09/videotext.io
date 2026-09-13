# Chrome Web Store listing — Fix SRT — VideoText

Chrome Web Store item name limit is 45 characters. **Fix SRT — VideoText** is 20 characters (including spaces and the em dash). No length issue.

Short description limit is 132 characters. Draft below is 118.

## Extension name

Fix SRT — VideoText

## Short description

Repair SRT subtitle files: overlapping cues, timing, line length, and optional grammar. Uses your VideoText account.

## Detailed description

Fix SRT — VideoText repairs existing SubRip (.srt) subtitle files using the same VideoText backend as videotext.io/fix-subtitles.

Drop an SRT into the extension, review file details, then run Fix SRT. VideoText reconstructs a new file. Your original stays on your computer.

What this extension actually does:

- Always resolves overlapping cues and re-indexes cues in start-time order
- Optionally clamps or extends cue timing (long cues, zero/negative duration, too-fast reading speed)
- Optionally wraps lines longer than 42 characters
- Optionally removes filler words such as um, uh, like, and you know
- Optionally runs VideoText’s server-side grammar and spelling pass
- Reports findings the backend already returns (overlaps, long lines, reading speed, invalid timing, large gaps)

What it does not do:

- It does not transcribe audio or video
- It does not invent cues for large gaps
- It does not repair every malformed timestamp — invalid blocks are skipped
- It does not fix file encoding
- It does not remove duplicate cues
- It does not automatically re-sync subtitles to a video

You need a VideoText account. Free-plan import limits, watermarks, and paid-plan rules are enforced by the VideoText API. This extension does not bypass them.

Website: https://videotext.io
Support: https://videotext.io
Privacy policy: https://videotext.io/privacy

## Actual supported fixes

Verified in `server/src/services/subtitles.ts`:

1. Overlap trim
2. Cue re-indexing
3. Optional timing normalize / invalid timing / fast-reading extension
4. Optional 42-character line wrap
5. Optional filler removal
6. Optional AI grammar/spelling (`gpt-4o-mini`) with a local punctuation/casing fallback

## Intended users

Editors, captioners, and publishers who already have an SRT and need a structural cleanup before upload (YouTube, Vimeo, NLE, LMS).

## Verified capabilities

- Drag and drop or file picker for `.srt`
- Client-side rejection of empty, non-SRT, and timestamp-less files
- Authenticated upload to `POST /api/upload` with `toolType=fix-subtitles`
- Job status via `GET /api/job/:id`
- Preview of the reconstructed SRT
- Download of the fixed file returned by VideoText
- Usage check via `GET /api/usage/current`
- Upgrade link to https://videotext.io/pricing when free imports are exhausted

## Website URL

https://videotext.io

## Support URL

https://videotext.io

## Privacy policy URL

https://videotext.io/privacy

## Suggested screenshots

1. **Idle drop zone** — heading “Fix SRT”, supporting copy, drag-and-drop target, Select SRT File.
   Caption: Drop an SRT to repair overlapping cues and other supported issues.

2. **File selected** — filename, cue count, optional warnings, unchecked fix options, Fix SRT button.
   Caption: Review the file, then choose optional timing, line-break, filler, or grammar fixes.

3. **Signed-out state** — Sign in to VideoText form above a selected file.
   Caption: Sign in with your VideoText account. Import limits still apply.

4. **Result** — findings chips, monospaced preview, Download Fixed SRT and Fix Another SRT.
   Caption: Preview the reconstructed file and download the fixed SRT.

5. **Quota** — upgrade required copy and button to VideoText pricing.
   Caption: Free-plan limits are enforced by VideoText, not bypassed in the extension.

Do not add unrelated keyword lists to screenshots or the description.
