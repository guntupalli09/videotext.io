import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Languages,
  Wrench,
  Flame,
  Package,
  FolderSync,
  ChevronRight,
  Mic,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

const SPOTLIGHT_TOOLS = [
  {
    id: 'video-to-transcript',
    badge: 'Most popular',
    badgeColor: 'bg-violet-500/15 text-violet-300 border border-violet-500/20',
    icon: FileText,
    name: 'Video → Transcript',
    tagline: 'From video to words at machine speed.',
    description:
      'Upload any video and get a clean, timestamped transcript. AI-powered with 98.5% accuracy. Export as TXT, PDF, DOCX, or JSON.',
    bullets: ['Speaker detection & labels', 'Auto chapters & summary', '50+ languages supported'],
    gradient: 'from-violet-500 to-indigo-600',
    glowColor: 'rgba(139,92,246,0.08)',
    href: '/video-to-transcript',
    outputPreview: [
      { time: '00:00', text: "Welcome back to the channel. Today we're diving into..." },
      { time: '00:08', text: 'The strategy that changed everything for my workflow was...' },
      { time: '00:21', text: 'Let me walk you through exactly how to set this up...' },
    ],
  },
  {
    id: 'voice-recorder',
    badge: 'New',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
    icon: Mic,
    name: 'Voice → Text',
    tagline: 'Speak naturally. Get an accurate transcript instantly.',
    description:
      'Record up to 1 hour directly in your browser — no app, no upload. AI transcribes with 98.5% accuracy across 99 languages. Copy or download in one click.',
    bullets: ['Noise suppression built-in', '99 languages auto-detected', 'Up to 1 hour recording', 'Translation to 70+ languages'],
    gradient: 'from-purple-500 to-violet-600',
    glowColor: 'rgba(168,85,247,0.08)',
    href: '/voice-recorder',
    outputPreview: [
      { time: '00:03', text: 'Welcome everyone, today we are going to cover...' },
      { time: '00:11', text: 'The key insight that changed how I approach this is...' },
      { time: '00:24', text: 'Let me break it down into three simple steps for you.' },
    ],
  },
];

const SECONDARY_TOOLS = [
  {
    icon: MessageSquare,
    name: 'Video → Subtitles',
    description: 'Generate SRT and VTT subtitle files for any video. Timed, formatted, ready to upload.',
    gradient: 'from-blue-500 to-blue-600',
    accent: 'text-blue-400',
    href: '/video-to-subtitles',
  },
  {
    icon: Languages,
    name: 'Translate Subtitles',
    description: 'Convert existing subtitles to Arabic, Hindi, Spanish, French, and 50+ other languages.',
    gradient: 'from-pink-500 to-purple-600',
    accent: 'text-pink-400',
    href: '/translate-subtitles',
  },
  {
    icon: Wrench,
    name: 'Fix Subtitles',
    description: 'Auto-correct timing drift, overlapping cues, grammar, and formatting in any SRT/VTT file.',
    gradient: 'from-emerald-500 to-green-600',
    accent: 'text-emerald-400',
    href: '/fix-subtitles',
  },
  {
    icon: Flame,
    name: 'Burn Subtitles',
    description: 'Hardcode captions permanently into your video file. Great for social media reach.',
    gradient: 'from-orange-500 to-red-500',
    accent: 'text-orange-400',
    href: '/burn-subtitles',
  },
  {
    icon: Package,
    name: 'Compress Video',
    description: 'Reduce file size by up to 80% while keeping quality high. Web, mobile, archive presets.',
    gradient: 'from-cyan-500 to-blue-600',
    accent: 'text-cyan-400',
    href: '/compress-video',
  },
  {
    icon: FolderSync,
    name: 'Batch Processing',
    description: 'Upload a whole season at once. Process 50+ videos in parallel and download as a ZIP.',
    gradient: 'from-indigo-500 to-purple-600',
    accent: 'text-indigo-400',
    href: '/batch-process',
  },
];


function SpotlightCard({ tool, index }: { tool: (typeof SPOTLIGHT_TOOLS)[0]; index: number }) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.13, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={tool.href}
        onClick={() => trackEvent('tool_selected', { tool: tool.name, path: tool.href })}
        className="block h-full"
      >
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.22 }}
          className="group relative h-full rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900 overflow-hidden hover:border-violet-300/60 dark:hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/8 transition-all duration-300"
          style={{ boxShadow: `0 0 0 0 ${tool.glowColor}` }}
        >
          {/* Subtle top gradient line */}
          <div className={`h-px bg-gradient-to-r ${tool.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

          <div className="relative p-6 sm:p-8">
            {/* Badge + icon row */}
            <div className="flex items-start justify-between mb-6">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tool.badgeColor}`}>
                {tool.badge}
              </span>
            </div>

            {/* Copy */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 font-display transition-colors duration-500">
              {tool.name}
            </h3>
            <p className={`text-sm font-semibold mb-3 bg-gradient-to-r ${tool.gradient} bg-clip-text text-transparent`}>
              {tool.tagline}
            </p>
            <p className="text-sm text-gray-500 dark:text-white/45 leading-relaxed mb-5 transition-colors duration-500">
              {tool.description}
            </p>

            {/* Bullet points */}
            <ul className="space-y-2 mb-6">
              {tool.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-white/55 transition-colors duration-500"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            {/* Sample output preview */}
            <div className="rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-3.5 mb-6 transition-colors duration-500">
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400/80 font-semibold uppercase tracking-wide">
                  Sample output
                </span>
              </div>
              <div className="space-y-1.5">
                {tool.outputPreview.map((line) => (
                  <div key={line.time} className="flex gap-2.5 items-start">
                    <span className="text-[9px] font-mono text-violet-400/50 shrink-0 w-8 pt-0.5">
                      {line.time}
                    </span>
                    <p className="text-[11px] text-gray-600 dark:text-white/50 leading-snug transition-colors duration-500">
                      {line.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-sm font-bold text-violet-600 dark:text-violet-400 group-hover:gap-3 transition-all">
              Try it free
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function SecondaryCard({ tool, index }: { tool: (typeof SECONDARY_TOOLS)[0]; index: number }) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
    >
      <Link to={tool.href} onClick={() => trackEvent('tool_selected', { tool: tool.name, path: tool.href })}>
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="group h-full rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900 p-5 hover:border-violet-300/60 dark:hover:border-violet-500/25 hover:shadow-lg transition-all duration-300"
        >
          <div
            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 shadow-md`}
          >
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors font-display">
            {tool.name}
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-white/40 leading-relaxed mb-3 transition-colors duration-500">
            {tool.description}
          </p>
          <div className={`flex items-center gap-1 text-[12px] font-semibold ${tool.accent} group-hover:gap-2 transition-all`}>
            Try now <ChevronRight className="w-3 h-3" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="tools" className="py-12 bg-white dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <p className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            The full toolkit
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 font-display leading-tight transition-colors duration-500">
            Every tool your workflow needs.
            <span className="block text-gray-300 dark:text-white/20 mt-1">Nothing you don't.</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-xl mx-auto transition-colors duration-500">
            Eight purpose-built tools covering every stage of the video captioning pipeline. No bloated editor. No learning curve.
          </p>
        </motion.div>

        {/* Spotlight tools — 2 large cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {SPOTLIGHT_TOOLS.map((tool, i) => (
            <SpotlightCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>

        {/* Secondary tools — 3-col grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECONDARY_TOOLS.map((tool, i) => (
            <SecondaryCard key={tool.name} tool={tool} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <Link to="/video-to-transcript">
            <motion.span
              whileHover={{ scale: 1.03, y: -1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
            >
              Start transcribing free
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
          <p className="text-xs text-gray-400 dark:text-white/25 mt-3">No credit card · Files deleted immediately · 3 free imports</p>
        </motion.div>
      </div>
    </section>
  );
}
