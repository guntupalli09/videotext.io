/**
 * Authoritative public-API -> internal-operation registry.
 *
 * This is the single source of truth for what a stable /api/v1 operation
 * actually runs. Every /api/v1 route imports its config from here instead
 * of hard-coding a worker toolType string — the goal is that no internal
 * worker vocabulary (video-to-transcript, burn-subtitles, ...) needs to be
 * duplicated across route files, and that unsupported/invented operations
 * cannot be constructed and passed to `addJobToQueue()`.
 *
 * How each operation actually reaches production code (see docs/API_PRIVATE_BETA.md
 * for the audit this was built from):
 *
 *  - 'single-file': one multipart file field ("file") -> services/transcriptionIntake.ts
 *    (runTranscriptionIntake) with `forcedToolType` set to the internal toolType below.
 *    This is the exact pipeline POST /api/upload (the web app) uses.
 *  - 'dual-file': two multipart file fields -> services/dualFileIntake.ts, the exact
 *    pipeline POST /api/upload/dual (the web app) uses.
 *  - 'guideline-format': JSON body (transcriptText + rules) -> services/guidelineIntake.ts,
 *    the exact pipeline POST /api/guidelines/format (the web app) uses. This does NOT
 *    go through workers/videoProcessor.ts at all — no worker toolType exists for it.
 *
 * Voice Recorder has no entry here: per the audit (client/src/pages/VoiceRecorder.tsx),
 * it is simply another input source (recorded audio) for the video-to-transcript
 * pipeline — BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT, same as VideoToTranscript.tsx.
 * POST /api/v1/transcriptions already covers it; no separate public operation exists.
 */

/** Internal worker toolType values this registry is allowed to select — see the
 *  switch in workers/videoProcessor.ts. Client input is never assigned to this type. */
export type InternalWorkerToolType =
  | 'video-to-transcript'
  | 'video-to-subtitles'
  | 'translate-subtitles'
  | 'fix-subtitles'
  | 'burn-subtitles'
  | 'compress-video'

export type PublicOperation =
  | 'video_to_transcript'
  | 'video_to_subtitles'
  | 'subtitle_translation'
  | 'subtitle_fix'
  | 'subtitle_burn'
  | 'video_compression'
  | 'guideline_format'

interface SingleFileOperationConfig {
  kind: 'single-file'
  internalToolType: InternalWorkerToolType
  endpoint: string
  description: string
}

interface DualFileOperationConfig {
  kind: 'dual-file'
  internalToolType: 'fix-subtitles' | 'burn-subtitles'
  endpoint: string
  description: string
}

interface GuidelineFormatOperationConfig {
  kind: 'guideline-format'
  endpoint: string
  description: string
}

export type PublicOperationConfig =
  | SingleFileOperationConfig
  | DualFileOperationConfig
  | GuidelineFormatOperationConfig

/**
 * The one authoritative mapping. Every /api/v1 route looks up its own entry
 * here and forwards `internalToolType` (never req.body.toolType) into the
 * shared intake pipeline — see PUBLIC_OPERATIONS[op].internalToolType usage
 * in routes/apiV1.ts.
 */
export const PUBLIC_OPERATIONS: Record<PublicOperation, PublicOperationConfig> = {
  video_to_transcript: {
    kind: 'single-file',
    internalToolType: 'video-to-transcript',
    endpoint: 'POST /api/v1/transcriptions',
    description: 'Transcribe an uploaded video/audio file (including voice recordings) to text.',
  },
  video_to_subtitles: {
    kind: 'single-file',
    internalToolType: 'video-to-subtitles',
    endpoint: 'POST /api/v1/subtitles',
    description: 'Generate SRT/VTT subtitles from an uploaded video file.',
  },
  subtitle_translation: {
    kind: 'single-file',
    internalToolType: 'translate-subtitles',
    endpoint: 'POST /api/v1/subtitle-translations',
    description: 'Translate an uploaded subtitle (or .txt transcript) file into another language.',
  },
  subtitle_fix: {
    kind: 'dual-file',
    internalToolType: 'fix-subtitles',
    endpoint: 'POST /api/v1/subtitle-fixes',
    description: 'Auto-fix timing/grammar/formatting issues in an uploaded subtitle file (optionally with the source video for scene-aware fixes).',
  },
  subtitle_burn: {
    kind: 'dual-file',
    internalToolType: 'burn-subtitles',
    endpoint: 'POST /api/v1/subtitle-burns',
    description: 'Burn an uploaded subtitle file into an uploaded video as open captions.',
  },
  video_compression: {
    kind: 'single-file',
    internalToolType: 'compress-video',
    endpoint: 'POST /api/v1/video-compressions',
    description: 'Compress an uploaded video file.',
  },
  guideline_format: {
    kind: 'guideline-format',
    endpoint: 'POST /api/v1/guideline-formats',
    description: 'Reformat an existing transcript against a set of style rules ("Make it Client Ready").',
  },
}

/** Narrow helper for routes that only need the internal toolType of a single/dual-file operation. */
export function internalToolTypeFor(op: PublicOperation): string | undefined {
  const cfg = PUBLIC_OPERATIONS[op]
  return cfg.kind === 'guideline-format' ? undefined : cfg.internalToolType
}
