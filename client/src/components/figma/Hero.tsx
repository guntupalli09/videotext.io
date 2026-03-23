import { useRef, useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Play,
  Mic,
  FileText,
  Subtitles,
  Languages,
  CheckCircle2,
  ChevronRight,
  Shield,
  Globe,
  ArrowDown,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

function useTypingEffect(text: string, speed = 28, delay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, started]);
  return displayed;
}

function WaveformBars({ count = 26 }: { count?: number }) {
  const bars = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        h1: 3 + Math.random() * 14,
        h2: 2 + Math.random() * 16,
        h3: 3 + Math.random() * 14,
        dur: 0.7 + Math.random() * 0.55,
      })),
    [count]
  );
  return (
    <div className="flex items-end gap-[2px] h-5">
      {bars.map((b, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-violet-400/50"
          animate={{ height: [`${b.h1}px`, `${b.h2}px`, `${b.h3}px`] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.028 }}
        />
      ))}
    </div>
  );
}

const CREATOR_AVATARS = [
  'https://i.pravatar.cc/80?img=12',
  'https://i.pravatar.cc/80?img=32',
  'https://i.pravatar.cc/80?img=47',
  'https://i.pravatar.cc/80?img=25',
  'https://i.pravatar.cc/80?img=56',
];

function ProductDemo() {
  const line1 = useTypingEffect(
    'Hey everyone, welcome back to the channel. Today I want to share something that completely changed my editing workflow...',
    26,
    2000
  );
  const line2 = useTypingEffect(
    'Instead of spending hours manually typing captions, I just drop my video and the AI handles everything.',
    26,
    6200
  );
  const fullLine1 =
    'Hey everyone, welcome back to the channel. Today I want to share something that completely changed my editing workflow...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.05, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Browser chrome */}
      <div className="rounded-t-2xl border border-b-0 border-white/[0.08] bg-white/[0.03] px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
            <img src="/logo.svg" alt="" className="w-3 h-3 opacity-40" />
            <span className="text-[10px] text-white/30 font-mono">videotext.io/transcript</span>
          </div>
        </div>
      </div>

      {/* Panel body */}
      <div className="rounded-b-2xl border border-white/[0.08] bg-gray-900/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05]">
          {/* Left: video */}
          <div className="p-4 sm:p-5">
            <div className="aspect-video rounded-xl bg-gray-800 border border-white/[0.05] overflow-hidden relative flex items-center justify-center">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1604272986062-67ef7145f0ef?w=400&q=80"
                alt="Creator recording"
                width={400}
                height={225}
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {/* Subtitle overlay */}
              <motion.div
                className="absolute bottom-3 left-3 right-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.2, duration: 0.5 }}
              >
                <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                  <span className="text-[11px] text-white/90">...completely changed my workflow</span>
                </div>
              </motion.div>
              {/* Play button */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ opacity: [0.7, 0.35, 0.7] }}
                transition={{ duration: 2.8, repeat: Infinity }}
              >
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </div>
              </motion.div>
              {/* Processing badge */}
              <motion.div
                className="absolute top-2.5 right-2.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3 }}
              >
                <div className="flex items-center gap-1 bg-violet-600/90 backdrop-blur-sm rounded-md px-2 py-1">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-white"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-[9px] text-white font-medium">Transcribing</span>
                </div>
              </motion.div>
            </div>
            {/* Waveform */}
            <div className="mt-3 flex items-center gap-2">
              <motion.div
                className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Mic className="w-2.5 h-2.5 text-violet-400" />
              </motion.div>
              <div className="flex-1">
                <WaveformBars count={30} />
              </div>
              <span className="text-[9px] font-mono text-white/20 flex-shrink-0">04:32</span>
            </div>
          </div>

          {/* Right: transcript */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-violet-400/60" />
              <span className="text-[11px] font-semibold text-white/50">Transcript</span>
              <motion.div
                className="ml-auto flex items-center gap-1.5"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] text-emerald-400 font-medium">Live</span>
              </motion.div>
            </div>
            <div className="space-y-3 text-[12px] text-white/60 leading-relaxed min-h-[110px]">
              <div className="flex gap-2">
                <span className="text-[9px] font-mono text-violet-400/40 mt-0.5 shrink-0 w-8">00:00</span>
                <p>
                  {line1}
                  {line1.length < fullLine1.length && (
                    <motion.span
                      className="inline-block w-[1.5px] h-3.5 bg-violet-400 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  )}
                </p>
              </div>
              {line1.length >= fullLine1.length && (
                <motion.div
                  className="flex gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-[9px] font-mono text-violet-400/40 mt-0.5 shrink-0 w-8">00:08</span>
                  <p>
                    {line2}
                    <motion.span
                      className="inline-block w-[1.5px] h-3.5 bg-violet-400 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  </p>
                </motion.div>
              )}
            </div>
            {/* Export options */}
            <motion.div
              className="mt-4 pt-3 border-t border-white/[0.05]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.0, duration: 0.5 }}
            >
              <p className="text-[10px] text-white/25 mb-2 font-medium uppercase tracking-wide">Export as</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'SRT', icon: Subtitles, color: 'text-blue-400' },
                  { label: 'TXT', icon: FileText, color: 'text-gray-400' },
                  { label: 'Translate', icon: Languages, color: 'text-pink-400' },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.05] text-[9px] font-medium text-white/35"
                  >
                    <f.icon className={`w-2.5 h-2.5 ${f.color}`} />
                    {f.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom metrics bar */}
        <div className="px-5 py-3 border-t border-white/[0.05] bg-white/[0.015] flex flex-wrap items-center justify-between gap-3">
          {[
            { value: '2M+', label: 'min transcribed' },
            { value: '98.5%', label: 'accuracy' },
            { value: '50+', label: 'languages' },
            { value: '< 3min', label: 'for 2hr video' },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-white/75">{s.value}</span>
              <span className="text-[10px] text-white/30">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0.1, 0.5], [1, 0]);

  return (
    <div ref={ref} className="relative">
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative flex flex-col items-center overflow-hidden bg-gray-950 min-h-screen"
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient glow layers */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-600/[0.13] rounded-full blur-[160px]" />
          <div className="absolute top-[20%] left-[5%] w-[450px] h-[450px] bg-purple-700/[0.08] rounded-full blur-[120px]" />
          <div className="absolute top-[35%] right-[5%] w-[350px] h-[350px] bg-indigo-600/[0.07] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-28 sm:pt-32 pb-8">

          {/* Speed badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center mb-7"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 backdrop-blur-sm">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-violet-400"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <span className="text-[11px] font-semibold text-violet-300 tracking-wide">6× faster than Descript</span>
              <span className="w-px h-3 bg-violet-500/30" />
              <span className="text-[11px] text-white/40">98.5% accuracy</span>
              <span className="w-px h-3 bg-violet-500/30" />
              <span className="text-[11px] text-white/40">Zero data retention</span>
            </div>
          </motion.div>

          {/* H1 — clear, fast comprehension */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center font-display text-5xl sm:text-6xl md:text-[4.25rem] lg:text-[5rem] font-extrabold tracking-tight text-white leading-[1.04] mb-5"
          >
            Video to Text.
            <span className="block mt-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              In Minutes.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-center text-[17px] sm:text-[18px] text-white/50 max-w-lg mx-auto leading-relaxed mb-8"
          >
            AI transcription that's 6× faster than the competition — with 98.5% accuracy and{' '}
            <span className="text-white/75 font-medium">files deleted the moment processing ends.</span>
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5"
          >
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all overflow-hidden text-[15px]"
              >
                <span className="absolute inset-0 bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  Start Free — No Card Needed
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.span>
            </Link>
            <Link
              to="/guide"
              className="flex items-center gap-2 px-5 py-4 text-white/45 hover:text-white/75 transition-colors text-sm font-medium"
            >
              <div className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.04]">
                <Play className="w-3 h-3 ml-0.5" />
              </div>
              See how it works
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10 text-[12px] text-white/35"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Files deleted immediately
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
              No credit card required
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              50+ languages
            </span>
          </motion.div>

          {/* Social proof row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center -space-x-2">
                {CREATOR_AVATARS.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.95 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ImageWithFallback
                      src={src}
                      alt=""
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full border-2 border-gray-950 object-cover"
                    />
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.25, duration: 0.3 }}
                  className="w-7 h-7 rounded-full border-2 border-gray-950 bg-violet-500/25 flex items-center justify-center"
                >
                  <span className="text-[8px] font-bold text-violet-300">2K+</span>
                </motion.div>
              </div>
              <p className="text-[12px] text-white/35">
                <span className="text-white/65 font-semibold">2,000+ creators</span> trust VideoText
              </p>
            </div>

            <div className="hidden sm:block w-px h-4 bg-white/10" />

            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-[12px] text-white/35 ml-0.5">4.9 / 5</span>
            </div>
          </motion.div>

          {/* Product demo */}
          <ProductDemo />

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.6, duration: 0.8 }}
            className="flex justify-center mt-10"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[9px] uppercase tracking-widest text-white/20">Scroll</span>
              <ArrowDown className="w-3.5 h-3.5 text-white/20" />
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent z-[8]" />
      </motion.section>
    </div>
  );
}
