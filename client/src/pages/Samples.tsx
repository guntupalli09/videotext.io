export default function Samples() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Transcript & Subtitle Output Samples</h1>
        <p className="mt-4 text-zinc-600 max-w-3xl">
          Real examples of what VideoText produces so buyers, teams, and auditors can evaluate output quality before starting.
          This page is designed for EEAT-style proof: transcript sample, subtitle preview, and workflow output bundle.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <h2 className="text-2xl font-semibold">1) Transcript sample (speaker labels + timestamps)</h2>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 overflow-x-auto">
          <pre className="text-sm leading-6 whitespace-pre-wrap">
{`[00:00:02] Speaker 1: Welcome to the product walkthrough. In this video, we’ll cover setup, exports, and automation.
[00:00:09] Speaker 2: Great. Let’s start with upload. Drag your MP4 or paste a YouTube URL and processing begins immediately.
[00:00:18] Speaker 1: After transcription, you’ll get a clean text transcript, summary bullets, and chapter markers.
[00:00:27] Speaker 2: You can export TXT, DOCX, PDF, JSON, and subtitles as SRT or VTT.`}
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <h2 className="text-2xl font-semibold">2) Subtitle preview (SRT format)</h2>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 overflow-x-auto">
          <pre className="text-sm leading-6 whitespace-pre-wrap">
{`1
00:00:02,000 --> 00:00:06,000
Welcome to the product walkthrough.

2
00:00:06,001 --> 00:00:10,500
We’ll cover setup, exports,
and automation.

3
00:00:10,501 --> 00:00:14,500
Drag your MP4 or paste
a YouTube URL to begin.`}
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="text-2xl font-semibold">3) Real workflow outputs (what you receive)</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="rounded-lg border border-zinc-200 p-4"><strong>Transcript:</strong> full text with timestamps and optional speaker labels.</li>
          <li className="rounded-lg border border-zinc-200 p-4"><strong>Subtitles:</strong> SRT and VTT files ready for YouTube, Vimeo, and social platforms.</li>
          <li className="rounded-lg border border-zinc-200 p-4"><strong>Summary:</strong> concise bullet summary for publishing and internal notes.</li>
          <li className="rounded-lg border border-zinc-200 p-4"><strong>Chapters:</strong> auto section markers for navigation and content repurposing.</li>
          <li className="rounded-lg border border-zinc-200 p-4"><strong>Exports:</strong> TXT, DOCX, PDF, JSON, SRT, and VTT.</li>
          <li className="rounded-lg border border-zinc-200 p-4"><strong>Privacy:</strong> processing-first workflow with file deletion policy after completion.</li>
        </ul>
      </section>
    </main>
  )
}
