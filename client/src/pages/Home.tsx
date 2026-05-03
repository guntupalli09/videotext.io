import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

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

const stickyMessages = {
  default: 'Upload now → get clean transcript instantly',
  output: 'Get this output in ~3 minutes',
  comparison: 'Stop wasting time → try this now',
  footer: 'Upload now → get clean transcript instantly',
} as const;

export default function Home() {
  const [showSticky, setShowSticky] = useState(false);
  const [stickyMessage, setStickyMessage] = useState<string>(stickyMessages.default);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;

        const scrollY = window.scrollY;
        const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = pageHeight > 0 ? scrollY / pageHeight : 0;

        setShowSticky(progress > 0.24);

        const outputTop = document.getElementById('output-preview')?.offsetTop ?? Number.MAX_SAFE_INTEGER;
        const comparisonTop = document.getElementById('comparison')?.offsetTop ?? Number.MAX_SAFE_INTEGER;
        const footerTop = document.getElementById('final-cta')?.offsetTop ?? Number.MAX_SAFE_INTEGER;

        if (scrollY >= footerTop - window.innerHeight * 0.5) {
          setStickyMessage(stickyMessages.footer);
        } else if (scrollY >= comparisonTop - window.innerHeight * 0.4) {
          setStickyMessage(stickyMessages.comparison);
        } else if (scrollY >= outputTop - window.innerHeight * 0.35) {
          setStickyMessage(stickyMessages.output);
        } else {
          setStickyMessage(stickyMessages.default);
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ctaClass =
    'inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-bold cursor-pointer transition duration-200 ease-out hover:scale-[1.02] active:scale-[0.99]';

  return (
    <main className="bg-gray-950 text-white min-h-screen pb-36">
      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="text-violet-400 text-xs font-extrabold tracking-[0.2em] uppercase">VideoText.io</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-black leading-tight">2-Hour Video → Transcript in 3–5 Minutes</h1>
          <p className="mt-5 text-lg text-white/80 max-w-3xl">
            No editing. No waiting. No multi-tool workflow.
          </p>
          <p className="mt-2 text-base text-white/85 max-w-3xl">Get clean transcript, summary, chapters, and subtitles in minutes.</p>
          <p className="mt-2 text-white/85 max-w-3xl">Replace your current setup and manual cleanup in one step.</p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/open" className={`${ctaClass} bg-violet-500 hover:bg-violet-400 shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]`}>Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
            <p className="text-xs text-white/70">No signup required • Files deleted after processing • Works with long videos</p>
            <p className="text-xs text-violet-300">Takes less than 30 seconds to try.</p>
            <Link to="/youtube-transcript-generator" className={`${ctaClass} border border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.06]`}>
              Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/85">
            {trustBullets.map((item) => (
              <li key={item} className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">✓ {item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="output-preview" className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold">See what you get in minutes</h2>
          <p className="mt-3 text-white/75">Automatically generated. No editing required.</p>
          <p className="mt-2 text-white/90 font-semibold">This is exactly what you'll get from your file.</p>

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
          <p className="mt-2 text-white/85">First transcript lines appear in seconds.</p>
          <p className="mt-1 text-white/90 font-semibold">Your transcript starts almost immediately after upload.</p>
          <Link to="/open" className={`${ctaClass} mt-4 bg-violet-500 hover:bg-violet-400 shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]`}>Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-extrabold">No manual cleanup</h2>
          <p className="mt-4 text-white/85">Most transcription tools dump raw text. You still fix everything.</p>
          <ul className="mt-4 space-y-2 text-white/80">
            <li>• fix punctuation</li>
            <li>• fix speakers</li>
            <li>• reformat text</li>
            <li>• export manually</li>
          </ul>
          <p className="mt-5 text-white/90 font-semibold">VideoText skips all of that.</p>
          <p className="mt-1 text-violet-300 font-semibold">You get clean, structured output — ready to use.</p>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-3xl font-extrabold">Stop wasting 30 minutes per file.</h2>
          <p className="mt-3 text-white/80">Most tools don't save time — they just shift the work. That's hours lost every week.</p>
          <ul className="mt-5 space-y-2 text-white/80">
            <li>• Still cleaning messy outputs?</li>
            <li>• Still using multiple tools for transcript + summaries + subtitles?</li>
          </ul>

          <div className="mt-8 grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><h3 className="font-bold">Descript</h3><p className="mt-2 text-white/75">Slower processing on long videos, editing pass often needed.</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><h3 className="font-bold">Otter</h3><p className="mt-2 text-white/75">Good for live notes, but raw output usually needs cleanup.</p></div>
            <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-4"><h3 className="font-bold text-violet-300">VideoText</h3><p className="mt-2 text-white/90">Fast processing, structured output, and no cleanup workflow.</p></div>
          </div>

          <Link to="/open" className={`${ctaClass} mt-8 bg-violet-500 hover:bg-violet-400 shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]`}>Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
          <p className="mt-3 text-xs text-white/70">No signup required • Files deleted after processing • Works with long videos</p>
          <p className="mt-1 text-xs text-violet-300">Takes less than 30 seconds to try.</p>
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
          <h2 className="text-3xl font-extrabold">Ready-to-use outputs. No formatting required.</h2>
          <p className="mt-3 text-white/80 max-w-3xl">Download in the format you already use. No cleanup. No conversion steps.
          Everything exported in one click. No formatting. No conversions.</p>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <article className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold">Documents</h3>
              <ul className="mt-3 space-y-2 text-white/85 text-sm">
                <li>PDF → Clean transcript</li>
                <li>DOCX → Ready to edit</li>
                <li>3-column → Speaker | Timestamp | Dialogue</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold">Subtitles</h3>
              <ul className="mt-3 space-y-2 text-white/85 text-sm">
                <li>SRT (Original)</li>
                <li>SRT (Translated)</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold">Structured</h3>
              <ul className="mt-3 space-y-2 text-white/85 text-sm">
                <li>JSON → Developer-ready</li>
                <li>CSV → Spreadsheet-ready</li>
                <li>Notion → Import directly</li>
                <li>TXT → Simple text</li>
              </ul>
            </article>
          </div>

          <p className="mt-7 text-violet-300 font-extrabold text-2xl leading-tight">Most tools give you raw text. You still format it. VideoText gives you ready-to-use files.</p>

          <div className="mt-7 rounded-xl border border-white/10 bg-black/30 p-5">
            <h3 className="text-lg font-bold">Works with your workflow</h3>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-white/85">
              <li>Editors → DOCX / PDF</li>
              <li>Developers → JSON / CSV</li>
              <li>Creators → SRT subtitles</li>
              <li>Teams → Notion-ready</li>
            </ul>
          </div>

          <p className="mt-6 text-white/90">Skip formatting, exporting, and converting — everything is ready instantly.</p>

          <Link to="/open" className={`${ctaClass} mt-6 bg-violet-500 hover:bg-violet-400 shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]`}>
            Upload your video → get ready-to-use files
          </Link>
          <p className="mt-3 text-xs text-white/70">No signup required • Files deleted after processing • Works with long videos</p>
          <p className="mt-1 text-xs text-violet-300">Takes less than 30 seconds to try.</p>
        </div>
      </section>

      <section id="comparison" className="border-b border-white/10">
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
              <tr><td className="py-3 pr-4 text-violet-300 font-bold">VideoText</td><td className="py-3 pr-4 text-violet-300 font-bold"><strong>~3–5 min for 2h video</strong></td><td className="py-3 pr-4"><strong>Publish-ready</strong></td><td className="py-3 pr-4"><strong>No</strong></td><td className="py-3 pr-4">Transcript + summary + chapters + subtitles</td></tr>
            </tbody>
          </table>
          <p className="mt-4 text-violet-300 font-semibold">Everything generated together. No manual steps.</p>

          <Link to="/open" className={`${ctaClass} mt-8 bg-violet-500 hover:bg-violet-400 shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]`}>Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
          <p className="mt-3 text-xs text-white/70">No signup required • Files deleted after processing • Works with long videos</p>
          <p className="mt-1 text-xs text-violet-300">Takes less than 30 seconds to try.</p>
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

      <section id="final-cta">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-black">Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</h2>
          <p className="mt-4 text-white/80">No signup required. Files deleted after processing. Works with long videos.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/open" className={`${ctaClass} bg-violet-500 hover:bg-violet-400 shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]`}>Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
            <Link to="/youtube-transcript-generator" className={`${ctaClass} border border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.06]`}>Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
          </div>
          <p className="mt-3 text-xs text-white/70">No signup required • Files deleted after processing • Works with long videos</p>
          <p className="mt-1 text-xs text-violet-300">Takes less than 30 seconds to try.</p>
        </div>
      </section>

      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-6xl px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <aside className="rounded-2xl border border-violet-400/30 bg-gray-900/95 backdrop-blur shadow-2xl shadow-violet-900/40 p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="font-extrabold text-base md:text-lg text-white">{stickyMessage}</p>
                <p className="text-xs text-white/65 mt-1">No signup required • Files deleted after processing</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
                <Link to="/open" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-500 hover:bg-violet-400 px-5 text-sm font-bold transition duration-200 hover:scale-[1.02] shadow-[0_0_0_rgba(139,92,246,0)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]">Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
                <Link to="/youtube-transcript-generator" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 hover:border-white/45 bg-white/[0.02] hover:bg-white/[0.07] px-5 text-sm font-bold transition duration-200 hover:scale-[1.02]">Upload your video → get clean transcript, summary & subtitles in minutes (takes &lt;30 seconds to try)</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
