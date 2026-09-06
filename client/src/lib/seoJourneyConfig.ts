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
  { title: 'Get the recording', detail: 'Download the file from the platform, or paste a YouTube URL if you already posted it there.' },
  { title: 'Upload or paste on Video to Transcript', detail: 'Whisper large-v3 turns speech into text plus SRT/VTT, summary, and chapters.' },
  { title: 'Download and continue', detail: 'Format to a client guide, fix captions, or translate the SRT — files deleted after processing.' },
]

const SUBTITLE_STEPS = [
  { title: 'Upload the video', detail: 'MP4/MOV or a YouTube URL. This page is the entry — not a dead-end download.' },
  { title: 'Get timed SRT or VTT', detail: 'Whisper large-v3 writes cues. Free: 3 imports/mo, no card.' },
  { title: 'Fix, translate, or burn', detail: 'Continue on the matching core tool. CapCut/editor pages stay the entry; burn/fix/translate are the exits.' },
]

const ALT_TO_TRANSCRIPT: SeoJourneyBannerData = {
  kicker: 'Skip the comparison — use the tool',
  title: 'Upload once → transcript + SRT + summary',
  body: 'Problem: you need words from a file or YouTube URL, not another feature matrix. Three steps on Video to Transcript.',
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

export const SEO_JOURNEY_BANNERS: Record<string, SeoJourneyBannerData> = {
  '/srt-generator': {
    kicker: 'File maker → full caption hub',
    title: 'Need more than a .srt download?',
    body: 'This page is the SRT file generator (maker/creator). The full product — timed SRT/VTT plus fix, translate, and burn — lives on Video to Subtitles.',
    primary: { label: 'Open the Video to Subtitles hub', href: '/video-to-subtitles' },
    secondary: [
      { label: 'Video to SRT converter', href: '/video-to-srt' },
      { label: 'Translate', href: '/translate-subtitles' },
    ],
  },
  '/video-to-srt': {
    kicker: 'Converter → full caption hub',
    title: 'Need the full caption product?',
    body: 'This page is the converter: video in, timed SRT out. Video to Subtitles is the hub for SRT/VTT plus fix, translate, burn, and a path to transcript + summary.',
    primary: { label: 'Open the Video to Subtitles hub', href: '/video-to-subtitles' },
    secondary: [
      { label: 'SRT file generator', href: '/srt-generator' },
      { label: 'Fix Subtitles', href: '/fix-subtitles' },
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
    title: 'Upload the Loom file (or a YouTube URL) → transcript',
    body: 'Download the Loom MP4, then use Video to Transcript. You also get SRT/VTT, summary, and chapters. Files deleted after processing.',
    steps: TRANSCRIPT_STEPS,
    primary: { label: 'Open Video to Transcript', href: '/video-to-transcript' },
    secondary: [{ label: 'Need captions only?', href: '/video-to-subtitles' }],
  },
  '/vimeo-transcription': {
    kicker: 'Vimeo video → transcript',
    title: 'Upload the Vimeo file (or a YouTube URL) → transcript',
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
