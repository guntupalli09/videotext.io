import { useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Upload,
  ChevronRight,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import TrustBadge from '../TrustBadge';

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
          relative cursor-pointer rounded-xl border-2 border-dashed px-8 py-8
          flex flex-col items-center gap-3 transition-all duration-200 select-none
          ${dragging
            ? 'border-blue-300 bg-blue-600/18 shadow-[0_0_0_1px_rgba(139,92,246,0.45),0_0_34px_rgba(139,92,246,0.34)] scale-[1.015]'
            : 'border-blue-300/45 bg-gradient-to-b from-blue-600/18 to-blue-400/12 shadow-[0_0_0_1px_rgba(139,92,246,0.28),0_12px_44px_rgba(48,21,114,0.45)] hover:border-blue-300/70 hover:from-blue-600/25 hover:to-blue-400/16 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.45),0_0_38px_rgba(139,92,246,0.25)]'
          }
        `}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-blue-600/20' : 'bg-white/[0.05]'
        }`}>
          {dragging
            ? <Upload className="w-6 h-6 text-blue-400" />
            : <span className="text-3xl" aria-hidden>🎬</span>
          }
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white font-medium text-base leading-snug">
            {dragging ? 'Release to start transcribing' : 'Upload video or audio — get results in minutes'}
          </p>
          <p className="text-white/40 text-sm mt-0.5">
            MP4, MOV, MKV, AVI, WebM · MP3, WAV, M4A, FLAC, AAC
          </p>
          <p className="text-white/25 text-xs">drag &amp; drop or click to browse</p>
        </div>

      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[11px] text-white/25 font-medium tracking-wider uppercase">or</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* Guideline formatter */}
      <div className="grid grid-cols-1 gap-2">
        <Link
          to="/guideline-format"
          className="group flex flex-col gap-2.5 rounded-xl border border-blue-300/30 bg-gradient-to-b from-blue-600/14 to-blue-400/12 shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_10px_30px_rgba(48,21,114,0.35)] hover:border-blue-300/60 hover:from-blue-600/22 hover:to-blue-400/16 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.42),0_0_30px_rgba(139,92,246,0.2)] px-4 py-3.5 transition-all duration-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/25 transition-colors">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-white font-medium text-[12px] leading-tight">
              Apply Formatting Guidelines in Seconds
            </p>
          </div>
          <p className="text-white/35 text-[11px] leading-snug">
            Apply client formatting guidelines — ready for QA
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-blue-400 group-hover:gap-1.5 transition-all">
            Generate Client-Ready Transcript <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
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
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.13] rounded-full blur-[160px]" />
        <div className="absolute top-[20%] left-[5%] w-[450px] h-[450px] bg-blue-700/[0.08] rounded-full blur-[120px]" />
        <div className="absolute top-[35%] right-[5%] w-[350px] h-[350px] bg-blue-700/[0.07] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-3 sm:pt-4 pb-8">

        {/* Trust badge — live stats pill */}
        <TrustBadge className="mb-4" />

        {/* H1 */}
        <h1
          className="text-center font-display font-medium tracking-tight leading-[1.08] mb-2 whitespace-nowrap"
          style={{ fontSize: 'clamp(1.4rem, 4.2vw, 3.75rem)' }}
        >
          <span className="text-white">Deliver Client-Ready Transcripts — </span><span className="bg-gradient-to-r from-fuchsia-300 via-blue-300 to-blue-300 bg-clip-text text-transparent">Fast.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-center text-[15px] sm:text-[16px] text-white/55 max-w-md mx-auto leading-relaxed mb-4">
          Built for transcriptionists, proofreaders, translators, and QA teams. Apply client guidelines automatically, generate subtitles, and{' '}
          <span className="text-fuchsia-300 font-medium">reduce manual QA work by 60%.</span>
        </p>

        {/* Dropzone + Formatter */}
        <HeroDropzone />

        {/* Unified proof + trust block */}
        <div className="mt-6 w-full max-w-xl mx-auto flex flex-col items-center gap-4">

          {/* Operational proof grid */}
          <div className="w-full grid grid-cols-3 gap-x-6 gap-y-2.5">
            {([
              { stat: '~5 min', label: '2-hour transcript' },
              { stat: '99+', label: 'source languages' },
              { stat: '98.5%', label: 'accuracy' },
              { stat: 'DOCX · SRT · VTT', label: 'export formats' },
              { stat: 'Speaker labels', label: '& timestamps' },
              { stat: 'Files deleted', label: 'after processing' },
            ] as const).map(({ stat, label }) => (
              <div key={stat} className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-white leading-tight">{stat}</span>
                <span className="text-[11px] text-white/35 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/[0.07]" />

          {/* Social proof + friction line */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12px] text-white/35">
              {/* Stars */}
              <span className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 font-medium text-white/50">4.9 / 5</span>
              </span>
              <span className="w-px h-3 bg-white/10" />
              {/* Avatars + ICP claim */}
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
                  <span className="w-[22px] h-[22px] rounded-full border-2 border-gray-950 bg-blue-600/25 flex items-center justify-center">
                    <span className="text-[7px] font-medium text-blue-300">12K+</span>
                  </span>
                </span>
                <span>Trusted by <span className="text-white/55 font-medium">transcriptionists, translators &amp; QA teams</span></span>
              </span>
            </div>
            <p className="text-[11px] text-white/20">3 free imports · No card required</p>
          </div>

        </div>

      </div>
    </section>
  );
}
