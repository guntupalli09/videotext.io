# Chrome Web Store listing — Fix SRT — VideoText

Paste-ready fields for the Chrome Web Store console. Keywords come from VideoText’s own Fix SRT / Fix Subtitles SEO cluster and live alias titles (`fix-subtitles`, `subtitle-grammar-fixer`, `subtitle-timing-fixer`, `subtitle-validation`). Every term below is something the shipped engine actually does.

Do **not** paste a comma-separated keyword dump. Chrome rejects stuffing.

---

## Chrome Web Store form (paste these)

### Title from package (45-character limit)

Set in `manifest.json` `name`. **29 characters.**

```
Fix SRT Subtitles — VideoText
```

Why this name: keeps the product name **Fix SRT**, adds the head term **Subtitles**, and keeps **VideoText**. That covers CWS queries like “fix srt”, “fix subtitles”, and “srt subtitles”.

### Summary from package (132-character limit)

Set in `manifest.json` `description`. **120 characters.**

```
SRT fixer for subtitle and caption files: overlapping cues, timing, line breaks, and grammar. Uses your VideoText account.
```

### Description* (paste into the 16,000-character box)

```
Fix SRT Subtitles — VideoText is an SRT fixer for people who already have a subtitle or caption file and need it repaired before upload.

Use it when YouTube, Vimeo, or another platform rejects your SRT for overlapping cues, bad subtitle timing, long lines, or caption grammar. Drop the .srt file into the extension, choose optional fixes, and download a reconstructed SRT. Your original file stays on your computer.

This is the same Fix SRT / Fix Subtitles engine as videotext.io/fix-subtitles — not a second tool and not a video transcriber.

What this SRT fixer does
• Fix overlapping subtitles and overlapping cues (always on)
• Re-index SRT cues in start-time order
• Optional subtitle timing cleanup: clamp long cues, correct invalid durations, and extend cues that read too fast (CPS / reading speed)
• Optional subtitle line-break fixer (42-character CPL wrap)
• Optional filler-word cleanup (um, uh, like, you know)
• Optional subtitle grammar and spelling pass for captions
• SRT validation report: overlaps, long lines, reading speed, invalid timing, and large gaps

What this extension does not do
• It does not generate SRT from video or transcribe audio
• It does not auto-sync subtitles to a video
• It does not invent cues for large gaps
• It does not repair every malformed timestamp — invalid blocks are skipped
• It does not convert encoding or remove duplicate cues

Who it is for
Captioners, subtitle editors, YouTube creators, and publishers who need an SRT subtitle fixer after a QC rejection — overlapping timestamps, caption timing, line length, or grammar — without opening a full NLE.

How it works
1. Drag and drop your .srt file (or select an SRT file)
2. Review filename, cue count, and validation warnings
3. Optionally enable fix timing, line breaks, filler removal, or grammar
4. Sign in to VideoText and run Fix SRT
5. Preview the corrected subtitles and download the fixed SRT

Account and limits
A VideoText account is required to run Fix SRT and download. Free-plan import limits, watermarks, and paid-plan rules are enforced by VideoText. The extension does not bypass them.

Website: https://videotext.io
Fix SRT on the web: https://videotext.io/fix-subtitles
Support: https://videotext.io
Privacy: https://videotext.io/privacy
```

### Category*

**Productivity**

(Closest official category for a single-purpose file utility. Do not use Accessibility unless you later add live captions. Do not use Developer Tools.)

### Language*

**English (United States)**

Add more locales later only if you ship translated UI. Listing in extra languages without a translated extension can look like stuffing.

---

## Keyword strategy (indexed via name + summary + description)

Chrome Web Store has no separate keywords field. Search uses the **name**, **short description**, and **long description**.

| Query family | In-repo source | Used in listing | Honest? |
|--------------|----------------|-----------------|---------|
| fix srt / Fix SRT | Product name, `docs/seo-keyword-clusters-by-tool.md` | Name, description | Yes |
| srt fixer | `seoRegistry.ts` A/B title “SRT Fixer” | Summary, description | Yes |
| subtitle fixer / fix subtitles | Registry A/B + GSC query `fix subtitle(s)` | Name, description | Yes |
| overlapping cues / overlapping subtitles | Cluster + timing-fixer page | Summary, description | Yes — always-on overlap trim |
| subtitle timing / SRT timing / fix timing | Cluster + `/subtitle-timing-fixer` | Summary, description | Yes — optional `fixTiming` |
| subtitle grammar / caption grammar | `/subtitle-grammar-fixer` (GSC clicks) | Summary, description | Yes — optional `grammarFix` |
| SRT validation / subtitle validation | `/subtitle-validation` | Description | Yes — issues/warnings report |
| line breaks / CPL | `/subtitle-line-break-fixer` | Summary, description | Yes — optional wrap |
| reading speed / CPS | Grammar-fixer copy | Description | Yes — detected; timing extend if opted in |
| captions / caption file | Grammar-fixer “caption” intent | Summary, description | Yes — SRT captions, not burned-in |
| YouTube SRT / YouTube captions | Intended upload destination | Description | Yes as a use case, not as YouTube API access |

**Do not add** (not implemented or misleading):

- subtitle sync / re-sync to video
- generate SRT from video / video to subtitles / transcribe
- encoding fixer / UTF-8 repair
- duplicate cue remover
- VTT in this extension (website accepts VTT; the extension is `.srt` only)

---

## Limits

| Field | Limit | Our copy |
|-------|-------|----------|
| Name | 45 | 29 (`Fix SRT Subtitles — VideoText`) |
| Short description | 132 | 120 |
| Detailed description | 16,000 | ~2,200 — enough for retrieval, not stuffed |

---

## Website / support / privacy

- Website: https://videotext.io
- Support: https://videotext.io
- Privacy: https://videotext.io/privacy

## Suggested screenshots

1. Idle drop zone — “Fix SRT”, drag-and-drop, Select SRT File.  
   Caption: SRT fixer for overlapping subtitles and caption timing.
2. File selected — filename, cue count, optional fixes.  
   Caption: Review the SRT, then fix timing, line breaks, or grammar.
3. Sign in — VideoText account required.  
   Caption: Sign in to VideoText. Import limits still apply.
4. Result — findings + preview + Download Fixed SRT.  
   Caption: Preview corrected subtitles and download the fixed SRT.
5. Quota — upgrade to VideoText pricing.  
   Caption: Free-plan limits are enforced by VideoText.

Screenshot captions can include one intent phrase each. Do not tile keywords on the image.
