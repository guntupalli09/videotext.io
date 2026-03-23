import { useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Mic,
  Shield,
  CheckCircle2,
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
    <div className="w-full max-w-xl mx-auto">
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
          relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-8
          flex flex-col items-center gap-3 transition-all duration-200 select-none
          ${dragging
            ? 'border-violet-400 bg-violet-500/10 scale-[1.015]'
            : 'border-white/20 bg-white/[0.03] hover:border-violet-400/60 hover:bg-violet-500/[0.06]'
          }
        `}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-violet-500/20' : 'bg-white/[0.05]'
        }`}>
          {dragging
            ? <Upload className="w-6 h-6 text-violet-400" />
            : <span className="text-3xl" aria-hidden>🎬</span>
          }
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white font-bold text-base leading-snug">
            {dragging ? 'Release to upload' : 'Drop a video file here'}
          </p>
          <p className="text-white/40 text-sm mt-0.5">
            MP4, MOV, MKV, AVI, WebM, MPEG, M4V, FLV, WMV, 3GP · MP3, WAV, M4A, FLAC, AAC
          </p>
          <p className="text-white/25 text-xs">or click to browse</p>
        </div>

      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[11px] text-white/25 font-medium tracking-wider uppercase">or</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* Record option */}
      <Link
        to="/voice-recorder"
        className="group flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/[0.06] px-5 py-3 transition-all duration-200"
      >
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/25 transition-colors">
          <Mic className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[13px] leading-tight">
            Record to get a transcript
          </p>
          <p className="text-white/35 text-[12px] mt-0.5">
            Record directly in your browser — no upload needed
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </Link>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-gray-950">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Ambient glow */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-600/[0.13] rounded-full blur-[160px]" />
        <div className="absolute top-[20%] left-[5%] w-[450px] h-[450px] bg-purple-700/[0.08] rounded-full blur-[120px]" />
        <div className="absolute top-[35%] right-[5%] w-[350px] h-[350px] bg-indigo-600/[0.07] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 sm:pt-28 pb-8">

        {/* Speed badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="text-[11px] font-semibold text-violet-300 tracking-wide">5× faster processing</span>
          </div>
        </div>

        {/* H1 */}
        <h1 className="text-center font-display text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-tight text-white leading-[1.06] mb-5">
          Clean transcripts from
          <span className="block mt-3 pb-2 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            anything you record.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-center text-[16px] sm:text-[17px] text-white/50 max-w-lg mx-auto leading-relaxed mb-8">
          Upload a video or speak directly — get export-ready text{' '}
          <span className="text-violet-300 font-medium">instantly.</span>
        </p>

        {/* Dropzone + Record */}
        <HeroDropzone />

        {/* Secondary CTA */}
        <div className="flex items-center justify-center mt-4">
          <Link
            to="/guide"
            className="flex items-center gap-2 px-5 py-2.5 text-white/40 hover:text-white/65 transition-colors text-sm font-medium"
          >
            <div className="w-6 h-6 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.04]">
              <Play className="w-2.5 h-2.5 ml-0.5" />
            </div>
            See how it works
          </Link>
        </div>

        {/* Trust signals + Social proof — single compact row */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-5 text-[12px] text-white/35">
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
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          {/* Avatars */}
          <span className="flex items-center gap-2">
            <span className="flex items-center -space-x-2">
              {CREATOR_AVATARS.map((src, i) => (
                <ImageWithFallback
                  key={i}
                  src={src}
                  alt=""
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px] rounded-full border-2 border-gray-950 object-cover"
                />
              ))}
              <span className="w-[22px] h-[22px] rounded-full border-2 border-gray-950 bg-violet-500/25 flex items-center justify-center">
                <span className="text-[7px] font-bold text-violet-300">2K+</span>
              </span>
            </span>
            <span><span className="text-white/55 font-semibold">2,000+ creators</span> trust VideoText</span>
          </span>
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          {/* Stars */}
          <span className="flex items-center gap-1">
            {[1,2,3,4,5].map((i) => (
              <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="ml-0.5">4.9 / 5</span>
          </span>
        </div>

      </div>
    </section>
  );
}
