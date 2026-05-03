import { Link } from 'react-router-dom';

const trustBullets = [
  'No signup required to start',
  'Files deleted after processing',
  'Built for long uploads (up to 2-hour videos)',
  '70+ languages supported',
];

const testimonials = [
  {
    quote: 'A 96-minute podcast took 4 minutes. Transcript, chapters, and show summary were ready instantly.',
    person: 'Podcast Producer',
  },
  {
    quote: 'We replaced three tools with VideoText. No cleanup pass needed before publishing subtitles.',
    person: 'Agency Editor',
  },
  {
    quote: 'I upload interviews and export structured notes in one run. It saves me hours every week.',
    person: 'Freelance Journalist',
  },
];

export default function Home() {
  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="text-violet-400 text-xs font-extrabold tracking-[0.2em] uppercase">VideoText.io</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-black leading-tight">2-Hour Video → Transcript in 3–5 Minutes</h1>
          <p className="mt-5 text-lg text-white/80 max-w-3xl">
            Upload once. Get a clean transcript, summary, chapters, and subtitles automatically. No manual cleanup. Private by default.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/open"
              className="inline-flex items-center justify-center rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 text-base font-bold"
            >
              Upload video now
            </Link>
            <Link
              to="/youtube-transcript-generator"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 hover:border-white/40 px-6 py-3 text-base font-bold"
            >
              Paste YouTube link
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/85">
            {trustBullets.map((item) => (
              <li key={item} className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">✓ {item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold">See what you get in minutes</h2>
          <p className="mt-3 text-white/75">Automatically generated. No editing required.</p>

          <div className="mt-8 grid lg:grid-cols-2 gap-6">
            <article className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <h3 className="text-xl font-bold mb-3">Transcript</h3>
              <pre className="text-sm text-white/85 whitespace-pre-wrap font-mono leading-6">
Speaker 1 (0:00)
Today we are breaking down how to repurpose one long video into publish-ready assets in minutes.

Speaker 2 (0:18)
Perfect. We need transcript accuracy, short summaries, and chapter markers for YouTube.

Speaker 1 (0:41)
Upload the file once, then export transcript, summary, chapters, and subtitles without cleanup.
              </pre>
            </article>

            <article className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <h3 className="text-xl font-bold mb-3">Summary</h3>
              <ul className="list-disc pl-5 space-y-2 text-white/85">
                <li>One upload creates all core content outputs.</li>
                <li>Team removes manual formatting and QA cleanup.</li>
                <li>Publishing pipeline moves from hours to minutes.</li>
              </ul>
            </article>

            <article className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <h3 className="text-xl font-bold mb-3">Chapters</h3>
              <ul className="list-disc pl-5 space-y-2 text-white/85">
                <li>0:00 Intro and workflow objective</li>
                <li>1:20 Transcript generation process</li>
                <li>3:05 Summary + chapter extraction</li>
                <li>4:40 Subtitle export and publishing</li>
              </ul>
            </article>

            <article className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <h3 className="text-xl font-bold mb-3">Subtitles</h3>
              <pre className="text-sm text-white/85 whitespace-pre-wrap font-mono leading-6">
00:00:01 → Today we are breaking down how to repurpose one long video.
00:00:04 → We need transcript accuracy and chapter markers.
00:00:08 → Upload once and export everything automatically.
              </pre>
            </article>
          </div>

          <p className="mt-6 text-violet-300 font-semibold">This is generated automatically in ~3 minutes.</p>
          <Link to="/open" className="mt-4 inline-flex rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 font-bold">
            Upload your video → get this in minutes
          </Link>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-3xl font-extrabold">Still waiting 30 minutes for transcripts?</h2>
          <ul className="mt-5 space-y-2 text-white/80">
            <li>• Still cleaning messy outputs?</li>
            <li>• Still using multiple tools for transcript + summaries + subtitles?</li>
          </ul>

          <div className="mt-8 grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><h3 className="font-bold">Descript</h3><p className="mt-2 text-white/75">Slower processing on long videos, editing pass often needed.</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><h3 className="font-bold">Otter</h3><p className="mt-2 text-white/75">Good for live notes, but raw output usually needs cleanup.</p></div>
            <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-4"><h3 className="font-bold text-violet-300">VideoText</h3><p className="mt-2 text-white/90">Fast processing, structured output, and no cleanup workflow.</p></div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-3xl font-extrabold">How it works</h2>
          <ol className="mt-6 grid md:grid-cols-3 gap-4">
            <li className="rounded-xl bg-white/5 border border-white/10 p-4"><h3 className="font-bold">1. Upload file or paste link</h3></li>
            <li className="rounded-xl bg-white/5 border border-white/10 p-4"><h3 className="font-bold">2. AI processes in minutes</h3></li>
            <li className="rounded-xl bg-white/5 border border-white/10 p-4"><h3 className="font-bold">3. Download transcript, summary, subtitles, chapters</h3></li>
          </ol>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-3xl font-extrabold">Raw video → publish-ready content in one click</h2>
          <p className="mt-4 text-white/80 max-w-3xl">Skip tool switching. Save hours per file. Deliver structured outputs your team can publish immediately.</p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14 overflow-x-auto">
          <h2 className="text-3xl font-extrabold">Comparison</h2>
          <table className="mt-6 min-w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                <th className="py-3 pr-4">Tool</th><th className="py-3 pr-4">Time</th><th className="py-3 pr-4">Output quality</th><th className="py-3 pr-4">Cleanup required</th><th className="py-3 pr-4">Structured output</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10"><td className="py-3 pr-4">Descript</td><td className="py-3 pr-4">Slower on long files</td><td className="py-3 pr-4">Good, editing-focused</td><td className="py-3 pr-4">Usually yes</td><td className="py-3 pr-4">Limited</td></tr>
              <tr className="border-b border-white/10"><td className="py-3 pr-4">Otter</td><td className="py-3 pr-4">Real-time/live</td><td className="py-3 pr-4">Messy for production</td><td className="py-3 pr-4">Usually yes</td><td className="py-3 pr-4">Limited</td></tr>
              <tr><td className="py-3 pr-4 text-violet-300 font-bold">VideoText</td><td className="py-3 pr-4 text-violet-300 font-bold">~3–5 min for 2h video</td><td className="py-3 pr-4">Publish-ready</td><td className="py-3 pr-4">No</td><td className="py-3 pr-4">Transcript + summary + chapters + subtitles</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5"><h3 className="font-bold text-lg">YouTubers</h3><p className="mt-2 text-white/80">Generate chapters + subtitles instantly.</p></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5"><h3 className="font-bold text-lg">Podcasters</h3><p className="mt-2 text-white/80">Get transcript + summary ready for show notes.</p></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5"><h3 className="font-bold text-lg">Agencies</h3><p className="mt-2 text-white/80">Scale high-volume content workflows.</p></div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-3xl font-extrabold">Teams use VideoText to ship faster</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {testimonials.map((item) => (
              <blockquote key={item.quote} className="rounded-xl bg-white/5 border border-white/10 p-5">
                <p className="text-white/90">“{item.quote}”</p>
                <footer className="mt-3 text-violet-300 text-sm">— {item.person}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-3xl font-extrabold">Simple pricing</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-6"><h3 className="text-xl font-bold">Free</h3><p className="mt-2 text-white/80">Try it now. Fast results. Zero risk.</p></div>
            <div className="rounded-xl bg-violet-500/15 border border-violet-400/40 p-6"><h3 className="text-xl font-bold text-violet-300">Pro</h3><p className="mt-2 text-white/90">For teams that need speed at scale.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-black">Upload your video → get transcript in minutes</h2>
          <p className="mt-4 text-white/80">No cleanup. Fast outputs. Private processing.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/open" className="rounded-xl bg-violet-500 hover:bg-violet-400 px-8 py-3 font-bold">Upload video now</Link>
            <Link to="/youtube-transcript-generator" className="rounded-xl border border-white/20 hover:border-white/40 px-8 py-3 font-bold">Paste YouTube link</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
