import { useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, Upload, ChevronRight, X, Check } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import TrustBadge from "../TrustBadge";

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

      {/* PRIMARY: Apply Formatting Guidelines */}
      <Link
        to="/guideline-format"
        className="group block rounded-2xl border border-blue-400/35 bg-gradient-to-br from-blue-600/20 via-blue-500/12 to-blue-400/8 shadow-[0_0_0_1px_rgba(139,92,246,0.28),0_20px_60px_rgba(48,21,114,0.55)] hover:border-blue-400/65 hover:from-blue-600/28 hover:to-blue-400/14 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.55),0_4px_60px_rgba(139,92,246,0.32)] transition-all duration-200 px-5 py-5"
      >
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/22 border border-blue-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/32 transition-colors">
            <ClipboardCheck className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-[15px] leading-tight mb-1">
              Apply Formatting Guidelines
            </p>
            <p className="text-white/50 text-[12px] leading-snug">
              Validate against Rev, GoTranscript &amp; custom client rules.
              Get a pass/fail summary with exact fixes — QA-ready in seconds.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400/50 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
        </div>

        {/* Operational benefit chips */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {[
            "45 min → 8 min cleanup",
            "Auto-apply client rules",
            "QA-ready on first pass",
          ].map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center text-[10px] font-semibold text-blue-300/80 bg-blue-600/15 border border-blue-500/25 rounded-full px-2.5 py-0.5"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[13px] font-bold text-orange-400 group-hover:gap-2 transition-all drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]">
          Generate client-ready transcript{" "}
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </Link>

      {/* BEFORE → AFTER transformation */}
      <div className="mt-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
        <div className="flex">
          <div className="flex-1 p-3 border-r border-white/[0.06]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/65 mb-2">
              Before
            </p>
            <ul className="space-y-1">
              {[
                "Inconsistent speaker labels",
                "Timestamp clutter",
                "Formatting violations",
                "Broken segmentation",
                "Manual QA cleanup",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-1.5 text-[10.5px] text-white/30"
                >
                  <X className="w-2.5 h-2.5 text-red-400/50 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center w-8 flex-shrink-0">
            <span className="text-white/20 text-base">→</span>
          </div>

          <div className="flex-1 p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/70 mb-2">
              After
            </p>
            <ul className="space-y-1">
              {[
                "Rev-compliant transcript",
                "Clean speaker formatting",
                "QA-ready structure",
                "Export-ready output",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-1.5 text-[10.5px] text-white/55"
                >
                  <Check className="w-2.5 h-2.5 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[10px] text-white/20 font-medium tracking-wider uppercase">
          or transcribe a new file
        </span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* SECONDARY: Upload zone */}
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
          relative cursor-pointer rounded-xl border border-dashed px-4 py-3
          flex items-center gap-3 transition-all duration-200 select-none
          ${
            dragging
              ? "border-orange-400 bg-orange-500/10 shadow-[0_0_0_1px_rgba(251,146,60,0.4),0_0_18px_rgba(251,146,60,0.15)] scale-[1.01]"
              : "border-orange-400/50 bg-orange-500/[0.04] hover:border-orange-400/70 hover:bg-orange-500/[0.07] shadow-[0_0_12px_rgba(251,146,60,0.1)]"
          }
        `}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            dragging ? "bg-orange-500/20" : "bg-orange-500/[0.08]"
          }`}
        >
          {dragging ? (
            <Upload className="w-5 h-5 text-orange-400" />
          ) : (
            <span className="text-2xl" aria-hidden>
              🎬
            </span>
          )}
        </div>
        <div>
          <p className="font-bold text-[13px] leading-snug text-orange-300 drop-shadow-[0_0_8px_rgba(251,146,60,0.45)]">
            {dragging ? "Release to start transcribing" : "Upload video or audio"}
          </p>
          <p className="text-white/40 text-[11px]">
            MP4, MOV, MKV · MP3, WAV, M4A — results in minutes
          </p>
        </div>
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
        {/* Trust badge — live stats pill */}
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

        {/* Sub-headline */}
        <p className="text-center text-[15px] sm:text-[16px] text-white/55 max-w-md mx-auto leading-relaxed mb-4">
          Transcribe, subtitle, translate, and format audio/video into
          delivery-ready files with built-in QA and export workflows —{" "}
          <span className="text-fuchsia-300 font-medium">
            all in one place.
          </span>
        </p>

        {/* Dropzone + Formatter */}
        <HeroDropzone />

        {/* Unified proof + trust block */}
        <div className="mt-6 w-full max-w-xl mx-auto flex flex-col items-center gap-4">
          {/* Operational proof grid */}
          <div className="w-full grid grid-cols-3 gap-x-6 gap-y-2.5">
            {(
              [
                { stat: "45 min → 8 min", label: "transcript cleanup" },
                { stat: "Auto-applied", label: "client formatting rules" },
                { stat: "QA-ready", label: "on first pass" },
                { stat: "Rev · GoTranscript", label: "style guide support" },
                { stat: "No repeated", label: "QA corrections" },
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

          {/* Social proof + friction line */}
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
                      12K+
                    </span>
                  </span>
                </span>
                <span>
                  Built alongside{" "}
                  <span className="text-white/55 font-semibold">
                    professional transcriptionists &amp; QA reviewers
                  </span>
                </span>
              </span>
            </div>
            <p className="text-[11px] text-white/20">
              3 free imports · No card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
