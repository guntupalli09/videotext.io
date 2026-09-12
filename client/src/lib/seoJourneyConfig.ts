export type SeoJourneyLink = { label: string; href: string }

export type SeoJourneyBannerData = {
  kicker: string
  title: string
  body: string
  steps?: { title: string; detail: string }[]
  primary: SeoJourneyLink
  secondary?: SeoJourneyLink[]
}

const TRANSCRIPT_STEPS = [
  { title: 'Get the recording', detail: 'Download MP4/MOV from Zoom, Meet, Loom, or your editor — upload the file here.' },
  { title: 'Upload on Video to Transcript', detail: 'Whisper large-v3 turns speech into text plus SRT/VTT, summary, and chapters.' },
  { title: 'Download and continue', detail: 'Format to a client guide, fix captions, or translate the SRT — files deleted after processing.' },
]

const SUBTITLE_STEPS = [
  { title: 'Upload the video', detail: 'MP4, MOV, or WebM. This page is the entry — not a dead-end download.' },
  { title: 'Get timed SRT or VTT', detail: 'Whisper large-v3 writes cues. Free: 3 imports/mo, no card.' },
  { title: 'Fix, translate, or burn', detail: 'Continue on the matching core tool. CapCut/editor pages stay the entry; burn/fix/translate are the exits.' },
]

/** Utility-tool exit funnel: convert/merge/shift → validate → grammar fixer → generate SRT. */
const UTILITY_TOOL_EXIT_STEPS = [
  { title: 'Finish on this page', detail: 'Convert, merge, or shift — download the output file when done.' },
  { title: 'Validate', detail: 'Run Subtitle Validator for overlaps, timecodes, and format errors.' },
  { title: 'Auto-fix QC', detail: 'Subtitle Grammar Fixer repairs CPL, CPS, overlaps, and grammar in one pass.' },
  { title: 'Need SRT from video?', detail: 'Use Video to SRT to transcribe source video with Whisper — same platform.' },
]

/** Shared QC workflow steps — exit is always Subtitle Grammar Fixer. */
const SUBTITLE_QA_STEPS = UTILITY_TOOL_EXIT_STEPS

const GRAMMAR_FIXER_EXIT = '/subtitle-grammar-fixer'

const ALT_TO_TRANSCRIPT: SeoJourneyBannerData = {
  kicker: 'Skip the comparison — use the tool',
  title: 'Upload once → transcript + SRT + summary',
  body: 'Problem: you need words from a video upload, not another feature matrix. Three steps on Video to Transcript.',
  steps: TRANSCRIPT_STEPS,
  primary: { label: 'Open Video to Transcript', href: '/video-to-transcript' },
  secondary: [
    { label: 'Video to Subtitles', href: '/video-to-subtitles' },
    { label: 'Fix Subtitles', href: '/fix-subtitles' },
  ],
}

const ALT_TO_SUBTITLES: SeoJourneyBannerData = {
  kicker: 'Skip the comparison — use the tool',
  title: 'Video → timed SRT/VTT in three steps',
  body: 'Problem: you need a caption file (or the next step), not a full editor. Start on Video to Subtitles.',
  steps: SUBTITLE_STEPS,
  primary: { label: 'Open Video to Subtitles', href: '/video-to-subtitles' },
  secondary: [
    { label: 'Fix Subtitles', href: '/fix-subtitles' },
    { label: 'Translate', href: '/translate-subtitles' },
    { label: 'Burn', href: '/burn-subtitles' },
  ],
}

/** Professional subtitle-QA cluster — context-specific copy, shared steps, grammar-fixer exit. */
const SUBTITLE_QA_JOURNEYS: Record<string, SeoJourneyBannerData> = {
  '/tools/ttml-to-srt': {
    kicker: 'TTML convert → QC pass',
    title: 'Converted SRT often fails CPL or overlap checks next',
    body: 'Problem: Netflix and broadcast TTML converts cleanly — then Premiere or platform QC flags line length and stacked cues you did not see in XML.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix timing, CPL & grammar in one pass', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Character limit checker', href: '/tools/subtitle-character-checker' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/tools/subtitle-character-checker': {
    kicker: 'CPL scan → bulk repair',
    title: 'Flagged cues over the CPL limit? Fix them in one pass',
    body: 'Problem: you counted characters cue by cue — now dozens fail Netflix or BBC line limits and manual re-wrap will take all afternoon.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Auto-wrap lines & fix CPS', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Subtitle validator', href: '/tools/subtitle-validator' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/subtitle-character-checker': {
    kicker: 'CPL scan → bulk repair',
    title: 'Flagged cues over the CPL limit? Fix them in one pass',
    body: 'Problem: you counted characters cue by cue — now dozens fail Netflix or BBC line limits and manual re-wrap will take all afternoon.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Auto-wrap lines & fix CPS', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Subtitle validator', href: '/tools/subtitle-validator' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/tools/subtitle-validator': {
    kicker: 'Validator → auto-fix',
    title: 'Overlaps or CPS errors? Repair the whole file at once',
    body: 'Problem: the validator listed overlaps and reading-speed failures — fixing each timestamp by hand is the wrong use of your rate.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix overlaps, timing & lines', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Character limit checker', href: '/tools/subtitle-character-checker' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/subtitle-validator': {
    kicker: 'Validator → auto-fix',
    title: 'Overlaps or CPS errors? Repair the whole file at once',
    body: 'Problem: the validator listed overlaps and reading-speed failures — fixing each timestamp by hand is the wrong use of your rate.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix overlaps, timing & lines', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Character limit checker', href: '/tools/subtitle-character-checker' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/tools/subtitle-reading-speed': {
    kicker: 'CPS scan → bulk repair',
    title: 'Cues over 20 CPS will fail TTSC-style delivery',
    body: 'Problem: the reading-speed report flagged dense cues — extending display time by hand creates overlaps at the next boundary.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix reading speed & overlaps', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Character limit checker', href: '/tools/subtitle-character-checker' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/subtitle-reading-speed': {
    kicker: 'CPS scan → bulk repair',
    title: 'Cues over 20 CPS will fail TTSC-style delivery',
    body: 'Problem: the reading-speed report flagged dense cues — extending display time by hand creates overlaps at the next boundary.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix reading speed & overlaps', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Character limit checker', href: '/tools/subtitle-character-checker' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/tools/subtitle-word-counter': {
    kicker: 'CPS report → repair',
    title: 'High CPS lines in the report will fail platform QC',
    body: 'Problem: the word count looks fine but characters-per-second on dense cues will get rejected — extending display time manually fights the next overlap.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix reading speed & overlaps', href: GRAMMAR_FIXER_EXIT },
    secondary: [{ label: 'Reading speed checker', href: '/tools/subtitle-reading-speed' }],
  },
  '/subtitle-word-counter': {
    kicker: 'CPS report → repair',
    title: 'High CPS lines in the report will fail platform QC',
    body: 'Problem: the word count looks fine but characters-per-second on dense cues will get rejected — extending display time manually fights the next overlap.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Fix reading speed & overlaps', href: GRAMMAR_FIXER_EXIT },
    secondary: [{ label: 'Reading speed checker', href: '/tools/subtitle-reading-speed' }],
  },
  '/tools/merge-srt-files': {
    kicker: 'Merge → validate → fix → generate',
    title: 'Merged tracks often stack cues at the join',
    body: 'Problem: combining forced narrative + main subs sorted the rows — overlap errors at the merge boundary will fail upload validators.',
    steps: UTILITY_TOOL_EXIT_STEPS,
    primary: { label: 'Validate merged file', href: '/tools/subtitle-validator' },
    secondary: [
      { label: 'Auto-fix QC', href: GRAMMAR_FIXER_EXIT },
      { label: 'Convert video to SRT', href: '/video-to-srt' },
    ],
  },
  '/subtitle-line-break-fixer': {
    kicker: 'Line breaks → full QC',
    title: 'Long lines fixed — still have overlaps or CPS failures?',
    body: 'Problem: CPL pass alone does not clear overlapping timecodes or reading-speed rejects — you need timing repair on the same file.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Run full timing & grammar pass', href: GRAMMAR_FIXER_EXIT },
    secondary: [{ label: 'Fix Subtitles (primary URL)', href: '/fix-subtitles' }],
  },
  '/subtitle-grammar-fixer': {
    kicker: 'QC cluster exit — you are here',
    title: 'Upload below — overlaps, CPS, and grammar in one job',
    body: 'Problem: checkers flagged mechanical failures. Enable Fix timing for CPS/overlaps and Line breaks (CPL) for long rows — overlaps are always repaired.',
    primary: { label: 'Upload & fix this file', href: GRAMMAR_FIXER_EXIT },
    secondary: [
      { label: 'Character checker', href: '/tools/subtitle-character-checker' },
      { label: 'Subtitle validator', href: '/tools/subtitle-validator' },
    ],
  },
}

export const SEO_JOURNEY_BANNERS: Record<string, SeoJourneyBannerData> = {
  ...SUBTITLE_QA_JOURNEYS,
  '/video-to-srt': {
    kicker: 'Video to SRT → full caption hub',
    title: 'Need more than a .srt download?',
    body: 'This page converts video to a timed SRT file. The full product — fix, translate, and burn — lives on Video to Subtitles.',
    primary: { label: 'Open the Video to Subtitles hub', href: '/video-to-subtitles' },
    secondary: [
      { label: 'Translate', href: '/translate-subtitles' },
    ],
  },
  '/capcut-captions': {
    kicker: 'CapCut is the entry — not the finish line',
    title: 'Export CapCut captions, then fix / translate / burn',
    body: 'CapCut captions stay locked in the app. Export the video without burned-in text, generate an SRT here, then leave to the core tools. This page does not compete with Burn Subtitles.',
    steps: [
      { title: 'Export from CapCut', detail: 'MP4 without hardcoded captions so VideoText can write a real SRT/VTT track.' },
      { title: 'Generate SRT here', detail: 'Upload the file. Whisper large-v3 builds timed cues. Free: 3 imports/mo, no card.' },
      { title: 'Exit to a core tool', detail: 'Fix timing/CPS, translate to 70+ languages, or burn open captions on /burn-subtitles.' },
    ],
    primary: { label: 'Generate SRT from this video', href: '/video-to-subtitles' },
    secondary: [
      { label: 'Fix Subtitles', href: '/fix-subtitles' },
      { label: 'Burn Subtitles', href: '/burn-subtitles' },
      { label: 'Translate', href: '/translate-subtitles' },
    ],
  },
  '/loom-transcription': {
    kicker: 'Loom recording → transcript',
    title: 'Upload the Loom MP4 → transcript',
    body: 'Download the Loom MP4, then use Video to Transcript. You also get SRT/VTT, summary, and chapters. Files deleted after processing.',
    steps: TRANSCRIPT_STEPS,
    primary: { label: 'Open Video to Transcript', href: '/video-to-transcript' },
    secondary: [{ label: 'Need captions only?', href: '/video-to-subtitles' }],
  },
  '/vimeo-transcription': {
    kicker: 'Vimeo video → transcript',
    title: 'Upload the Vimeo MP4 → transcript',
    body: 'Download your Vimeo MP4, then use Video to Transcript for text + SRT/VTT + summary + chapters.',
    steps: TRANSCRIPT_STEPS,
    primary: { label: 'Open Video to Transcript', href: '/video-to-transcript' },
    secondary: [{ label: 'Need captions only?', href: '/video-to-subtitles' }],
  },
  '/zoom-meeting-transcript': {
    kicker: 'Zoom recording → transcript',
    title: 'Upload the Zoom MP4 → transcript (no bot)',
    body: 'Download the cloud or local recording, then Video to Transcript. No bot joins the live call.',
    steps: TRANSCRIPT_STEPS,
    primary: { label: 'Open Video to Transcript', href: '/video-to-transcript' },
    secondary: [{ label: 'Need captions only?', href: '/video-to-subtitles' }],
  },
  '/google-meet-transcript': {
    kicker: 'Google Meet recording → transcript',
    title: 'Upload the Meet MP4 from Drive → transcript',
    body: 'Download the recording, then Video to Transcript. No Meet bot, no calendar access.',
    steps: TRANSCRIPT_STEPS,
    primary: { label: 'Open Video to Transcript', href: '/video-to-transcript' },
    secondary: [{ label: 'Need captions only?', href: '/video-to-subtitles' }],
  },
  '/adobe-premiere-captions-alternative': {
    kicker: 'Skip Premiere Speech to Text',
    title: 'Generate SRT in the browser, import back to Premiere',
    body: 'No Adobe subscription required for the caption file. Then fix, translate, or burn if you need a finished MP4.',
    steps: SUBTITLE_STEPS,
    primary: { label: 'Open Video to Subtitles', href: '/video-to-subtitles' },
    secondary: [
      { label: 'Burn Subtitles', href: '/burn-subtitles' },
      { label: 'Fix Subtitles', href: '/fix-subtitles' },
    ],
  },
  '/kapwing-alternative': ALT_TO_SUBTITLES,
  '/zubtitle-alternative': ALT_TO_SUBTITLES,
  '/submagic-alternative': {
    ...ALT_TO_SUBTITLES,
    secondary: [
      { label: 'Burn Subtitles', href: '/burn-subtitles' },
      { label: 'Fix Subtitles', href: '/fix-subtitles' },
    ],
  },
  '/capcut-alternative': {
    kicker: 'CapCut is for in-app overlays',
    title: 'Need an exportable SRT? Start here, then exit',
    body: 'CapCut captions are styled overlays. VideoText writes a real SRT/VTT. Then fix, translate, or burn — this page stays the CapCut entry.',
    steps: SUBTITLE_STEPS,
    primary: { label: 'Open Video to Subtitles', href: '/video-to-subtitles' },
    secondary: [
      { label: 'CapCut → SRT walkthrough', href: '/capcut-captions' },
      { label: 'Burn Subtitles', href: '/burn-subtitles' },
    ],
  },
  '/subtitle-edit-alternative': {
    kicker: 'Generate first, edit later',
    title: 'Create the SRT in the browser — then fix lines and CPS',
    body: 'Subtitle Edit is a desktop editor. VideoText generates the file; Fix Subtitles repairs timing, lines, and reading speed.',
    steps: SUBTITLE_STEPS,
    primary: { label: 'Open Video to Subtitles', href: '/video-to-subtitles' },
    secondary: [{ label: 'Fix Subtitles', href: '/fix-subtitles' }],
  },
  '/youtube-auto-captions-alternative': ALT_TO_SUBTITLES,
  '/otter-alternative': ALT_TO_TRANSCRIPT,
  '/fireflies-alternative': ALT_TO_TRANSCRIPT,
  '/turboscribe-alternative': ALT_TO_TRANSCRIPT,
  '/happyscribe-alternative': ALT_TO_TRANSCRIPT,
  '/rev-alternative': {
    ...ALT_TO_TRANSCRIPT,
    secondary: [
      { label: 'Format to client guidelines', href: '/guideline-format' },
      { label: 'Video to Subtitles', href: '/video-to-subtitles' },
    ],
  },
  '/descript-alternative': ALT_TO_TRANSCRIPT,
  '/hardcoded-captions': {
    kicker: 'Same product as Burn Subtitles',
    title: 'Hardcode / open captions live on /burn-subtitles',
    body: 'Permanently embed SRT or VTT into the video frames. This alias funnels to the canonical burn page so we do not split rankings.',
    primary: { label: 'Burn Subtitles into Video', href: '/burn-subtitles' },
    secondary: [{ label: 'Need an SRT first?', href: '/video-to-subtitles' }],
  },
  '/subtitle-tools': {
    kicker: 'Subtitletools alternative',
    title: 'Browser-local checks + AI SRT generation',
    body: 'Subtitletools.com runs similar free converters in-browser. VideoText adds Whisper SRT generation, translate, burn, and Netflix-style CPL/CPS repair — start with a free check, exit to a core tool.',
    steps: SUBTITLE_QA_STEPS,
    primary: { label: 'Convert video to SRT', href: '/video-to-srt' },
    secondary: [
      { label: 'Subtitle grammar fixer', href: '/subtitle-grammar-fixer' },
      { label: 'Character limit checker', href: '/tools/subtitle-character-checker' },
      { label: 'Netflix TTSC checklist', href: '/netflix-ttsc-checklist' },
    ],
  },
  '/tools/shift-subtitle-timing': {
    kicker: 'Shift → validate → fix → generate',
    title: 'Bulk offset done — check overlaps and CPS next',
    body: 'A global shift can fix sync but may create new overlaps at cue boundaries or push reading speed over limit.',
    steps: UTILITY_TOOL_EXIT_STEPS,
    primary: { label: 'Validate shifted file', href: '/tools/subtitle-validator' },
    secondary: [
      { label: 'Auto-fix QC', href: GRAMMAR_FIXER_EXIT },
      { label: 'Convert video to SRT', href: '/video-to-srt' },
    ],
  },
  '/tools/srt-to-vtt': {
    kicker: 'Convert → validate → fix → generate',
    title: 'SRT to VTT done — run QC before upload',
    body: 'Format conversion does not fix line length or reading speed. WebVTT players still reject unreadable cues.',
    steps: UTILITY_TOOL_EXIT_STEPS,
    primary: { label: 'Validate converted file', href: '/tools/subtitle-validator' },
    secondary: [
      { label: 'Auto-fix QC', href: GRAMMAR_FIXER_EXIT },
      { label: 'Convert video to SRT', href: '/video-to-srt' },
    ],
  },
  '/tools/srt-to-text': {
    kicker: 'Extracted text → new SRT?',
    title: 'Need timed captions again?',
    body: 'Plain text from SRT is great for blogs — to republish as captions, regenerate from source video or fix an existing track.',
    primary: { label: 'Convert video to SRT', href: '/video-to-srt' },
    secondary: [
      { label: 'Fix existing SRT', href: '/subtitle-grammar-fixer' },
      { label: 'Video to transcript', href: '/video-to-transcript' },
    ],
  },
  '/video-with-subtitles': {
    kicker: 'Same product as Burn Subtitles',
    title: 'Add captions permanently on /burn-subtitles',
    body: 'Upload video + SRT/VTT and download one file with open captions. Canonical URL is /burn-subtitles.',
    primary: { label: 'Burn Subtitles into Video', href: '/burn-subtitles' },
    secondary: [{ label: 'Need an SRT first?', href: '/video-to-subtitles' }],
  },
}

export function getSeoJourneyBanner(pathname: string): SeoJourneyBannerData | null {
  return SEO_JOURNEY_BANNERS[pathname] ?? null
}
