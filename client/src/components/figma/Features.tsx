import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  ClipboardCheck,
} from "lucide-react";
import { trackEvent } from "../../lib/analytics";

const SPOTLIGHT_TOOLS = [
  {
    id: "video-to-transcript",
    badge: "Most popular",
    badgeColor: "bg-blue-600/15 text-blue-300 border border-blue-500/20",
    icon: FileText,
    name: "Video → Transcript",
    tagline: "From video to words at machine speed.",
    description:
      "Upload any video and get a clean, timestamped transcript. AI-powered with 98.5% accuracy. Export as TXT, PDF, DOCX, or JSON.",
    bullets: [
      "Speaker detection & labels",
      "Auto chapters & summary",
      "Pro: share read-only transcript links",
      "99 languages · Translation to 70+",
    ],
    gradient: "from-blue-600 to-blue-700",
    glowColor: "rgba(139,92,246,0.08)",
    href: "/video-to-transcript",
    cta: "Upload a video, get transcript",
    outputPreview: [
      {
        time: "00:00",
        text: "Welcome back to the channel. Today we're diving into...",
      },
      {
        time: "00:08",
        text: "The strategy that changed everything for my workflow was...",
      },
      {
        time: "00:21",
        text: "Let me walk you through exactly how to set this up...",
      },
    ],
  },
  {
    id: "guideline-format",
    badge: "Client-ready",
    badgeColor: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
    icon: ClipboardCheck,
    name: "Format → Client guidelines",
    tagline: "Validate + format transcripts to match client rules.",
    description:
      "Drop in transcript text and get a clear pass/fail summary, suggested fixes, and rule-by-rule checks — tuned for Rev, GoTranscript, TranscribeMe, Scribie, and custom client style guides.",
    bullets: [
      "Validation summary (what failed + why)",
      "Rule cards you can edit per client",
      "Consistency checks (labels, numbers, punctuation)",
      "Export cleaned text for delivery",
    ],
    gradient: "from-blue-600 to-blue-700",
    glowColor: "rgba(37,99,235,0.07)",
    href: "/guideline-format",
    cta: "Format transcript →",
    outputPreview: [
      { time: "SUM", text: "Pass: 38 • Fix: 7 • Risk: Low • Ready to deliver" },
      {
        time: "Rule",
        text: "Speaker labels: consistent casing + colon formatting",
      },
      {
        time: "Rule",
        text: "Numbers: 1–9 spelled out, 10+ as numerals (client-specific)",
      },
    ],
  },
  {
    id: "translate-subtitles",
    badge: "70+ languages",
    badgeColor: "bg-pink-500/15 text-pink-300 border border-pink-500/20",
    icon: Languages,
    name: "Translate",
    tagline: "Translate subtitles and docs — keep formatting.",
    description:
      "Translate subtitles, documents, DOCX, TXT, and JSON into 70+ languages with formatting preserved.",
    bullets: [
      "Subtitles + documents",
      "Formatting preserved",
      "Fast turnaround",
      "Export in common formats",
    ],
    gradient: "from-pink-500 to-blue-700",
    glowColor: "rgba(236,72,153,0.07)",
    href: "/translate-subtitles",
    cta: "Translate your file",
    outputPreview: [
      { time: "EN", text: "Let’s get started — here are the three key steps." },
      { time: "ES", text: "Empecemos: estos son los tres pasos clave." },
      { time: "FR", text: "Commençons — voici les trois étapes clés." },
    ],
  },
  // Temporarily disabled — will reactivate later.
  // {
  //   id: 'youtube-transcript',
  //   badge: 'No download needed',
  //   badgeColor: 'bg-red-500/15 text-red-300 border border-red-500/20',
  //   icon: Youtube,
  //   name: 'YouTube → Transcript',
  //   tagline: 'Paste a URL. Get the full transcript in seconds.',
  //   description:
  //     'Extract transcripts from any YouTube video — no download, no upload. Get the full text, AI summary, chapters, and export-ready output instantly.',
  //   bullets: ['No video download required', 'AI summary & chapters included', 'Export TXT, PDF, DOCX, JSON', '99 languages · Translation to 70+'],
  //   gradient: 'from-red-500 to-rose-600',
  //   glowColor: 'rgba(239,68,68,0.08)',
  //   href: '/youtube-transcript-generator',
  //   cta: 'Paste URL, get transcript',
  //   outputPreview: [
  //     { time: '00:00', text: "Hey everyone! Welcome back to the channel. In today's video..." },
  //     { time: '00:12', text: "We're covering the three biggest mistakes I see creators make..." },
  //     { time: '00:28', text: 'The first one is probably the most common, and easy to fix...' },
  //   ],
  // },
];

const SECONDARY_TOOLS = [
  {
    icon: Mic,
    name: "Voice → Text",
    description:
      "Record in your browser — no file, no upload. Transcript in seconds.",
    gradient: "from-blue-600 to-blue-700",
    accent: "text-blue-400",
    href: "/voice-recorder",
  },
  {
    icon: MessageSquare,
    name: "Video → Subtitles",
    description:
      "Generate SRT and VTT subtitle files for any video. Timed, formatted, ready to upload.",
    gradient: "from-blue-500 to-blue-600",
    accent: "text-blue-400",
    href: "/video-to-subtitles",
  },
  {
    icon: FolderSync,
    name: "Batch Processing",
    description:
      "Upload a whole season at once. Process 50+ videos in parallel and download as a ZIP.",
    gradient: "from-blue-500 to-blue-700",
    accent: "text-blue-400",
    href: "/batch-process",
  },
  {
    icon: Wrench,
    name: "Fix Subtitles",
    description:
      "Auto-correct timing drift, overlapping cues, grammar, and formatting in any SRT/VTT file.",
    gradient: "from-emerald-500 to-green-600",
    accent: "text-emerald-400",
    href: "/fix-subtitles",
  },
  {
    icon: Flame,
    name: "Burn Subtitles",
    description:
      "Hardcode captions permanently into your video file. Great for social media reach.",
    gradient: "from-orange-500 to-red-500",
    accent: "text-orange-400",
    href: "/burn-subtitles",
  },
  {
    icon: Package,
    name: "Compress Video",
    description:
      "Reduce file size by up to 80% while keeping quality high. Web, mobile, archive presets.",
    gradient: "from-cyan-500 to-blue-600",
    accent: "text-cyan-400",
    href: "/compress-video",
  },
];

function SpotlightCard({
  tool,
  index,
}: {
  tool: (typeof SPOTLIGHT_TOOLS)[0];
  index: number;
}) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        delay: index * 0.13,
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        to={tool.href}
        onClick={() =>
          trackEvent("tool_selected", { tool: tool.name, path: tool.href })
        }
        className="block h-full"
      >
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.22 }}
          className="group relative h-full rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900 overflow-hidden hover:border-blue-300/60 dark:hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/8 transition-all duration-300"
          style={{ boxShadow: `0 0 0 0 ${tool.glowColor}` }}
        >
          {/* Subtle top gradient line */}
          <div
            className={`h-px bg-gradient-to-r ${tool.gradient} opacity-50 group-hover:opacity-100 transition-opacity`}
          />

          <div className="relative p-4">
            {/* Badge + icon row */}
            <div className="flex items-start justify-between mb-6">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tool.badgeColor}`}
              >
                {tool.badge}
              </span>
            </div>

            {/* Copy */}
            <h3 className="mb-1 text-sm font-medium text-gray-900 transition-colors duration-500 dark:text-white">
              {tool.name}
            </h3>
            <p
              className={`mb-3 text-[13px] font-medium bg-gradient-to-r ${tool.gradient} bg-clip-text text-transparent`}
            >
              {tool.tagline}
            </p>
            <p className="mb-4 text-[13px] leading-[1.55] text-gray-500 transition-colors duration-500 dark:text-white/45">
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
                    <span className="text-[9px] font-mono text-blue-400/50 shrink-0 w-8 pt-0.5">
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
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-all group-hover:gap-3 group-hover:text-gray-900 dark:text-white/45 dark:group-hover:text-white">
              {tool.cta}
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function SecondaryCard({
  tool,
  index,
}: {
  tool: (typeof SECONDARY_TOOLS)[0];
  index: number;
}) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
    >
      <Link
        to={tool.href}
        onClick={() =>
          trackEvent("tool_selected", { tool: tool.name, path: tool.href })
        }
      >
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="group h-full rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300/60 dark:hover:border-blue-500/25 hover:shadow-lg transition-all duration-300"
        >
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 shadow-md`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="mb-1.5 text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
            {tool.name}
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-white/40 leading-relaxed mb-3 transition-colors duration-500">
            {tool.description}
          </p>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gray-500 transition-all group-hover:gap-2 group-hover:text-gray-900 dark:text-white/45 dark:group-hover:text-white">
            Try now <ChevronRight className="w-3 h-3" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function Features() {
  return (
    <section
      id="tools"
      className="py-12 bg-white dark:bg-gray-950 transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            The full toolkit
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 font-display leading-tight transition-colors duration-500">
            Everything to deliver client-ready transcripts.
            <span className="block text-gray-300 dark:text-white/20 mt-1">
              One platform. Every stage of your workflow.
            </span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-xl mx-auto transition-colors duration-500">
            Transcribe, format against client guidelines, and translate into 70+
            languages — purpose-built for professional transcript production and
            delivery. No bloated editor. No learning curve.
          </p>
        </motion.div>

        {/* Spotlight tools — 3 equal cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              Start transcribing free
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
          <p className="text-xs text-gray-400 dark:text-white/25 mt-3">
            No credit card · Files deleted immediately · 3 free imports
          </p>
        </motion.div>
      </div>
    </section>
  );
}
