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
import { CompetitorSection } from '../components/landing/CompetitorSection';

// Page flow (Descript-inspired conversion order):
// 1. Hero — hook + product demo
// 2. Features — what you get (tools showcase)
// 3. Use Cases — ICP targeting (YouTubers / Podcasters / Agencies)
// 4. How It Works — de-risk the signup (simple 3 steps)
// 5. Testimonials — social proof at the decision point
// 6. Pricing — friction-free plans
// 7. FAQ — objection handling
// 8. Final CTA — dark, bold closing section
// Footer rendered globally by App.tsx

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* 1 — Hero */}
      <Hero />

      {/* 2 — Features / toolkit */}
      <Features />

      {/* 3 — Use cases / ICP targeting */}
      <UseCases />

      {/* 4 — How it works */}
      <HowItWorks />

      {/* 5 — Testimonials */}
      <Testimonials />

      {/* 5.5 — Competitor comparison / speed piggybacking */}
      <CompetitorSection />

      {/* 6 — Pricing */}
      <section id="pricing" className="bg-gradient-to-br from-purple-700 via-violet-700 to-indigo-800 dark:from-violet-900 dark:via-purple-900 dark:to-indigo-950 py-20 transition-colors duration-500">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Start free. Scale when you're ready.
            </h2>
            {!isLoggedIn() && (
              <p className="text-white/70 text-[15px]">No credit card required to try.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { name: 'Free', price: '$0', detail: '3 free imports', cta: null, note: 'No card needed' },
              { name: 'Basic', price: '$19', detail: '450 min / mo', cta: 'Choose', note: null },
              { name: 'Pro', price: '$49', detail: '1,200 min / mo', cta: 'Choose', popular: true, note: 'Best value' },
              { name: 'Agency', price: '$129', detail: '3,000 min / mo', cta: 'Choose', note: null },
            ].map((plan) => (
              <Link
                key={plan.name}
                to="/pricing"
                className={`group rounded-2xl p-5 text-left transition-all duration-200 ${
                  plan.popular
                    ? 'bg-white text-violet-900 shadow-2xl shadow-white/10 ring-2 ring-white/40 hover:ring-white/60'
                    : 'bg-white/10 text-white hover:bg-white/[0.18] backdrop-blur-sm border border-white/10'
                }`}
              >
                {plan.popular && (
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block mb-1">{plan.note}</span>
                )}
                <p className="font-bold text-lg">{plan.name}</p>
                <p className="text-2xl font-extrabold mt-1">
                  {plan.price}
                  <span className="text-sm font-normal opacity-60">/mo</span>
                </p>
                <p className="text-[13px] opacity-80 mt-1">{plan.detail}</p>
                {plan.cta && (
                  <span className={`inline-flex items-center gap-1 mt-4 text-sm font-semibold group-hover:gap-2 transition-all ${plan.popular ? 'text-violet-600' : 'text-white/80'}`}>
                    {plan.cta} <span className="text-base">→</span>
                  </span>
                )}
                {!plan.cta && plan.note && !plan.popular && (
                  <p className="text-[11px] mt-3 opacity-50">{plan.note}</p>
                )}
              </Link>
            ))}
          </motion.div>

          <p className="text-center mt-8">
            <Link
              to="/pricing"
              className="text-white/75 hover:text-white font-medium underline underline-offset-2 text-sm transition-colors"
            >
              See full pricing & feature comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* 7 — FAQ */}
      <FAQ />

      {/* 7.5 — Free Tools cluster — catches non-converters, passes homepage authority into tool pages */}
      <section className="bg-gray-50 dark:bg-gray-900/60 border-y border-gray-100 dark:border-gray-800 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Free — no account needed</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Free subtitle &amp; video tools
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                Convert, validate, fix, and analyse subtitle files instantly in your browser. Nothing uploaded, nothing stored.
              </p>
            </div>
            <Link
              to="/subtitle-tools"
              className="text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 whitespace-nowrap transition-colors hidden sm:block"
            >
              View all 19 tools →
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
                className="group flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all"
              >
                <span className="text-xl leading-none mt-0.5 select-none">{tool.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
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
              className="sm:hidden text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              View all 19 free tools →
            </Link>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Need AI-powered subtitles?{' '}
              <Link to="/video-to-subtitles" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
                Generate them automatically →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* 8 — Final CTA */}
      <FinalCTA />
    </div>
  );
}
