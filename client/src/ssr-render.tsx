/**
 * Server-side rendering helper for build-time prerendering.
 *
 * Two SSR modes are intentionally supported:
 * 1. `react-page`: hand-audited presentational React pages that can be rendered directly.
 * 2. `seo-document`: registry/meta driven semantic HTML for SEO landing pages whose
 *    interactive uploader/editor remains client-only during hydration.
 *
 * This keeps browser-heavy product flows out of Node while ensuring crawlers see
 * headings, paragraphs, FAQs, comparisons, and internal links for every important
 * indexable page.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import TemiVsVideoText from './pages/TemiVsVideoText'
import VideoTextVsRev from './pages/VideoTextVsRev'
import OtterVsVideoText from './pages/OtterVsVideoText'
import DescriptVsVideoText from './pages/DescriptVsVideoText'
import VideoTextVsTurboScribe from './pages/VideoTextVsTurboScribe'
import BestOtterAlternatives from './pages/BestOtterAlternatives'
import BestDescriptAlternatives from './pages/BestDescriptAlternatives'
import { ROUTE_SEO } from './lib/seoMeta'
import { getAllSeoEntries, getPageLabel, getRelatedSuggestionsForEntry, getSeoEntry, type FaqItem, type SeoDeepContent, type SeoRegistryEntry, type SeoTutorialContent } from './lib/seoRegistry'
import { getCanonicalPathForRoute, resolveInternalLinkPath } from './lib/primaryUrls'
import {
  getRouteFamily,
  getFamilySectionTitles,
  getFamilyPrimaryCta,
  getContextualCta,
  getWorkflowStageCtas,
  shouldReplaceRegistryCta,
  buildFamilyDeepContent,
  buildFamilyFaq,
  type RouteFamily,
} from './lib/routeFamilyTemplates'

type SsrMode = 'react-page' | 'seo-document'

interface StaticRouteContent {
  path: string
  title: string
  description: string
  h1: string
  intro: string
  faq?: FaqItem[]
  related?: { path: string; title: string }[]
  deepContent?: SeoDeepContent
  tutorialContent?: SeoTutorialContent
  primaryCta?: { text: string; path: string }
  routeFamily?: RouteFamily
}

const SSR_PAGES: Record<string, React.ComponentType> = {
  '/temi-vs-videotext': TemiVsVideoText,
  '/videotext-vs-rev': VideoTextVsRev,
  '/otter-vs-videotext': OtterVsVideoText,
  '/descript-vs-videotext': DescriptVsVideoText,
  '/videotext-vs-turboscribe': VideoTextVsTurboScribe,
  '/best-otter-alternatives': BestOtterAlternatives,
  '/best-descript-alternatives': BestDescriptAlternatives,
}

const CORE_STATIC_CONTENT: Record<string, Omit<StaticRouteContent, 'path' | 'title' | 'description'>> = {
  '/site-index': {
    h1: 'All VideoText Pages',
    intro: 'Browse VideoText transcription workflows, subtitle utilities, comparison pages, alternatives, style-guide resources, and export helpers from one organized index.',
    primaryCta: { text: 'Choose the right transcript, subtitle, or formatting workflow', path: '/site-index' },
    deepContent: {
      proofPoints: [
        'Find the right workflow quickly, from long-video transcription to subtitle repair, translation, formatting, and tool comparisons.',
        'Every important page links back to core transcription, subtitle, and formatting workflows.',
        'Related pages are grouped so transcript, caption, formatting, and comparison resources stay easy to navigate.',
      ],
      workflowSteps: [
        { title: '1. Browse workflow groups', detail: 'Start with core product pages, alternatives, free tools, and detailed transcript or subtitle resources from one organized page.' },
        { title: '2. Follow task-specific links', detail: 'Related workflow links connect use cases such as YouTube transcripts, meeting notes, subtitle translation, and style-guide formatting.' },
        { title: '3. Compare options', detail: 'Use comparison and alternatives pages to choose the right transcript, subtitle, or formatting workflow before uploading media.' },
      ],
      ctaText: 'Move from raw media to export-ready text',
      ctaPath: '/video-to-transcript',
    },
    faq: [
      { q: 'Why does VideoText have a site index?', a: 'The index gives teams a quick map of transcription, subtitle, formatting, comparison, and free utility pages when they are not sure which workflow to start with.' },
      { q: 'What can I find in the site index?', a: 'You can find core transcription tools, subtitle workflows, style-guide pages, alternatives, samples, blog guides, and free utilities.' },
    ],
    related: [
      { path: '/video-to-transcript', title: 'Video to Transcript' },
      { path: '/video-to-subtitles', title: 'Video to Subtitles' },
      { path: '/alternatives', title: 'Alternatives Hub' },
      { path: '/tools', title: 'Free Tools' },
    ],
  },
  '/guideline-format': {
    h1: 'Transcript Style Guide Formatter for Rev and GoTranscript Rules',
    intro:
      'Turn a raw transcript into a client-ready draft that follows platform-style rules for speaker labels, timestamps, clean verbatim, full verbatim, punctuation, and QA review. Use it before delivery to reduce formatting rework and catch the issues that often trigger marketplace revision requests.',
    primaryCta: { text: 'Apply client transcript formatting rules', path: '/guideline-format' },
    deepContent: {
      proofPoints: [
        'Apply Rev-style paragraph breaks, speaker names, timestamps, and notation rules before client handoff.',
        'Check GoTranscript-style QA details such as label consistency, timestamp placement, inaudible tags, and verbatim level.',
        'Convert rough ASR output into a cleaner delivery draft without manually reformatting every speaker turn.',
      ],
      workflowSteps: [
        { title: '1. Choose the requested guideline', detail: 'Start from Rev, GoTranscript, TranscribeMe, Scribie, or custom client instructions, then adjust rules for clean verbatim, full verbatim, timestamps, and notation style.' },
        { title: '2. Normalize transcript structure', detail: 'Standardize speaker labels, paragraph breaks, capitalization, filler-word handling, and timestamp intervals so the file reads consistently from beginning to end.' },
        { title: '3. Run a QA pass before delivery', detail: 'Review formatting risks such as missing labels, inconsistent brackets, overlong paragraphs, unclear inaudible marks, and timestamp drift before sending the transcript to a reviewer or client.' },
      ],
      outputExamples: [
        { title: 'Rev-ready formatting', body: 'Prepare readable clean verbatim text with consistent speakers, clear paragraphing, and timestamp treatment that matches the client request.' },
        { title: 'GoTranscript QA checklist', body: 'Catch common rejection triggers: wrong timestamp format, mixed speaker labels, missing crosstalk notes, inconsistent punctuation, and unsupported verbatim choices.' },
        { title: 'Client-ready transcript handoff', body: 'Export a polished draft that can move into DOCX, PDF, TXT, or team review with fewer manual formatting passes.' },
      ],
      useCases: [
        { title: 'Freelance transcriptionists', body: 'Reduce revision risk before submitting marketplace jobs that require strict style-guide compliance.' },
        { title: 'Agencies and QA leads', body: 'Give editors a repeatable formatting workflow for client-specific transcript requirements.' },
        { title: 'Creators and researchers', body: 'Turn automated transcripts into readable documents with speaker structure, timestamps, and clean delivery formatting.' },
      ],
      comparisonRows: [
        { feature: 'Clean vs full verbatim', videotext: 'Helps apply filler-word, false-start, and readability rules consistently', alternatives: 'Often leaves editors to enforce verbatim level manually' },
        { feature: 'Timestamp formatting', videotext: 'Supports interval and speaker-turn timestamp workflows for review-ready files', alternatives: 'Requires manual timestamp cleanup after transcription' },
        { feature: 'QA rejection prevention', videotext: 'Surfaces formatting issues before handoff', alternatives: 'Issues are usually found only after reviewer feedback' },
      ],
      ctaText: 'Generate a client-ready formatted transcript',
      ctaPath: '/guideline-format',
    },
    faq: [
      { q: 'Can I format a transcript for Rev-style rules?', a: 'Yes. Use the formatter to apply speaker labels, paragraph structure, timestamp choices, clean verbatim rules, and notation conventions before exporting the transcript.' },
      { q: 'How does this help with GoTranscript QA?', a: 'It gives you a structured pass for common QA issues such as inconsistent speaker labels, incorrect timestamp style, missing inaudible or crosstalk notation, and mismatched clean versus full verbatim settings.' },
      { q: 'What is the difference between clean and full verbatim?', a: 'Clean verbatim removes distracting fillers and false starts for readability. Full verbatim keeps more spoken detail, including fillers, repetitions, and interruptions when the guideline requires them.' },
    ],
    related: [
      { path: '/rev-transcript-guidelines', title: 'Rev Transcript Guidelines' },
      { path: '/gotranscript-guidelines', title: 'GoTranscript Guidelines' },
      { path: '/transcribeme-guidelines', title: 'TranscribeMe Guidelines' },
      { path: '/video-to-transcript', title: 'Video to Transcript' },
      { path: '/samples', title: 'Transcript Samples' },
    ],
  },
  '/video-to-transcript': {
    h1: 'Video to Transcript — Free AI Transcription, 98.5% Accurate',
    intro:
      'Upload any video or paste a YouTube URL and get a full transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in one pass. VideoText is built for creators, teams, researchers, and agencies that need searchable text from long recordings without manual cleanup.',
    primaryCta: { text: 'Generate transcript, subtitles, summary, and chapters together', path: '/video-to-transcript' },
    deepContent: {
      proofPoints: [
        'One long-video upload produces transcript text, SRT/VTT subtitle files, summaries, chapters, JSON, DOCX, PDF, and share-ready exports.',
        'Handles long recordings from creators, webinars, interviews, courses, meetings, and research sessions without splitting the job across separate tools.',
        'Searchable transcripts make it easier to find quotes, decisions, chapters, action items, and reusable clips inside multi-hour recordings.',
      ],
      workflowSteps: [
        { title: '1. Upload a video or paste a URL', detail: 'Drag in a file or start from a public media URL. Choose language, speaker labels, long-video handling, and export formats before processing.' },
        { title: '2. Generate transcript, subtitles, summary, and chapters', detail: 'VideoText prepares transcript text, captions, summaries, chapters, and structured data in the same workflow, replacing separate transcription, captioning, note-taking, and summarization tools.' },
        { title: '3. Review, edit, and export', detail: 'Copy searchable text, download TXT/DOCX/PDF/JSON, export SRT/VTT captions, share with teammates, or continue into subtitle translation and style-guide formatting.' },
      ],
      outputExamples: [
        { title: 'Searchable transcript', body: 'Turn a long recording into text that can be searched by topic, speaker, quote, decision, or chapter marker.' },
        { title: 'Subtitle files', body: 'Generate SRT and VTT captions for YouTube, Vimeo, courses, webinars, social clips, and accessibility handoffs.' },
        { title: 'Summary and chapters', body: 'Create a concise recap and navigable chapter markers so creators and teams can locate key moments without replaying the full video.' },
      ],
      useCases: [
        { title: 'Creators and marketers', body: 'Repurpose webinars, podcasts, tutorials, and launches into articles, social captions, newsletters, searchable show notes, and clip briefs.' },
        { title: 'Researchers and journalists', body: 'Search interviews, lectures, focus groups, and source footage for exact quotes, themes, timestamps, and supporting evidence.' },
        { title: 'Agencies and teams processing many videos', body: 'Drop 2 or more files into the same uploader to switch into batch mode (Pro/Agency) — process 10-100+ videos in parallel and download one ZIP with a correctly named SRT/VTT file per clip instead of uploading one at a time.' },
      ],
      comparisonRows: [
        { feature: 'Outputs from one upload', videotext: 'Transcript, SRT/VTT, summary, chapters, JSON, DOCX, PDF, and share links', alternatives: 'Usually transcript-only or requires multiple tools' },
        { feature: 'Long recording workflow', videotext: 'Designed for long-video processing, structured outputs, and teammate review', alternatives: 'Often requires separate tools for captions, summaries, chapters, or review handoff' },
        { feature: 'Multiple videos at once', videotext: 'Drop 2+ files to batch process in parallel, one ZIP output', alternatives: 'Usually one file at a time, or a separate paid batch product' },
        { feature: 'Privacy posture', videotext: 'Files deleted after processing', alternatives: 'Uploads may remain in project libraries' },
      ],
      ctaText: 'Turn long video into structured transcript outputs',
      ctaPath: '/video-to-transcript',
    },
    faq: [
      { q: 'How do I convert a video to a transcript?', a: 'Upload a video file or paste a supported URL, choose your options, and start transcription. VideoText returns transcript text plus optional subtitle, summary, and chapter outputs.' },
      { q: 'Does VideoText generate subtitles too?', a: 'Yes. The same flow can produce SRT and VTT files in addition to the transcript, which makes the page useful for captioning and publishing workflows.' },
      { q: 'Can I use VideoText for long videos?', a: 'Yes. VideoText is designed for long-video processing with transcript text, subtitle files, summaries, chapters, and flexible exports from the same upload.' },
      { q: 'Can I process multiple videos at once?', a: 'Yes. Drop 2 or more files into the same uploader to switch into batch mode (Pro and Agency plans) — files process in parallel and you download one ZIP containing a correctly named SRT/VTT file for each source video.' },
    ],
    related: [
      { path: '/youtube-transcript-generator', title: 'YouTube Transcript Generator' },
      { path: '/video-to-subtitles', title: 'Video to Subtitles' },
      { path: '/translate-subtitles', title: 'Translate Subtitles' },
      { path: '/guideline-format', title: 'Transcript Style Guide Formatter' },
      { path: '/fastest-transcription-tool', title: 'Fastest Transcription Tool' },
    ],
  },
  '/subtitle-validator': {
    h1: 'Subtitle Validator — Check SRT & VTT Files Free',
    intro: 'Paste or upload an SRT or VTT file to catch overlapping timestamps, empty cues, and malformed blocks before they get rejected by a platform or a client QA pass.',
    primaryCta: { text: 'Validate a subtitle file now', path: '/tools/subtitle-validator' },
    deepContent: {
      proofPoints: [
        'Overlapping timestamps — where one cue starts before the previous one ends — are the single most common cause of subtitle files getting bounced by client QA, and they are easy to miss scrolling through a file by eye.',
        'Empty or whitespace-only cues pass silently through most manual reviews but fail strict platform ingestion checks, since the block exists structurally but has no renderable text.',
        'A malformed timestamp separator (period instead of comma in SRT, or the reverse in VTT) is a one-character error that breaks the entire file for some players, even though the rest of the block is otherwise valid.',
      ],
      workflowSteps: [
        { title: '1. Paste or upload the SRT/VTT file', detail: 'No account or upload limit — validation runs immediately on the pasted or uploaded content.' },
        { title: '2. Review flagged issues', detail: 'Overlapping timestamps, empty cues, malformed separators, and excessively long lines are flagged individually with their block number.' },
        { title: '3. Fix and re-validate', detail: 'Correct the flagged blocks and re-run validation before uploading to a platform or submitting for client QA.' },
      ],
      outputExamples: [
        { title: 'Validation report', body: 'A per-block list of timing overlaps, empty cues, and formatting errors, referenced by subtitle number for quick lookup.' },
        { title: 'Pass/fail summary', body: 'A quick top-line pass/fail status before a deeper block-by-block review is needed.' },
      ],
      useCases: [
        { title: 'Freelance transcriptionists', body: 'Catch formatting issues before submitting a file for client QA, reducing revision requests.' },
        { title: 'Platform upload prep', body: 'Verify a subtitle file will pass strict ingestion checks before uploading to YouTube, a course platform, or a broadcast delivery spec.' },
      ],
    },
    faq: [
      { q: 'What does the subtitle validator check for?', a: 'Overlapping timestamps, empty or whitespace-only cues, malformed timestamp separators, and excessively long lines that risk failing reading-speed guidelines.' },
      { q: 'Does it work with both SRT and VTT files?', a: 'Yes. Both formats are supported and validated for their respective timestamp syntax.' },
      { q: 'Is the validator free?', a: 'Yes. It runs entirely in your browser, free, with no account required.' },
    ],
    related: [
      { path: '/tools/subtitle-reading-speed', title: 'Reading Speed Checker' },
      { path: '/tools/subtitle-character-checker', title: 'Character Limit Checker' },
      { path: '/subtitle-tools', title: 'Subtitle Tools' },
      { path: '/fix-subtitles', title: 'Fix Subtitles' },
    ],
  },
  '/subtitle-character-checker': {
    h1: 'Subtitle Character Limit Checker — Netflix, YouTube & BBC',
    intro: 'Check every subtitle line against Netflix (42 characters), YouTube (80 characters), and BBC (37 characters) line-length limits before delivery, so lines that read fine in isolation don\'t fail a platform\'s hard cap.',
    primaryCta: { text: 'Check subtitle character limits', path: '/tools/subtitle-character-checker' },
    deepContent: {
      proofPoints: [
        'Character limits differ by platform for a reason tied to screen real estate and font size at streaming resolution — a line that fits comfortably under YouTube\'s 80-character cap can still fail Netflix\'s stricter 42-character delivery spec.',
        'Two-line subtitle blocks need per-line checking, not a combined count — a block can pass on total character count while one individual line still exceeds the platform\'s per-line limit.',
        'Character-limit failures are one of the more common rejection reasons in professional subtitle delivery specs, since they are easy to overlook when a line reads naturally but simply runs long.',
      ],
      workflowSteps: [
        { title: '1. Paste or upload the subtitle file', detail: 'Works with SRT or VTT files, checked line by line against the selected platform standard.' },
        { title: '2. Select the target platform limit', detail: 'Choose Netflix (42 chars), YouTube (80 chars), or BBC (37 chars) — or check against all three at once.' },
        { title: '3. Fix flagged lines', detail: 'Split or shorten any line exceeding the limit, then re-check before final delivery.' },
      ],
      outputExamples: [
        { title: 'Per-line pass/fail report', body: 'Every subtitle line checked individually against the chosen character limit, with failing lines flagged by block number.' },
        { title: 'Multi-standard comparison', body: 'The same file checked against Netflix, YouTube, and BBC limits simultaneously for delivery specs that need to satisfy more than one platform.' },
      ],
      useCases: [
        { title: 'Streaming delivery QA', body: 'Verify subtitle files meet Netflix or broadcast character-limit specs before final delivery.' },
        { title: 'Multi-platform publishers', body: 'Check the same subtitle file against several platform standards at once before distributing across YouTube, streaming, and broadcast.' },
      ],
    },
    faq: [
      { q: 'What character limits does the checker support?', a: 'Netflix (42 characters per line), YouTube (80 characters per line), and BBC (37 characters per line).' },
      { q: 'Does it check each line or the whole block?', a: 'Each line individually. A two-line block is checked per line, since a platform can reject one long line even if the combined block total looks reasonable.' },
      { q: 'Is this tool free?', a: 'Yes. It runs in your browser with no upload or account required.' },
    ],
    related: [
      { path: '/tools/subtitle-reading-speed', title: 'Reading Speed Checker' },
      { path: '/tools/subtitle-validator', title: 'Subtitle Validator' },
      { path: '/subtitle-resources', title: 'Subtitle Resources' },
      { path: '/subtitle-tools', title: 'Subtitle Tools' },
    ],
  },
  '/subtitle-word-counter': {
    h1: 'Subtitle Word Counter — Count Words in SRT & VTT Files',
    intro: 'Get word count, character count, and speaking-rate stats (WPM, CPS) from an SRT or VTT file — useful for estimating read-aloud time, translation cost, or whether a subtitle track matches a target reading pace.',
    primaryCta: { text: 'Count words in a subtitle file', path: '/tools/subtitle-word-counter' },
    deepContent: {
      proofPoints: [
        'Translation vendors typically quote per word, not per file — an accurate word count from the source subtitle file avoids under- or over-estimating localization cost before sending a file out for quote.',
        'Words-per-minute derived from subtitle timing (not just word count) reveals whether a caption track is paced for casual reading or dense technical content, which affects whether cues need to be split for readability.',
        'A raw word count from a text editor over-counts subtitle files because it includes timestamp lines and block numbers — a subtitle-aware counter reads only the caption text.',
      ],
      workflowSteps: [
        { title: '1. Paste or upload the subtitle file', detail: 'Works with SRT or VTT — only the caption text is counted, timestamps and block numbers are excluded automatically.' },
        { title: '2. Review word, character, and speaking-rate stats', detail: 'Get total word count, character count, and derived WPM/CPS based on the file\'s actual timing.' },
        { title: '3. Use the numbers for quoting or pacing checks', detail: 'Estimate translation cost from word count, or check whether the speaking rate matches the target audience\'s reading comfort.' },
      ],
      outputExamples: [
        { title: 'Word and character totals', body: 'Total word and character counts extracted from caption text only, excluding timestamps and sequence numbers.' },
        { title: 'Speaking-rate summary', body: 'Words-per-minute and characters-per-second derived from the file\'s actual cue timing, not just an estimate.' },
      ],
      useCases: [
        { title: 'Localization project managers', body: 'Get an accurate word count for translation vendor quotes before sending a subtitle file out.' },
        { title: 'Content pacing review', body: 'Check whether a subtitle track\'s speaking rate matches the target audience before publishing.' },
      ],
    },
    faq: [
      { q: 'Does the word counter include timestamps in the count?', a: 'No. Only the caption text is counted — timestamp lines and block sequence numbers are excluded automatically.' },
      { q: 'Can I use this to estimate translation cost?', a: 'Yes. Most translation vendors quote per word, so an accurate word count from the source file gives a reliable cost estimate before sending it out.' },
      { q: 'Is this tool free?', a: 'Yes. It runs in your browser with no upload or account required.' },
    ],
    related: [
      { path: '/tools/subtitle-reading-speed', title: 'Reading Speed Checker' },
      { path: '/tools/subtitle-character-checker', title: 'Character Limit Checker' },
      { path: '/translate-subtitles', title: 'Translate Subtitles' },
      { path: '/subtitle-tools', title: 'Subtitle Tools' },
    ],
  },
  '/subtitle-reading-speed': {
    h1: 'Subtitle Reading Speed Checker — CPS Analyzer',
    intro: 'Check every subtitle cue\'s characters-per-second (CPS) against Netflix (17 CPS), BBC (17 CPS), and EBU (21 CPS) broadcast standards — the metric that determines whether a viewer can actually finish reading a line before it disappears.',
    primaryCta: { text: 'Check subtitle reading speed', path: '/tools/subtitle-reading-speed' },
    deepContent: {
      proofPoints: [
        'CPS, not character count alone, determines readability — a 40-character line displayed for 3 seconds reads comfortably, but the same line displayed for 1 second is unreadable even though the text itself is identical.',
        'Broadcast standards vary in strictness: Netflix and BBC both target roughly 17 CPS for adult content, while EBU\'s 21 CPS allowance is looser — a file built to one standard can still fail delivery to a platform using the stricter figure.',
        'Reading-speed failures cluster around fast dialogue and dense exposition, where a translator or captioner tries to preserve full meaning in a cue that\'s too short for the resulting text — the fix is usually trimming meaning, not just the character count.',
      ],
      workflowSteps: [
        { title: '1. Paste or upload the subtitle file', detail: 'Every cue\'s character count and display duration are read directly from the SRT/VTT timestamps.' },
        { title: '2. Select the target broadcast standard', detail: 'Check against Netflix/BBC (17 CPS) or EBU (21 CPS), or compare against both at once.' },
        { title: '3. Fix flagged cues', detail: 'Extend the cue duration, shorten the line, or split it across two cues, then re-check before delivery.' },
      ],
      outputExamples: [
        { title: 'Per-cue CPS report', body: 'Every subtitle cue\'s calculated characters-per-second, with cues exceeding the standard flagged by block number.' },
        { title: 'Standard comparison', body: 'The same file checked against Netflix/BBC and EBU CPS thresholds side by side.' },
      ],
      useCases: [
        { title: 'Streaming delivery QA', body: 'Verify a subtitle file meets Netflix or BBC reading-speed requirements before final delivery.' },
        { title: 'Accessibility compliance', body: 'Confirm captions meet reading-speed guidelines that support comprehension for deaf and hard-of-hearing viewers.' },
      ],
    },
    faq: [
      { q: 'What is CPS in subtitles?', a: 'Characters per second — the number of characters in a cue divided by how long it displays. It measures whether a viewer has enough time to read the line before it disappears.' },
      { q: 'What CPS standards does the checker support?', a: 'Netflix and BBC (17 CPS) and EBU (21 CPS), covering the most common broadcast and streaming delivery specs.' },
      { q: 'Is this tool free?', a: 'Yes. It runs in your browser with no upload or account required.' },
    ],
    related: [
      { path: '/tools/subtitle-character-checker', title: 'Character Limit Checker' },
      { path: '/tools/subtitle-validator', title: 'Subtitle Validator' },
      { path: '/subtitle-resources', title: 'Subtitle Resources' },
      { path: '/fix-subtitles', title: 'Fix Subtitles' },
    ],
  },
  '/video-interview-transcription': {
    h1: 'Video Interview Transcription — Speaker-Labeled Transcripts',
    intro: 'Upload a recorded video interview and get a speaker-labeled transcript with timestamps — built for journalists, researchers, and hiring teams who need to pull exact quotes without re-watching the recording.',
    primaryCta: { text: 'Transcribe a video interview', path: '/video-to-transcript' },
    deepContent: {
      proofPoints: [
        'Two-person interviews need speaker separation to be usable for quoting — a transcript that runs interviewer and subject together as one text block forces a manual re-listen to attribute every line correctly.',
        'Timestamped output matters more for interviews than for monologue content, since finding "the exact moment they said that" is the most common reason someone returns to an interview transcript after the first read.',
        'Cross-talk and interruptions — common in unscripted interviews — are the main source of transcription errors; a transcript that flags overlapping speech clearly is more useful than one that silently guesses at it.',
      ],
      workflowSteps: [
        { title: '1. Upload the interview recording', detail: 'Works with video files, audio-only recordings, or a Zoom/Teams/Meet export of the interview call.' },
        { title: '2. Separate speakers automatically', detail: 'Interviewer and subject are split by speaker turn, so quotes can be attributed correctly without manual review.' },
        { title: '3. Export quotes or the full transcript', detail: 'Pull exact, timestamped quotes for an article or report, or export the full transcript for archival and fact-checking.' },
      ],
      outputExamples: [
        { title: 'Speaker-labeled interview transcript', body: 'Interviewer and subject separated by speaker turn with timestamps, ready for direct quotation.' },
        { title: 'Searchable quote archive', body: 'Full transcript text searchable by keyword, useful for locating a specific statement across a long interview.' },
      ],
      useCases: [
        { title: 'Journalists', body: 'Pull exact, attributable quotes from recorded interviews for articles without re-watching footage.' },
        { title: 'Researchers and hiring teams', body: 'Transcribe structured interviews for qualitative coding or candidate review with accurate speaker attribution.' },
      ],
    },
    faq: [
      { q: 'Does this separate the interviewer from the interview subject?', a: 'Yes. Speaker labels split the transcript by speaker turn, so each person\'s statements are clearly attributed.' },
      { q: 'Can I search the transcript for a specific quote?', a: 'Yes. The full transcript text is searchable, and timestamps let you jump back to the exact moment in the recording.' },
      { q: 'Is video interview transcription free?', a: 'Yes. Free tier includes 3 uploads per day, no credit card required.' },
    ],
    related: [
      { path: '/video-to-transcript', title: 'Video to Transcript' },
      { path: '/interview-transcription-tool', title: 'Interview Transcription Tool' },
      { path: '/research-interview-transcription', title: 'Research Interview Transcription' },
      { path: '/academic-transcription', title: 'Academic Transcription' },
    ],
  },
}

function titleToH1(title: string): string {
  return title.replace(/\s*[—–|].*$/, '').trim() || title
}


function getStaticRouteContent(routePath: string): StaticRouteContent | null {
  const canonicalPath = getCanonicalPathForRoute(routePath)
  const family = getRouteFamily(routePath)
  const seoEntry = getSeoEntry(routePath) || getSeoEntry(canonicalPath)
  if (seoEntry) return contentFromSeoEntry(seoEntry, family)

  const meta = ROUTE_SEO[routePath] || ROUTE_SEO[canonicalPath]
  const core = CORE_STATIC_CONTENT[routePath] || CORE_STATIC_CONTENT[canonicalPath]
  if (meta && core) {
    return {
      path: routePath,
      title: meta.title,
      description: meta.description,
      routeFamily: family,
      ...core,
    }
  }

  if (core) {
    const h1 = core.h1 || titleToH1(routePath.slice(1).replace(/-/g, ' '))
    const description = core.intro || `${h1} on VideoText.`
    return {
      path: routePath,
      title: `${h1} | VideoText`,
      description,
      routeFamily: family,
      ...core,
    }
  }

  if (meta) {
    const label = getPageLabel(routePath) || titleToH1(meta.title)
    const familyCta = getFamilyPrimaryCta(family, routePath)
    return {
      path: routePath,
      title: meta.title,
      description: meta.description,
      h1: titleToH1(meta.title),
      intro: meta.description,
      routeFamily: family,
      primaryCta: familyCta,
      deepContent: {
        ...buildFamilyDeepContent(family, label, meta.description),
        ctaText: familyCta.text,
        ctaPath: familyCta.path,
      },
      faq: buildFamilyFaq(family, label, meta.description),
      related: [
        { path: '/video-to-transcript', title: 'Video to Transcript' },
        { path: '/video-to-subtitles', title: 'Video to Subtitles' },
        { path: '/translate-subtitles', title: 'Translate Subtitles' },
        { path: '/guideline-format', title: 'Transcript Style Guide Formatter' },
        { path: '/tools', title: 'Free Transcript and Subtitle Tools' },
      ].filter((item) => item.path !== routePath),
    }
  }

  return null
}

function contentFromSeoEntry(entry: SeoRegistryEntry, family: RouteFamily): StaticRouteContent {
  const contextualCta = getContextualCta(family, entry.path, 'hero')
  const registryCtaText = entry.deepContent?.ctaText || entry.tutorialContent?.ctaText
  const registryCtaPath = entry.deepContent?.ctaPath || entry.tutorialContent?.ctaPath
  const selectedCta = shouldReplaceRegistryCta(registryCtaText) ? contextualCta : { ...contextualCta, text: registryCtaText!, path: registryCtaPath || contextualCta.path }
  const deepContent = entry.deepContent || buildFamilyDeepContent(family, entry.breadcrumbLabel, entry.description)
  return {
    path: entry.path,
    title: entry.title,
    description: entry.description,
    h1: entry.h1,
    intro: entry.intro,
    faq: entry.faq,
    routeFamily: family,
    deepContent: {
      ...deepContent,
      ctaText: shouldReplaceRegistryCta(deepContent.ctaText) ? getContextualCta(family, entry.path, 'footer').text : deepContent.ctaText,
      ctaPath: shouldReplaceRegistryCta(deepContent.ctaText) ? getContextualCta(family, entry.path, 'footer').path : deepContent.ctaPath,
    },
    tutorialContent: entry.tutorialContent,
    related: getRelatedSuggestionsForEntry(entry),
    primaryCta: {
      text: selectedCta.text,
      path: resolveInternalLinkPath(selectedCta.path),
    },
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="vt-workflow-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StaticSeoDocument({ content }: { content: StaticRouteContent }) {
  const deep = content.deepContent
  const tutorial = content.tutorialContent
  const related = content.related || []
  const primaryCta = content.primaryCta || getFamilyPrimaryCta(content.routeFamily ?? 'generic', content.path)
  const titles = getFamilySectionTitles(content.routeFamily ?? 'generic')

  return (
    <main className="vt-workflow-document">
      <style>{`
        .vt-workflow-document{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:960px;margin:0 auto;padding:48px 20px;color:#111827;line-height:1.65;background:#fff}
        .vt-workflow-eyebrow{color:#1d4ed8;font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
        .vt-workflow-document h1{font-size:clamp(34px,6vw,60px);line-height:1.02;margin:0 0 18px;font-weight:500;letter-spacing:-.04em;color:#111827}
        .vt-workflow-intro{font-size:20px;line-height:1.75;color:#374151;margin:0 0 28px;max-width:860px}
        .vt-workflow-actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 14px}.vt-workflow-actions a{border-radius:999px;padding:12px 18px;text-decoration:none;font-weight:800}.vt-workflow-primary{background:#2563EB;color:#fff}.vt-workflow-secondary{background:#eff6ff;color:#1e40af}.vt-workflow-contextual-ctas{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 40px}.vt-workflow-contextual-ctas a{display:inline-flex;border:1px solid #e5e7eb;border-radius:999px;padding:8px 12px;color:#374151;background:#fff;text-decoration:none;font-weight:700;font-size:13px}
        .vt-workflow-section{border-top:1px solid #e5e7eb;padding-top:30px;margin-top:34px}.vt-workflow-section h2{font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:500;color:#111827}.vt-workflow-section h3{font-size:18px;margin:0 0 8px;color:#111827}.vt-workflow-section p,.vt-workflow-section li{color:#374151;font-size:16px}.vt-workflow-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.vt-workflow-card{border:1px solid #e5e7eb;border-radius:12px;padding:18px;background:#fafafa}.vt-workflow-card p{margin:0}.vt-workflow-proof li{margin:8px 0}.vt-workflow-table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.vt-workflow-table th,.vt-workflow-table td{border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;padding:12px}.vt-workflow-table th{background:#f9fafb;color:#111827}.vt-workflow-faq details{border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin:10px 0;background:#fff}.vt-workflow-faq summary{cursor:pointer;font-weight:800;color:#111827}.vt-workflow-links{display:flex;flex-wrap:wrap;gap:10px}.vt-workflow-links a{display:inline-flex;border:1px solid #bfdbfe;border-radius:999px;padding:8px 12px;color:#1e40af;background:#faf5ff;text-decoration:none;font-weight:700}.vt-workflow-card--edge{background:#fef9f0;border-color:#fde68a}.vt-workflow-card--platform{background:#f0f9ff;border-color:#bae6fd}
      `}</style>
      <p className="vt-workflow-eyebrow">VideoText workflow guide</p>
      <h1>{content.h1 || titleToH1(content.title)}</h1>
      <p className="vt-workflow-intro">{content.intro || content.description}</p>
      <div className="vt-workflow-actions">
        <a className="vt-workflow-primary" href={primaryCta.path}>{primaryCta.text}</a>
        <a className="vt-workflow-secondary" href="/pricing">Compare workflow capacity</a>
      </div>
      <div className="vt-workflow-contextual-ctas" aria-label="Workflow-specific next steps">
        {getWorkflowStageCtas(content.routeFamily ?? 'generic', content.path).slice(0, 3).map((cta) => (
          <a key={`${cta.stage}-${cta.text}`} href={cta.path}>{cta.text}</a>
        ))}
      </div>

      {deep?.proofPoints?.length ? (
        <Section title={titles.proofPoints}>
          <ul className="vt-workflow-proof">{deep.proofPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </Section>
      ) : null}

      {deep?.workflowSteps?.length ? (
        <Section title={titles.workflowSteps}>
          <div className="vt-workflow-grid">{deep.workflowSteps.map((step) => <article className="vt-workflow-card" key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
        </Section>
      ) : null}

      {tutorial?.steps?.length ? (
        <Section title={titles.workflowSteps}>
          <div className="vt-workflow-grid">{tutorial.steps.map((step) => <article className="vt-workflow-card" key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.outputExamples?.length ? (
        <Section title={titles.outputExamples}>
          <div className="vt-workflow-grid">{deep.outputExamples.map((item) => <article className="vt-workflow-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.comparisonRows?.length ? (
        <Section title={titles.comparisonRows}>
          <table className="vt-workflow-table">
            <thead><tr><th>Feature</th><th>VideoText</th><th>Alternatives</th></tr></thead>
            <tbody>{deep.comparisonRows.map((row) => <tr key={row.feature}><td>{row.feature}</td><td>{row.videotext}</td><td>{row.alternatives}</td></tr>)}</tbody>
          </table>
        </Section>
      ) : null}

      {deep?.useCases?.length ? (
        <Section title={titles.useCases}>
          <div className="vt-workflow-grid">{deep.useCases.map((item) => <article className="vt-workflow-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.visualProof?.length ? (
        <Section title={titles.edgeCases}>
          <div className="vt-workflow-grid">{deep.visualProof.map((item) => <article className="vt-workflow-card vt-workflow-card--edge" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.technicalExplanation?.length ? (
        <Section title={titles.platformGuidance}>
          <div className="vt-workflow-grid">{deep.technicalExplanation.map((item) => <article className="vt-workflow-card vt-workflow-card--platform" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {content.faq?.length ? (
        <Section title={titles.faq}>
          <div className="vt-workflow-faq">{content.faq.map((item) => <details open key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
        </Section>
      ) : null}

      {related.length ? (
        <Section title={titles.related}>
          <nav className="vt-workflow-links" aria-label="Related workflows">{related.map((item) => <a key={`${item.path}-${item.title}`} href={item.path}>{item.title}</a>)}</nav>
        </Section>
      ) : null}
    </main>
  )
}

export function getSsrPagePaths(): string[] {
  const paths = new Set<string>(Object.keys(SSR_PAGES))
  for (const entry of getAllSeoEntries()) paths.add(entry.path)
  for (const path of Object.keys(CORE_STATIC_CONTENT)) paths.add(path)
  return [...paths].sort()
}

export function getSsrRenderMode(routePath: string): SsrMode | null {
  if (SSR_PAGES[routePath]) return 'react-page'
  return getStaticRouteContent(routePath) ? 'seo-document' : null
}

/**
 * Renders a route to a semantic HTML string. Returns null when the route is not
 * registered for SSR-safe build-time rendering.
 */
export function renderPageToHtml(routePath: string): string | null {
  const Component = SSR_PAGES[routePath]
  try {
    if (Component) {
      return renderToString(
        <StaticRouter location={routePath}>
          <HelmetProvider>
            <Component />
          </HelmetProvider>
        </StaticRouter>
      )
    }

    const content = getStaticRouteContent(routePath)
    if (!content) return null

    return renderToString(
      <StaticRouter location={routePath}>
        <HelmetProvider>
          <StaticSeoDocument content={content} />
        </HelmetProvider>
      </StaticRouter>
    )
  } catch (err) {
    console.error(`[ssr-render] renderToString failed for ${routePath}:`, err)
    return null
  }
}
