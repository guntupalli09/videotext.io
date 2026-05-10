import { Link } from 'react-router-dom'
import { getBlogOutboundUrl } from '../lib/blogOutbound'

/** Mirrors Blog.tsx BlogPost shape for client-guideline SEO cluster.
 *  Markdown mirrors for Hashnode: content/blog/<slug>.md (scripts/blog/publish-crossposts.js). */
export interface FormattingGuideBlogPost {
  slug: string
  date: string
  title: string
  summary: string
  tag: string
  readTime: string
  content: React.ReactNode
}

export const FORMATTING_GUIDE_BLOG_POSTS: FormattingGuideBlogPost[] = [
  {
    slug: 'rev-style-guide-transcript-formatter',
    date: 'May 5, 2026',
    title: 'Rev style guide transcript formatter: map rough AI text to payout rules',
    summary:
      'Walk preset Rev-style rule cards against Video → Transcript output so speaker cues, tags, and verbatim choices match what graders score.',
    tag: 'Freelancers',
    readTime: '8 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          A <strong>Rev style guide transcript formatter</strong> search usually means one job: get rough text into reviewer-shaped paragraphs with the right verbatim mode, bracket tags,
          timestamps on inaudibles, and cautious speaker cues before you skim audio. VideoText splits capture from checklist work — finish audio in{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/video-to-transcript">
            Video → Transcript
          </Link>
          , then carry the paste into{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/guideline-format">
            Format → Client guidelines
          </Link>{' '}
          where the editable Rev-aligned cards track what changed from defaults.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Preset workflow most freelancers run</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Export the transcript with whichever timestamps you need for the job.</li>
          <li>Use <strong>Make this client-ready →</strong> on the result page so the text loads in the guideline workspace.</li>
          <li>Select the Rev preset and read each rule card next to the platform PDF you were assigned.</li>
          <li>Edit card text only where your client brief diverges; keep the “Edited” badges — they show reviewers what you overrode.</li>
          <li>Run your listen pass with the cards side by side, then log disputes with the same wording you saved.</li>
        </ol>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Related reads</h2>
        <p>
          Compare verbatim modes in{' '}
          <a className="text-violet-600 dark:text-violet-400 hover:underline font-medium" href={getBlogOutboundUrl('/blog/clean-verbatim-vs-full-verbatim')}>
            clean verbatim vs full verbatim
          </a>{' '}
          and QA scope in{' '}
          <a className="text-violet-600 dark:text-violet-400 hover:underline font-medium" href={getBlogOutboundUrl('/blog/what-is-transcript-qa')}>
            what transcript QA covers
          </a>
          .
        </p>
        <p>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors"
            to="/guideline-format"
          >
            Format your transcript to a client style guide →
          </Link>
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-earn-more-per-hour-as-a-transcriptionist',
    date: 'May 5, 2026',
    title: 'How to earn more per hour as a transcriptionist without burning out',
    summary:
      'Spend fewer unpaid minutes on rework: same transcript through capture, preset rule cards, and predictable exports before you invoice.',
    tag: 'Career',
    readTime: '9 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Searching <strong>how to earn more per hour as a transcriptionist</strong> usually surfaces “practice typing” or “take faster jobs.” Pricing power actually comes from compressing rework: predictable exports, repeatable QA, and aligning to client rubrics faster than reviewers can kick work back.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Where the unpaid time usually hides</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Clients kick work back when tags, numbers, or speaker labels disagree with PDF briefs—you re-listen sections you thought were done.</li>
          <li>You keep multiple mental models (Rev tonight, GoTranscript tomorrow) and mix up contractions or fillers.</li>
          <li>Exports land as plain walls of text—hard to show auditors which rule you honoured.</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Operational stack VideoText fits into</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Let{' '}
            <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/video-to-transcript">
              Video → Transcript
            </Link>{' '}
            handle the waveform pass while you conserve attention for glossary hits and mandated tags.
          </li>
          <li>
            Open{' '}
            <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/guideline-format">
              Format → Client guidelines
            </Link>{' '}
            immediately after capture so presets document the rubric you applied—not a vague memory after midnight.
          </li>
          <li>Edited rule cards preserve proof of overrides; screenshot or PDF them with your invoice if the client insists on paper trails.</li>
        </ul>
        <p>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors"
            to="/guideline-format"
          >
            Format your transcript to a client style guide →
          </Link>
        </p>
      </div>
    ),
  },
  {
    slug: 'clean-verbatim-vs-full-verbatim',
    date: 'May 5, 2026',
    title: 'Clean verbatim vs full verbatim for transcription freelancers (examples + payouts)',
    summary:
      'When to strip fillers, keep false starts, and escalate uncertain audio—tie choices to reviewer expectations before you invoice.',
    tag: 'Guide',
    readTime: '7 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          <strong>Clean verbatim vs full verbatim</strong> is the divider most reviewers cite when rejecting work. Clean keeps meaning-first readability: fillers and obvious stumbles go away unless they matter legally or narratively.
          Full verbatim traps every audible disfluency—common on legal transcripts, tightly scoped corpora, or client PDFs that spell out “no omission.”
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Signals to resolve before QC</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Filler ladders (“like,” “you know”) — remove or retain?</li>
          <li>False starts that finish later— mirror both or tighten?</li>
          <li>Laughter and environmental tags— newline, brackets, timestamps?</li>
          <li>Digits spelled out vs normalized numerals.</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Preset cards in VideoText</h2>
        <p>
          The marketplace presets inside{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/guideline-format">
            Format → Client guidelines
          </Link>{' '}
          summarise how each vendor typically treats those bullets. Edit the cards when your PDF contradicts defaults; the Edited badges show exactly what drifted—handy during disputes.
        </p>
        <p>
          Read the Rev playbook next:{' '}
          <a className="text-violet-600 dark:text-violet-400 hover:underline font-medium" href={getBlogOutboundUrl('/blog/rev-style-guide-transcript-formatter')}>
            Rev-style preset workflow →
          </a>{' '}
          · QA glossary:{' '}
          <a className="text-violet-600 dark:text-violet-400 hover:underline font-medium" href={getBlogOutboundUrl('/blog/what-is-transcript-qa')}>
            what transcript QA covers →
          </a>
          .
        </p>
        <p>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors"
            to="/guideline-format"
          >
            Format your transcript to a client style guide →
          </Link>
        </p>
      </div>
    ),
  },
  {
    slug: 'what-is-transcript-qa',
    date: 'May 5, 2026',
    title: 'What is transcript QA? Checklist freelancers + agencies both use before delivery',
    summary:
      'QA is the pass after typing: glossary, tags, speakers, and client PDF alignment—separate it from raw capture so rejections have a paper trail.',
    tag: 'Operations',
    readTime: '7 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Queries for <strong>what is transcript QA</strong> often come mid-dispute — someone rejected a deliverable citing “failure to meet customer notes.” Formal QA merges objective checks (timing drift, tagging schema) with subjective readability expectations.
          Agencies layer SLAs atop marketplace rubrics.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Minimum checklist before delivery</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Proper nouns cross-checked against order form glossaries.</li>
          <li>Speaker-change formatting matches screenshot samples.</li>
          <li>Uncertain passages flagged with mandated tags vs guessing.</li>
          <li>Audio holes aligned to client rules for blank lines or bracket text.</li>
        </ol>
        <p>
          VideoText separates capture from QA prep: finalize audio in{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/video-to-transcript">
            Video → Transcript
          </Link>
          {', '}then consolidate rule awareness in{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/guideline-format">
            Format → Client guidelines
          </Link>
          . Today that screen documents preset wording and edits; automated tagging when text violates a rule is planned with the guideline API—use the checklist cards as written proof until then.
        </p>
        <p>
          Freelancers tightening throughput should pair this with{' '}
          <a className="text-violet-600 dark:text-violet-400 hover:underline font-medium" href={getBlogOutboundUrl('/blog/how-to-earn-more-per-hour-as-a-transcriptionist')}>
            transcriptionist workflow notes →
          </a>{' '}
          and{' '}
          <a className="text-violet-600 dark:text-violet-400 hover:underline font-medium" href={getBlogOutboundUrl('/blog/clean-verbatim-vs-full-verbatim')}>
            clean vs full verbatim →
          </a>
          .
        </p>
        <p>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors"
            to="/guideline-format"
          >
            Format your transcript to a client style guide →
          </Link>
        </p>
      </div>
    ),
  },
  {
    slug: 'freelance-transcription-style-guide-cheatsheet',
    date: 'May 5, 2026',
    title: 'Freelance transcription style guide cheatsheet for GoTranscript, Scribie, and custom PDF briefs',
    summary:
      'Turn stack-specific PDF quirks into preset rows you can reuse each shift—contractions, tags, numbers, and laughter placement without re-reading 40 pages.',
    tag: 'Cheat sheet',
    readTime: '6 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Every marketplace ships a PDF; your job is to remember which client wants contractions kept, which demands bracketed laughter, and which normalises numbers. A cheatsheet is just those rows in one place so you are not re-opening page 27 at 2 a.m.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Map PDF rows to VideoText presets</h2>
        <p>
          Start from the GoTranscript, Scribie, Rev, or TranscribeMe preset inside{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/guideline-format">
            Format → Client guidelines
          </Link>
          . Treat each card as a cheatsheet line—contractions, tagging, timestamps, laughter placement, ellipsis usage. When an agency deviates, edit the card, note the override, and keep the export with your invoice.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Retention:</strong> some clients want “wanna/gonna” typed exactly; others want them expanded—match the card to the PDF, not habit.
          </li>
          <li>
            <strong>Batching:</strong> group similar clients so you load the same preset order each night; fewer context switches means fewer mistakes.
          </li>
        </ul>
        <p>
          Capture audio with{' '}
          <Link className="text-violet-600 dark:text-violet-400 hover:underline font-medium" to="/video-to-transcript">
            Video → Transcript
          </Link>
          , then open the formatter before you start human polish.
        </p>
        <p>
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors"
            to="/guideline-format"
          >
            Format your transcript to a client style guide →
          </Link>
        </p>
      </div>
    ),
  },
]
