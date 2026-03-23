import { useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Play,
  Mic,
  Shield,
  Globe,
  CheckCircle2,
  ArrowDown,
  Upload,
  ChevronRight,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

const CREATOR_AVATARS = [
  'https://i.pravatar.cc/80?img=12',
  'https://i.pravatar.cc/80?img=32',
  'https://i.pravatar.cc/80?img=47',
  'https://i.pravatar.cc/80?img=25',
  'https://i.pravatar.cc/80?img=56',
];

const ACCEPTED = [
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
  'video/x-msvideo', 'video/mpeg', 'video/ogg', 'video/3gpp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
  'audio/flac', 'audio/aac',
];

function HeroDropzone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    (window as Window & { __videotextPendingFile?: File }).__videotextPendingFile = file;
    navigate('/video-to-transcript');
  }, [navigate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={onInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a video or audio file here, or click to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12
          flex flex-col items-center gap-4 transition-all duration-200 select-none
          ${dragging
            ? 'border-violet-400 bg-violet-500/10 scale-[1.015]'
            : 'border-white/20 bg-white/[0.03] hover:border-violet-400/60 hover:bg-violet-500/[0.06]'
          }
        `}
      >
        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-violet-500/20' : 'bg-white/[0.05]'
        }`}>
          {dragging
            ? <Upload className="w-7 h-7 text-violet-400" />
            : <span className="text-4xl" aria-hidden>🎬</span>
          }
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white font-bold text-lg leading-snug">
            {dragging ? 'Release to upload' : 'Drop a video file here'}
          </p>
          <p className="text-white/40 text-sm mt-1">
            MP4, MOV, WebM, MKV — or click to browse
          </p>
        </div>

        {/* Trust micro-copy */}
        <div className="flex items-center gap-3 text-[11px] text-white/25 mt-1">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500/60" />
            No signup required
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span>Files deleted after processing</span>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[11px] text-white/25 font-medium tracking-wider uppercase">or</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* Record option */}
      <Link
        to="/voice-recorder"
        className="group flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/[0.06] px-5 py-4 transition-all duration-200"
      >
        {/* Mic icon */}
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/25 transition-colors">
          <Mic className="w-5 h-5 text-violet-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[14px] leading-tight">
            Record to get a transcript
          </p>
          <p className="text-white/35 text-[12px] mt-0.5">
            Record directly in your browser — no upload needed
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </Link>
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

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-28 sm:pt-32 pb-16">

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
              <span className="text-[11px] text-white/40">Tired of slowness?</span>
              <span className="text-[11px] text-white/25">·········</span>
              <span className="text-[11px] font-semibold text-violet-300 tracking-wide">6× faster transcription</span>
            </div>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center font-display text-5xl sm:text-6xl md:text-[4.25rem] lg:text-[5rem] font-extrabold tracking-tight text-white leading-[1.04] mb-5"
          >
            Clean transcripts from
            <span className="block mt-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              anything you record.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-center text-[17px] sm:text-[18px] text-white/50 max-w-lg mx-auto leading-relaxed mb-10"
          >
            Upload a video or speak directly — get export-ready text{' '}
            <span className="text-violet-300 font-medium">instantly.</span>
          </motion.p>

          {/* ── HERO DROPZONE ── */}
          <HeroDropzone />

          {/* Secondary CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7"
          >
            <Link
              to="/guide"
              className="flex items-center gap-2 px-5 py-3 text-white/40 hover:text-white/65 transition-colors text-sm font-medium"
            >
              <div className="w-6 h-6 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.04]">
                <Play className="w-2.5 h-2.5 ml-0.5" />
              </div>
              See how it works
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 text-[12px] text-white/35"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              No signup required
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
              Frictionless
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              98.5% accuracy
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Zero data retention
            </span>
          </motion.div>

          {/* Social proof row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-8"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center -space-x-2">
                {CREATOR_AVATARS.map((src, i) => (
                  <ImageWithFallback
                    key={i}
                    src={src}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full border-2 border-gray-950 object-cover"
                  />
                ))}
                <div className="w-7 h-7 rounded-full border-2 border-gray-950 bg-violet-500/25 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-violet-300">2K+</span>
                </div>
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

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="flex justify-center mt-12"
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

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent z-[8]" />
      </motion.section>
    </div>
  );
}
