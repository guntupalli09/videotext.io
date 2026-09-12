/**
 * GSC-informed SEO depth for recently touched routes (28-day baseline Sep 2026).
 * Query→page mapping is semantic (Queries.csv has no page dimension in our exports).
 */

export type GscFaqItem = { id: string; q: string; a: string }

export type GscHowItWorks = {
  heading: string
  steps: { title: string; detail: string }[]
}

export type PageGscSeoDepth = {
  path: string
  howItWorks?: GscHowItWorks
  faq?: GscFaqItem[]
}

const DEPTH: Record<string, PageGscSeoDepth> = {
  '/video-to-srt': {
    path: '/video-to-srt',
    howItWorks: {
      heading: 'How Video to SRT Works',
      steps: [
        { title: 'Upload your video file', detail: 'Add MP4, MOV, WebM, or MKV. Set the spoken language when you know it — that improves Whisper accuracy before cues are written.' },
        { title: 'Generate timed subtitles', detail: 'VideoText transcribes speech and writes numbered SRT cues with start/end timestamps. Processing usually finishes in under a few minutes for typical uploads.' },
        { title: 'Review transcript and timestamps', detail: 'Scan the cue list in the editor. Adjust wording or timing before export if a line reads too fast or sits on the wrong beat.' },
        { title: 'Download the .srt file', detail: 'Export a standard SubRip file for YouTube, Vimeo, Premiere, or any editor that accepts sidecar captions.' },
      ],
    },
    faq: [
      {
        id: 'convert-video-to-srt',
        q: 'How do I convert a video to an SRT file?',
        a: 'Upload the video on this page, run the job, and download SRT. Each cue gets a start time, end time, and text line — the format YouTube and most NLEs expect.',
      },
      {
        id: 'srt-from-video-direct',
        q: 'Can I generate an SRT file directly from a video?',
        a: 'Yes. You do not need a separate transcript step. Whisper builds timed cues from the audio track in one pass.',
      },
      {
        id: 'mp4-to-srt',
        q: 'How do I convert MP4 video to SRT?',
        a: 'Upload the MP4 as-is. No re-encoding required. The same flow works for MOV and WebM exports from CapCut, Premiere, or phone cameras.',
      },
      {
        id: 'online-no-install',
        q: 'Can I create an SRT file online without installing software?',
        a: 'Yes. Everything runs in the browser and cloud pipeline — no desktop subtitle editor required to create the first draft.',
      },
      {
        id: 'timestamps-preserved',
        q: 'Does VideoText keep subtitle timestamps in the SRT?',
        a: 'Yes. Export uses standard `HH:MM:SS,mmm` timing codes aligned to speech. Cue order matches playback sequence.',
      },
      {
        id: 'edit-after-generate',
        q: 'Can I edit the SRT after it is generated?',
        a: 'Edit cues in the preview, download, then open in any text editor or NLE. For bulk timing, line-length, or overlap fixes, use Subtitle Grammar Fixer.',
      },
      {
        id: 'generator-vs-converter',
        q: 'What is the difference between an SRT generator and a video-to-SRT converter?',
        a: 'Searchers use both phrases for the same task — video in, timed .srt out. This page is the canonical URL; /srt-generator redirects here. For the full caption hub (fix, translate, burn), use Video to Subtitles.',
      },
    ],
  },

  '/capcut-captions': {
    path: '/capcut-captions',
    howItWorks: {
      heading: 'How CapCut Caption Export Works Here',
      steps: [
        { title: 'Export from CapCut without burned text', detail: 'In CapCut, export MP4 with captions disabled as a picture overlay so VideoText can read clean audio.' },
        { title: 'Or paste CapCut caption JSON', detail: 'If CapCut gave you a captions JSON export, use the in-browser JSON → SRT converter at the top of this page.' },
        { title: 'Generate or convert to SRT', detail: 'Upload the MP4 for Whisper SRT, or convert JSON locally — both produce a sidecar file CapCut cannot export natively.' },
        { title: 'Continue on a core tool', detail: 'Fix timing on Fix Subtitles, translate on Translate Subtitles, or hardcode on Burn Subtitles — this page is the CapCut entry only.' },
      ],
    },
    faq: [
      {
        id: 'capcut-srt-export',
        q: 'How do I export CapCut captions as SRT?',
        a: 'CapCut does not ship a standalone SRT export on most plans. Export caption JSON and convert above, or export video without burned captions and upload the MP4 here to generate SRT from audio.',
      },
      {
        id: 'capcut-json-to-srt',
        q: 'Can I convert CapCut caption JSON to SRT?',
        a: 'Yes — use the JSON → SRT block at the top of this page. Parsing runs in your browser; the file never leaves your device for that step.',
      },
      {
        id: 'caption-file-capcut',
        q: 'How do I make a caption file for CapCut projects in Premiere or YouTube?',
        a: 'Generate SRT here, then import into Premiere as a caption track or upload to YouTube Studio → Subtitles → Upload file. CapCut overlays alone cannot become that uploadable track.',
      },
      {
        id: 'why-no-capcut-srt',
        q: 'Why can\'t I export an SRT file from CapCut?',
        a: 'CapCut captions are styled in-app overlays for Reels/TikTok playback, not a separate timed text file. VideoText writes a real SRT/VTT sidecar from your export or audio.',
      },
      {
        id: 'capcut-to-premiere',
        q: 'How do I move CapCut captions into Premiere Pro or YouTube?',
        a: 'Export MP4 without burned text, generate SRT here, then import the .srt in Premiere or upload to YouTube. Timestamps stay editable unlike burned CapCut text.',
      },
    ],
  },

  '/subtitle-tools': {
    path: '/subtitle-tools',
    howItWorks: {
      heading: 'How the Free Subtitle Tools Hub Works',
      steps: [
        { title: 'Pick the file task', detail: 'Converters (TTML, VTT, ASS), checkers (CPL, CPS, validator), and timing utilities each solve one step — no account for browser tools.' },
        { title: 'Run the check or conversion locally', detail: 'Most utilities parse in your browser. Your subtitle file stays on-device unless you choose an AI upload tool.' },
        { title: 'Exit to AI tools when needed', detail: 'Generate captions from video on Video to SRT, repair QC issues on Subtitle Grammar Fixer, or translate on Translate Subtitles.' },
      ],
    },
    faq: [
      {
        id: 'subtitletools-alternative',
        q: 'Is this a SubtitleTools.com alternative?',
        a: 'Similar free in-browser checks and converters, plus VideoText AI paths for SRT generation, translation, and burn-in when you outgrow one-off file tasks.',
      },
      {
        id: 'tools-free',
        q: 'Are these subtitle tools really free?',
        a: 'Browser converters and checkers run locally with no account. AI workflows (video to SRT, translate, fix) include 3 free imports per month after signup.',
      },
      {
        id: 'tools-local',
        q: 'Do subtitle files get uploaded to a server?',
        a: 'Validator, timing shift, and format converters read files in your browser. Only AI generation and repair tools upload for processing — files are deleted afterward.',
      },
      {
        id: 'which-tool-first',
        q: 'Which free tool should I run first?',
        a: 'Validator for structure, character checker for CPL, reading-speed for CPS — then grammar fixer if anything fails. Generate from video first if you do not have an SRT yet.',
      },
    ],
  },

  '/tools/video-metadata-viewer': {
    path: '/tools/video-metadata-viewer',
    howItWorks: {
      heading: 'How the Video Metadata Viewer Works',
      steps: [
        { title: 'Select a local video file', detail: 'Drop MP4, MOV, WebM, or MKV. Metadata is read from container headers in the browser — nothing uploads.' },
        { title: 'Inspect codec, resolution, and duration', detail: 'See frame size, frame rate, audio channels, and duration before you send a file to transcription or burn-in.' },
        { title: 'Decide the next step', detail: 'Long files may need compression; silent intros affect subtitle start; wrong frame rate hints at re-encode issues before platform QC.' },
      ],
    },
    faq: [
      {
        id: 'metadata-upload',
        q: 'Does my video upload to a server?',
        a: 'No. This viewer reads file headers locally with the browser File API. Only AI tools elsewhere on VideoText upload for processing.',
      },
      {
        id: 'metadata-before-srt',
        q: 'Why check metadata before generating subtitles?',
        a: 'Confirm duration matches your edit, audio tracks exist, and resolution is what you expect — avoids wasted imports on corrupt or silent exports.',
      },
    ],
  },
}

/** Supplementary FAQs — merged only when not duplicating registry/core copy. */
const SUPPLEMENT_FAQ: Record<string, GscFaqItem[]> = {
  '/translate-subtitles': [
    {
      id: 'translate-srt-timestamps',
      q: 'How do I translate an SRT file without changing timestamps?',
      a: 'Upload SRT or VTT, pick a target language, and download. Cue start/end times stay fixed; only spoken text changes. Review reading speed afterward — translated lines can run longer.',
    },
    {
      id: 'translate-vtt',
      q: 'Can I translate VTT files the same way as SRT?',
      a: 'Yes. Upload either format and export the same type back. WebVTT headers are preserved where the parser supports them.',
    },
  ],
  '/subtitle-grammar-fixer': [
    {
      id: 'fix-line-breaks-only',
      q: 'Can I fix line breaks without changing timestamps?',
      a: 'Yes. Enable Line breaks (CPL) without Fix timing. Cue times stay as-is while long rows reflow toward your character limit.',
    },
    {
      id: 'fix-before-qc',
      q: 'Can I repair an SRT file before platform QC?',
      a: 'Run validator or reading-speed check first, then upload here with the matching fix toggles. Re-scan after export — automatic passes do not replace human review for every vendor rule.',
    },
  ],
}

export function getPageGscSeoDepth(pathname: string): PageGscSeoDepth | null {
  return DEPTH[pathname] ?? null
}

export function getPageGscSupplementFaq(pathname: string): GscFaqItem[] {
  return SUPPLEMENT_FAQ[pathname] ?? []
}

export function getPageGscSeoFaq(pathname: string): GscFaqItem[] {
  const primary = DEPTH[pathname]?.faq ?? []
  const supplement = SUPPLEMENT_FAQ[pathname] ?? []
  return [...primary, ...supplement]
}

export const PAGE_GSC_SEO_PATHS = Object.keys(DEPTH)
