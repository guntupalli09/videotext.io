import { useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, Upload, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import TrustBadge from "../TrustBadge";
import { SITE_METRICS } from "../../lib/siteMetrics";

const CREATOR_AVATARS = [
  "https://i.pravatar.cc/80?img=12",
  "https://i.pravatar.cc/80?img=32",
  "https://i.pravatar.cc/80?img=47",
  "https://i.pravatar.cc/80?img=25",
  "https://i.pravatar.cc/80?img=56",
];

const ACCEPTED = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mpeg",
  "video/ogg",
  "video/3gpp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/flac",
  "audio/aac",
];

function HeroDropzone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      (
        window as Window & { __videotextPendingFile?: File }
      ).__videotextPendingFile = file;
      navigate("/video-to-transcript");
    },
    [navigate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
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
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={onInputChange}
      />

      {/* PRIMARY: Upload zone — transcription is the entry point for most visitors */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a video or audio file here, or click to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          relative cursor-pointer rounded-2xl border-2 px-6 py-8
          flex flex-col items-center justify-center gap-3 transition-all duration-200 select-none
          ${
            dragging
              ? "border-orange-400 bg-orange-500/12 shadow-[0_0_0_1px_rgba(251,146,60,0.4),0_0_24px_rgba(251,146,60,0.18)] scale-[1.01]"
              : "border-orange-400/55 bg-orange-500/[0.04] hover:border-orange-400/80 hover:bg-orange-500/[0.08] shadow-[0_0_18px_rgba(251,146,60,0.12)]"
          }
        `}
      >
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
            dragging ? "bg-orange-500/25" : "bg-orange-500/10"
          }`}
        >
          {dragging ? (
            <Upload className="w-6 h-6 text-orange-400" />
          ) : (
            <span className="text-3xl" aria-hidden>
              🎬
            </span>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-[15px] leading-snug text-orange-300 drop-shadow-[0_0_8px_rgba(251,146,60,0.45)]">
            {dragging ? "Release to start transcribing" : "Upload video or audio"}
          </p>
          <p className="text-white/40 text-[12px] mt-0.5">
            MP4, MOV, MKV · MP3, WAV, M4A — results in ~{SITE_METRICS.processingExample}
          </p>
        </div>
        {/* Drag hint */}
        {!dragging && (
          <p className="text-[10px] text-white/20 font-medium uppercase tracking-wider">
            Drop here or click to browse
          </p>
        )}
      </div>

      {/* Trust micro-line directly below primary CTA */}
      <p className="text-center text-[11px] text-white/25 mt-2.5">
        {SITE_METRICS.wordAccuracy} accuracy · {SITE_METRICS.transcriptionLanguages} languages · 3 free imports · no card required
      </p>

      {/* Divider — secondary workflow path */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[10px] text-white/20 font-medium tracking-wider uppercase">
          already have a transcript to format?
        </span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* SECONDARY: Apply Formatting Guidelines — for returning professionals */}
      <Link
        to="/guideline-format"
        className="group block rounded-xl border border-blue-400/25 bg-blue-600/[0.06] hover:border-blue-400/50 hover:bg-blue-600/[0.10] transition-all duration-200 px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/18 border border-blue-400/18 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/28 transition-colors">
            <ClipboardCheck className="w-4 h-4 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 font-semibold text-[13px] leading-tight">
              Apply Formatting Guidelines
            </p>
            <p className="text-white/35 text-[11px] mt-0.5 leading-snug">
              Validate against Rev, GoTranscript &amp; custom rules — QA-ready in {SITE_METRICS.formattingTimeSavedTo} min
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400/40 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
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
            "radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ambient glow */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.13] rounded-full blur-[160px]" />
        <div className="absolute top-[20%] left-[5%] w-[450px] h-[450px] bg-blue-700/[0.08] rounded-full blur-[120px]" />
        <div className="absolute top-[35%] right-[5%] w-[350px] h-[350px] bg-blue-700/[0.07] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-3 sm:pt-4 pb-8">
        {/* Trust badge — live stats with static fallback */}
        <TrustBadge className="mb-4" />

        {/* H1 */}
        <h1
          className="text-center font-display font-medium tracking-tight leading-[1.08] mb-2 whitespace-nowrap"
          style={{ fontSize: "clamp(1.35rem, 3.4vw, 2.75rem)" }}
        >
          <span className="text-white">
            Deliver Client-Ready Transcripts &amp; Subtitles —{" "}
          </span>
          <span className="bg-gradient-to-r from-fuchsia-300 via-blue-300 to-blue-300 bg-clip-text text-transparent">
            Fast.
          </span>
        </h1>

        {/* Sub-headline — clear input/output promise */}
        <p className="text-center text-[15px] sm:text-[16px] text-white/55 max-w-lg mx-auto leading-relaxed mb-5">
          Upload any video. Get a clean, timestamped transcript in ~{SITE_METRICS.processingExample} —{" "}
          plus subtitles, AI summary, and chapters.{" "}
          <span className="text-fuchsia-300 font-medium">
            All in one pass.
          </span>
        </p>

        {/* Dropzone + secondary formatter */}
        <HeroDropzone />

        {/* Unified proof + trust block */}
        <div className="mt-6 w-full max-w-xl mx-auto flex flex-col items-center gap-4">
          {/* Operational proof grid */}
          <div className="w-full grid grid-cols-3 gap-x-6 gap-y-2.5">
            {(
              [
                { stat: `${SITE_METRICS.formattingTimeSavedFrom} min → ${SITE_METRICS.formattingTimeSavedTo} min`, label: "transcript QA cleanup" },
                { stat: SITE_METRICS.wordAccuracy, label: "word accuracy" },
                { stat: "QA-ready", label: "on first pass" },
                { stat: `${SITE_METRICS.translationLanguages}+ languages`, label: "for translation" },
                { stat: SITE_METRICS.videosTranscribed, label: "videos transcribed" },
                { stat: "Files deleted", label: "after processing" },
              ] as const
            ).map(({ stat, label }) => (
              <div key={stat} className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-white leading-tight">
                  {stat}
                </span>
                <span className="text-[11px] text-white/35 leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/[0.07]" />

          {/* Social proof */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12px] text-white/35">
              {/* Stars */}
              <span className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="w-3 h-3 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 font-semibold text-white/50">
                  4.9 / 5
                </span>
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
                    <span className="text-[7px] font-bold text-blue-300">
                      {SITE_METRICS.userCount.replace('+', '')}+
                    </span>
                  </span>
                </span>
                <span>
                  {SITE_METRICS.primarySocialProof}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-white/20">
              {SITE_METRICS.freeUploadsPerDay} free imports · No card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
