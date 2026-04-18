import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isLoggedIn } from '../lib/auth';
import { Hero } from '../components/figma/Hero';
import { Features } from '../components/figma/Features';
import { HowItWorks } from '../components/figma/HowItWorks';
import { Testimonials } from '../components/landing/Testimonials';
import { UseCases } from '../components/landing/UseCases';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { ArrowRight } from 'lucide-react';
import { PRIMARY_DEFINITION, PRODUCT_CATEGORY, CORE_VALUE } from '../lib/productDna';

// Conversion order (psychologically optimised):
// 1. Hero — 3-second clarity + CTA
// 2. Features — full toolkit showcase
// 3. Use Cases — ICP targeting
// 4. How It Works — dark, de-risk the signup
// 5. Testimonials — social proof
// 6. Pricing — frictionless plans
// 7. FAQ — objection handling
// 8. Free Tools — non-converter catchment
// 9. Final CTA — dark, bold close


const PLANS = [
  {
    name: 'Free',
    price: '$0',
    detail: '3 imports per day',
    cta: null,
    note: 'No card needed',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$10',
    period: '/mo',
    detail: 'No fixed limits — billed annually',
    cta: 'Get started',
    popular: true,
    badge: 'Best Value',
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="relative py-12 bg-gray-950 transition-colors duration-500 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/[0.08] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <p className="text-sm font-bold text-violet-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3 font-display">
            Start free. Scale when ready.
          </h2>
          {!isLoggedIn() && (
            <p className="text-white/50 text-[15px]">No credit card required to try.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
        >
          {PLANS.map((plan) => (
            <Link
              key={plan.name}
              to="/pricing"
              className={`group relative rounded-2xl p-6 text-left transition-all duration-200 ${
                plan.popular
                  ? 'bg-gradient-to-b from-violet-600 to-indigo-700 text-white shadow-2xl shadow-violet-500/30 ring-1 ring-violet-400/30'
                  : 'bg-white/[0.04] text-white hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold text-white bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 rounded-full shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}

              <p className="font-bold text-lg mb-1">{plan.name}</p>
              <p className="text-3xl font-extrabold mb-1">
                {plan.price}
                {plan.period && (
                  <span className="text-sm font-normal opacity-60">{plan.period}</span>
                )}
              </p>
              <p className={`text-[13px] mb-4 ${plan.popular ? 'text-white/75' : 'text-white/45'}`}>
                {plan.detail}
              </p>

              {plan.cta ? (
                <div
                  className={`inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all ${
                    plan.popular ? 'text-white' : 'text-violet-400 group-hover:text-violet-300'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              ) : (
                <p className="text-[11px] opacity-50 font-medium">{plan.note}</p>
              )}
            </Link>
          ))}
        </motion.div>

        <p className="text-center mt-8">
          <Link
            to="/pricing"
            className="text-white/50 hover:text-white/80 font-medium underline underline-offset-2 text-sm transition-colors"
          >
            See full pricing & feature comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* 1 — Hero */}
      <Hero />

      <section className="py-8 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">{PRODUCT_CATEGORY}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{PRIMARY_DEFINITION}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Core value: {CORE_VALUE}</p>
        </div>
      </section>


      {/* 2 — Features / toolkit */}
      <Features />

      {/* 3 — Use cases / ICP targeting */}
      <UseCases />

      {/* 4 — How it works (dark) */}
      <HowItWorks />

      {/* 5 — Testimonials */}
      <Testimonials />

      {/* 6 — Pricing (dark) */}
      <PricingSection />

      {/* 8 — FAQ */}
      <FAQ />

      {/* 8.5 — High-intent transcription hub links */}
      <section className="bg-white dark:bg-gray-950 py-10 border-t border-gray-100 dark:border-gray-800 transition-colors duration-500">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-2">
              High-intent guides
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white font-display transition-colors duration-500">
              Choose your workflow path (without competing with the core tool page)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl transition-colors duration-500">
              Core entry points are <span className="font-semibold text-gray-700 dark:text-gray-200">Video to Transcript</span>, <span className="font-semibold text-gray-700 dark:text-gray-200">Voice to Text</span>, and <span className="font-semibold text-gray-700 dark:text-gray-200">YouTube Transcript Generator</span>. These supporting pages handle specific contexts like comparisons and meeting workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Video to Transcript (Primary)', path: '/video-to-transcript', desc: 'Main page for broad video-to-text and transcript intent' },
              { label: 'Best Transcription Tool', path: '/best-transcription-tool', desc: 'Decision support by speed, outputs, and workflow fit' },
              { label: 'YouTube Transcript Generator (Primary)', path: '/youtube-transcript-generator', desc: 'Paste a YouTube link and generate transcript-ready output in minutes' },
              { label: 'Podcast Transcription Tool', path: '/podcast-transcription-tool', desc: 'Create show notes, clips, and searchable transcript assets' },
              { label: 'Meeting Transcription Tool', path: '/meeting-transcription-tool', desc: 'Turn calls into summaries, transcripts, and follow-ups' },
              { label: 'Google Meet Transcript', path: '/google-meet-transcript', desc: 'Download the Meet recording, upload, and get transcript outputs fast' },
              { label: 'Zoom Meeting Transcript', path: '/zoom-meeting-transcript', desc: 'Download Zoom recording, upload once, and get structured transcript output' },
              { label: 'Meeting Recording to Transcript', path: '/meeting-recording-to-transcript', desc: 'Hub workflow for Zoom, Meet, Teams, and webinar recordings' },
              { label: 'Interview Transcription Tool', path: '/interview-transcription-tool', desc: 'Speaker-structured transcripts for newsroom and research' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200"
              >
                <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9 — Free Tools cluster */}
      <section className="bg-gray-50 dark:bg-gray-900/60 border-y border-gray-100 dark:border-gray-800 py-8 transition-colors duration-500">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-2">
                Free — no account needed
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white font-display transition-colors duration-500">
                Free subtitle &amp; video tools
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md transition-colors duration-500">
                Convert, validate, fix, and analyse subtitle files instantly in your browser. Nothing uploaded, nothing stored.
              </p>
            </div>
            <Link
              to="/subtitle-tools"
              className="text-sm font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 whitespace-nowrap transition-colors hidden sm:flex items-center gap-1"
            >
              View all 19 tools <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'SRT → VTT Converter', path: '/tools/srt-to-vtt', desc: 'For HTML5 video players & web apps', icon: '⇄' },
              { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Catch timing overlaps & format errors', icon: '✓' },
              { label: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Verify Netflix & EBU CPS limits', icon: '⏱' },
              { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Fix out-of-sync subtitles instantly', icon: '↔' },
              { label: 'Character Limit Checker', path: '/tools/subtitle-character-checker', desc: 'Check 42-char Netflix line limits', icon: '≤' },
              { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine multiple subtitle files', icon: '⊕' },
            ].map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="group flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200"
              >
                <span className="text-xl leading-none mt-0.5 select-none">{tool.icon}</span>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                    {tool.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              to="/subtitle-tools"
              className="sm:hidden text-sm font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center gap-1"
            >
              View all 19 free tools <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors duration-500">
              Need AI-powered subtitles?{' '}
              <Link to="/video-to-subtitles" className="text-violet-600 dark:text-violet-400 hover:underline font-bold">
                Generate them automatically →
              </Link>
            </p>
          </div>
        </div>
      </section>


      <section className="py-10 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-2">Answer hubs</p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Comparison and benchmark pages (secondary to the core tool)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Video to transcript (core tool)', path: '/video-to-transcript' },
              { label: 'Best transcription tool', path: '/best-transcription-tool' },
              { label: 'Fastest transcription software', path: '/fastest-transcription-software' },
              { label: 'Fastest transcription tool', path: '/fastest-transcription-tool' },
              { label: 'Otter vs VideoText', path: '/otter-vs-videotext' },
              { label: 'Descript vs VideoText', path: '/descript-vs-videotext' },
              { label: 'AI transcription tools', path: '/ai-transcription-tools' },
              { label: 'VideoText vs TurboScribe', path: '/videotext-vs-turboscribe' },
              { label: 'VideoText vs Rev', path: '/videotext-vs-rev' },
              { label: 'Best Otter alternatives', path: '/best-otter-alternatives' },
              { label: 'Best Descript alternatives', path: '/best-descript-alternatives' },
              { label: 'AI transcription workflow', path: '/ai-transcription-workflow' },
              { label: 'Podcast transcription tool', path: '/podcast-transcription-tool' },
              { label: 'Interview transcription tool', path: '/interview-transcription-tool' },
              { label: 'YouTube video to transcript', path: '/youtube-video-to-transcript' },
              { label: 'Transcription benchmark', path: '/transcription-benchmark' },
            ].map((item) => (
              <Link key={item.path} to={item.path} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-violet-700 dark:hover:text-violet-400 hover:border-violet-300">
                {item.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9.5 — Core Tools Grid */}
      <section className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 py-12 transition-colors duration-500">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">All VideoText features</h2>
            <p className="text-gray-600 dark:text-gray-300">Master transcription, subtitles, translation, and more with integrated tools.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Video to Transcript', path: '/video-to-transcript' },
              { label: 'Video to Subtitles', path: '/video-to-subtitles' },
              { label: 'Translate Subtitles', path: '/translate-subtitles' },
              { label: 'Fix Subtitles', path: '/fix-subtitles' },
              { label: 'Burn Subtitles', path: '/burn-subtitles' },
              { label: 'Compress Video', path: '/compress-video' },
              { label: 'Batch Process', path: '/batch-process' },
              { label: 'YouTube Transcripts', path: '/youtube-transcript-generator' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-transparent to-purple-50/20 dark:to-purple-900/10 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:text-violet-700 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 transition-all"
              >
                {item.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 10 — Final CTA */}
      <FinalCTA />
    </div>
  );
}
