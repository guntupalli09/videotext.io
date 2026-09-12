/**
 * SEO entry point: /subtitle-grammar-fixer
 * Reuses FixSubtitles. No duplicate logic.
 */
import FixSubtitles from '../FixSubtitles'

// A/B title/meta variants (swap with seoRegistry.ts):
// V1 "correct this caption" — H1: Broken Caption? Fix SRT Timing & Text Fast | Intro: Your caption file has bad timecodes or typos and a deadline. Upload SRT/VTT, get overlaps, CPS errors, and grammar fixed. Ready for platform QC.
// V2 "srt fixer" — H1: SRT Fixer — Repair Overlaps, Drift & CPS Errors | Intro: SRT rejected at upload? Fix overlapping cues, timing drift after re-encode, CPS violations, and line breaks. Upload, download a clean file.
// V3 "subtitle fixer" — H1: Subtitle Fixer for Bad Timings & Text Errors | Intro: Overlapping cues, wrong line breaks, or QC rejection? Upload SRT or VTT, fix timing and caption text in one pass. Works before platform upload.
// V4 "correct my caption" (active) — see props below

const WHAT_THIS_FIXES = [
  {
    name: 'Overlapping timecodes',
    before: 'Cue 142 ends at 00:14:02,800 but cue 143 starts at 00:14:02,200 — the player shows both lines at once.',
    after: 'The earlier cue is trimmed to end 100 ms before the next start; both cues remain readable without a double stack.',
  },
  {
    name: 'Negative or zero durations',
    before: 'End time 00:03:11,500 is before start 00:03:11,900 — validators reject the file outright.',
    after: 'The end time is pushed forward to at least 0.5 s after the start (or 1.5 s when Fix timing is on and text length requires it).',
  },
  {
    name: 'CPS over the 21 char/s scan threshold',
    before: 'A 0.8 s cue carries 28 characters — Netflix-style QC flags it as unreadable.',
    after: 'With Fix timing enabled, display time extends toward 1.5 s where the next cue allows, bringing CPS back under the scan limit.',
  },
  {
    name: 'Orphaned line breaks mid-sentence',
    before: '"We need to finish the" on line 1 and "project by Friday" on line 2 with no semantic break.',
    after: 'Line breaks (CPL) re-wraps at word boundaries up to 42 characters per row so each line is a readable phrase.',
  },
  {
    name: 'Missing sentence capitalization',
    before: '"and then we shipped it" starts lowercase after a hard cut — looks like a machine export.',
    after: 'Grammar fix sentence-cases cue openings and adds terminal punctuation without changing spoken wording.',
  },
  {
    name: 'Stray speaker labels in body text',
    before: 'Auto-transcription left "SPEAKER_00:" inside the caption line instead of a clean prefix.',
    after: 'Bracketed or colon-style labels stay on the cue; grammar fix normalizes casing around them but does not strip intentional diarization markers.',
  },
]

const LIMITS_NOT_INCLUDED = [
  'Does not re-transcribe audio or invent dialogue for silent gaps — large gaps (>5 s) are reported, not filled in.',
  'Does not translate cues; use Translate Subtitles for language versions, then return here for CPS cleanup.',
  'Does not burn captions into video — download SRT/VTT only unless you continue on Burn Subtitles.',
  'Scene-cut warnings need an optional video upload for context; the fixer will not split a cue at a cut without that signal.',
  'Client-specific CPS targets stricter than 21 char/s (e.g. Netflix 17) may still need manual review after the automatic pass.',
  'Batch multi-file queues require a paid plan; this page runs one subtitle file per job.',
]

const FAQ = [
  {
    q: 'Does the fixer preserve my timestamps when nothing is wrong?',
    a: 'Yes. Cues with valid start/end times and no overlap are left unchanged. Timestamps are only adjusted when you enable Fix timing and the scan finds an overlap, zero/negative duration, or a cue that reads faster than 21 characters per second.',
  },
  {
    q: 'What CPS limit does the scan use?',
    a: 'Validation flags cues above 21 characters per second and lines longer than 42 characters per row. When Fix timing is on, short cues with too much text get extended toward a 1.5-second minimum where the next cue allows it. Stricter brief limits may need a second pass with the free character checker.',
  },
  {
    q: 'Does it accept both SRT and VTT?',
    a: 'Yes. Upload either format; the download matches what you uploaded. WebVTT headers are preserved where the parser already supports them.',
  },
  {
    q: 'What happens to speaker labels like [JOHN] or >>?',
    a: 'Speaker prefixes stay on the same cue. Grammar fix may normalize casing inside the line but does not remove labels. Turn Grammar fix off if you only need CPL or timing repairs.',
  },
  {
    q: 'Can I batch-fix multiple subtitle files?',
    a: 'This page processes one file per job. Multi-file batch export is on paid plans. For one urgent rejection, upload → fix → download is usually under two minutes.',
  },
  {
    q: 'Which checkboxes should I turn on for a rejected upload?',
    a: 'Overlaps are always repaired. Add Fix timing for reading-speed or invalid-duration errors. Add Line breaks (CPL) for long single-line cues. Add Grammar fix for capitalization, punctuation, and spelling.',
  },
  {
    q: 'Will grammar fix rewrite my dialogue?',
    a: 'No. It corrects spelling, homophones, casing, and punctuation only — not meaning. If the AI pass is unavailable, a local fallback applies sentence case and terminal punctuation.',
  },
  {
    q: 'How is this different from /fix-subtitles?',
    a: 'Same tool and pipeline. This URL targets caption-QC and grammar-fix searches; /fix-subtitles is the primary product page. Outputs are identical.',
  },
]

export default function SubtitleGrammarFixerPage() {
  return (
    <FixSubtitles
      seoH1="Caption Won't Upload? Fix Timing & Grammar Now"
      seoIntro="Your SRT or VTT failed platform QC — overlapping cues, CPS violations, or mangled text. Upload the file, choose what to repair, download a corrected track. Same engine as Fix Subtitles; 3 imports/mo on the free plan."
      whatThisFixes={WHAT_THIS_FIXES}
      limitsNotIncluded={LIMITS_NOT_INCLUDED}
      faq={FAQ}
    />
  )
}
