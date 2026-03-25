import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import path from 'path'
import fs from 'fs'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { detectSubtitleFormat, parseSRT, parseVTT } from '../utils/srtParser'

const execFileAsync = promisify(execFile)
import { getLogger } from '../lib/logger'

const log = getLogger('worker')

// Explicit paths: use env in Docker (e.g. /usr/bin/ffmpeg) if the file exists, else npm installer (works on Windows)
function resolveFfmpegPath(envPath: string | undefined, fallback: string): string {
  if (envPath && fs.existsSync(envPath)) return envPath
  return fallback
}
const ffmpegPath = resolveFfmpegPath(process.env.FFMPEG_PATH, ffmpegInstaller.path)
const ffprobePath = resolveFfmpegPath(process.env.FFPROBE_PATH, ffprobeInstaller.path)
ffmpeg.setFfmpegPath(ffmpegPath)
try {
  ffmpeg.setFfprobePath(ffprobePath)
} catch (e) {
  log.warn({ msg: 'Could not set ffprobe path', error: (e as Error)?.message ?? String(e) })
}

/** FFmpeg thread count. Use 4+ on dedicated servers for faster encode. */
const FFMPEG_THREADS = process.env.FFMPEG_THREADS || '4'

/** When set (e.g. "true" or "1"), use GPU for decode/encode where available (e.g. CUDA/NVENC). No-op if GPU not present. */
const USE_GPU = /^(1|true|yes)$/i.test(process.env.FFMPEG_USE_GPU || '')

function getGpuInputOptions(): string[] {
  if (!USE_GPU) return []
  return ['-hwaccel', 'auto']
}

function getGpuVideoCodec(): string {
  if (!USE_GPU) return 'libx264'
  return 'h264_nvenc'
}

/** libx264 uses -preset; nvenc does not. */
function getEncodePresetOptions(): string[] {
  return getGpuVideoCodec() === 'libx264' ? ['-preset', 'fast'] : []
}

/** Phase 2.5: Kill job if no FFmpeg output for 90s. Worker will auto-retry once. */
export const HUNG_JOB_MS = 90 * 1000
export const HUNG_JOB_MESSAGE = 'HUNG_JOB'

/** Extraction-first: length of first chunk extracted early (seconds) to reduce TTFW. 10s targets ~5–10s first word. */
export const EXTRACTION_FIRST_CHUNK_SEC = 10

export interface FFmpegProgress {
  percent: number
  timemark?: string
}

type FirstChunkCreatedCallback = (durationSec: number) => void

function setupHungProtection(
  cmd: { kill: (signal: string) => unknown },
  reject: (err: Error) => void
): { clear: () => void; reset: () => void } {
  let hungTimer: NodeJS.Timeout
  const reset = () => {
    clearTimeout(hungTimer)
    hungTimer = setTimeout(() => {
      try {
        cmd.kill('SIGKILL')
      } catch (_) {
        /* ignore */
      }
      reject(new Error(HUNG_JOB_MESSAGE))
    }, HUNG_JOB_MS)
  }
  const clear = () => clearTimeout(hungTimer)
  reset()
  return { clear, reset }
}

/**
 * Extract audio from video file (with 90s hung-job kill).
 */
export function extractAudio(
  videoPath: string,
  outputPath: string,
  onProgress?: (progress: FFmpegProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stderrLines: string[] = []
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions(['-threads', FFMPEG_THREADS, '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5'])
      .on('progress', (progress: { percent?: number; timemark?: string }) => {
        hung.reset()
        onProgress?.({
          percent: progress.percent || 0,
          timemark: progress.timemark,
        })
      })
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        resolve(outputPath)
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.save(outputPath)
  })
}

/**
 * Extract audio for browser playback as AAC in an M4A container.
 * Produces a file that plays on every browser (Chrome, Safari, Firefox, Edge) regardless of
 * the original format or codec (WebM/VP9, AVI, MOV, MKV, AC3, DTS, Opus, …).
 * Output: 44.1 kHz stereo AAC @ 128 kbps with faststart (seeking works immediately).
 * Never throws — callers should .catch() and treat null as "player unavailable".
 */
export function extractAudioForPlayback(videoPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stderrLines: string[] = []
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions([
        '-threads', FFMPEG_THREADS,
        '-vn',
        '-acodec', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-b:a', '128k',
        '-movflags', '+faststart',
      ])
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        resolve(outputPath)
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.save(outputPath)
  })
}

/**
 * Extract audio to 16 kHz mono WAV (PCM). Use when MP3 extraction is empty/small due to unsupported codec.
 * Whisper accepts WAV; this decode path often works for AC3/DTS and other codecs that fail with libmp3lame.
 */
export function extractAudioToWav(
  videoPath: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stderrLines: string[] = []
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions([
        '-threads', FFMPEG_THREADS,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
      ])
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        resolve(outputPath)
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.save(outputPath)
  })
}

/**
 * Convert any audio file to 16 kHz mono WAV. Use for chunks so Whisper always gets a supported format.
 */
export function convertAudioToWav(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stderrLines: string[] = []
    const cmd = ffmpeg(inputPath)
      .outputOptions([
        '-threads', FFMPEG_THREADS,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
      ])
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        resolve(outputPath)
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.save(outputPath)
  })
}

/**
 * Split an audio file into fixed-duration chunks (for parallel transcription).
 * Returns paths to chunk files in order. Caller must delete them when done.
 *
 * When chunkDurationSec is an array, uses variable durations:
 * [d0, d1, d2, ...] → chunk_000 covers d0 seconds, chunk_001 covers d1, etc.
 */
export function splitAudioIntoChunks(
  audioPath: string,
  chunkDurationSec: number | number[],
  outputDir: string,
  onFirstChunkCreated?: FirstChunkCreatedCallback
): Promise<string[]> {
  if (Array.isArray(chunkDurationSec)) {
    return splitAudioIntoVariableChunks(audioPath, chunkDurationSec, outputDir, onFirstChunkCreated)
  }
  return new Promise((resolve, reject) => {
    const pattern = path.join(outputDir, `chunk_%03d.mp3`)
    const stderrLines: string[] = []
    ffmpeg(audioPath)
      .outputOptions([
        '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5',
        '-f', 'segment',
        '-segment_time', String(chunkDurationSec),
        '-reset_timestamps', '1',
        '-map', '0:a?',
      ])
      .output(pattern)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
          .sort()
        resolve(files.map((f) => path.join(outputDir, f)))
      })
      .on('error', (err: Error) => {
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        reject(new Error(stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message))
      })
      .run()
  })
}

function splitAudioIntoVariableChunks(
  audioPath: string,
  chunkDurationsSec: number[],
  outputDir: string,
  onFirstChunkCreated?: FirstChunkCreatedCallback
): Promise<string[]> {
  const cumulative: number[] = []
  let acc = 0
  for (const d of chunkDurationsSec) {
    if (!(d > 0)) continue
    acc += d
    cumulative.push(acc)
  }
  if (cumulative.length === 0) {
    return Promise.resolve([])
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const pattern = path.join(outputDir, 'chunk_%03d.mp3')
  const stderrLines: string[] = []
  const firstDuration = chunkDurationsSec.find((d) => d > 0) ?? cumulative[0]
  return new Promise((resolve, reject) => {
    const opts = cumulative.length === 1
      ? ['-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5', '-f', 'segment', '-segment_time', String(cumulative[0]), '-reset_timestamps', '1', '-map', '0:a?']
      : ['-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5', '-f', 'segment', '-segment_times', cumulative.slice(0, -1).join(','), '-reset_timestamps', '1', '-map', '0:a?']
    ffmpeg(audioPath)
      .outputOptions(opts)
      .output(pattern)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
          .sort()
        if (onFirstChunkCreated) onFirstChunkCreated(firstDuration)
        resolve(files.map((f) => path.join(outputDir, f)))
      })
      .on('error', (err: Error) => {
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        reject(new Error(stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message))
      })
      .run()
  })
}

/**
 * Extract audio from video and split into fixed-duration chunks in one ffmpeg pass (PROCESSING_V2).
 * Same chunk duration, format (mp3 16kHz mono), and naming (chunk_000.mp3, ...) as extractAudio + splitAudioIntoChunks.
 * Returns paths to chunk files in order. Caller must delete them when done.
 */
export function extractAndSplitAudio(
  videoPath: string,
  chunkDurationSec: number | number[],
  outputDir: string,
  onFirstChunkCreated?: FirstChunkCreatedCallback
): Promise<string[]> {
  if (Array.isArray(chunkDurationSec)) {
    return extractAndSplitAudioVariable(videoPath, chunkDurationSec, outputDir, onFirstChunkCreated)
  }
  const pattern = path.join(outputDir, 'chunk_%03d.mp3')
  return new Promise((resolve, reject) => {
    const stderrLines: string[] = []
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions([
        '-threads', FFMPEG_THREADS,
        '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5',
        '-f', 'segment',
        '-segment_time', String(chunkDurationSec),
        '-reset_timestamps', '1',
      ])
      .output(pattern)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
          .sort()
        resolve(files.map((f) => path.join(outputDir, f)))
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.run()
  })
}

function extractAndSplitAudioVariable(
  videoPath: string,
  chunkDurationsSec: number[],
  outputDir: string,
  onFirstChunkCreated?: FirstChunkCreatedCallback
): Promise<string[]> {
  const cumulative: number[] = []
  let acc = 0
  for (const d of chunkDurationsSec) {
    if (!(d > 0)) continue
    acc += d
    cumulative.push(acc)
  }
  if (cumulative.length === 0) {
    return Promise.resolve([])
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const pattern = path.join(outputDir, 'chunk_%03d.mp3')
  const stderrLines: string[] = []
  const firstDuration = chunkDurationsSec.find((d) => d > 0) ?? cumulative[0]
  return new Promise((resolve, reject) => {
    const baseOpts = [
      '-threads', FFMPEG_THREADS,
      '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5',
      '-f', 'segment', '-reset_timestamps', '1',
    ]
    const segmentOpts = cumulative.length === 1
      ? ['-segment_time', String(cumulative[0])]
      : ['-segment_times', cumulative.slice(0, -1).join(',')]
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions([...baseOpts, ...segmentOpts])
      .output(pattern)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
          .sort()
        if (onFirstChunkCreated) onFirstChunkCreated(firstDuration)
        resolve(files.map((f) => path.join(outputDir, f)))
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.run()
  })
}

/**
 * Result of extraction-first flow: chunk_000 path immediately, promise for chunk_001+.
 * Used to start transcribing chunk_000 while remaining chunks are extracted in background.
 */
export interface ExtractionFirstResult {
  firstChunkPath: string
  remainingChunksPromise: Promise<string[]>
  /** Call to kill background extraction (e.g. on job cancel). No-op if already finished. */
  killBackground: () => void
}

/**
 * Two-stage extraction for TTFW: extract first N seconds to chunk_000, return immediately;
 * spawn background ffmpeg for remaining audio → chunk_001, chunk_002, ...
 * chunkDurationsSec[0] is the first chunk duration (use EXTRACTION_FIRST_CHUNK_SEC); rest use DEFAULT_CHUNK_SEC.
 * If background extraction fails, remainingChunksPromise rejects (caller should fail job).
 * Optional signal: when aborted, kills background ffmpeg and remainingChunksPromise rejects.
 */
export function extractAndSplitAudioExtractionFirst(
  videoPath: string,
  chunkDurationsSec: number[],
  outputDir: string,
  onFirstChunkCreated?: FirstChunkCreatedCallback,
  signal?: AbortSignal
): Promise<ExtractionFirstResult> {
  if (chunkDurationsSec.length === 0 || !(chunkDurationsSec[0]! > 0)) {
    return Promise.reject(new Error('extractAndSplitAudioExtractionFirst: chunkDurationsSec must have positive first duration'))
  }
  const firstDuration = chunkDurationsSec[0]!
  const remainingDurations = chunkDurationsSec.slice(1)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const chunk000Path = path.join(outputDir, 'chunk_000.mp3')
  const baseOpts = [
    '-threads', FFMPEG_THREADS,
    '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5',
  ]

  // Stage 1: extract first N seconds to chunk_000.mp3, then resolve
  const stage1Promise = new Promise<string>((resolve, reject) => {
    const stderrLines: string[] = []
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions([...baseOpts, '-t', String(firstDuration)])
      .output(chunk000Path)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        if (onFirstChunkCreated) onFirstChunkCreated(firstDuration)
        resolve(chunk000Path)
      })
      .on('error', (err: Error) => {
        hung.clear()
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        reject(new Error(stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message))
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.run()
  })

  // Stage 2: background extraction from firstDuration to end, split into chunk_001, chunk_002, ...
  let backgroundCmd: { kill: (signal: string) => unknown } | null = null
  const remainingChunksPromise = new Promise<string[]>((resolve, reject) => {
    if (remainingDurations.length === 0) {
      resolve([])
      return
    }
    const cumulative: number[] = []
    let acc = 0
    for (const d of remainingDurations) {
      if (!(d > 0)) continue
      acc += d
      cumulative.push(acc)
    }
    if (cumulative.length === 0) {
      resolve([])
      return
    }
    const segmentOpts = cumulative.length === 1
      ? ['-segment_time', String(cumulative[0])]
      : ['-segment_times', cumulative.slice(0, -1).join(',')]
    const pattern = path.join(outputDir, 'chunk_%03d.mp3')
    const stderrLines: string[] = []
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .inputOptions(['-ss', String(firstDuration)])
      .outputOptions([
        ...baseOpts,
        '-f', 'segment',
        ...segmentOpts,
        '-segment_start_number', '1',
        '-reset_timestamps', '1',
      ])
      .output(pattern)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        hung.clear()
        backgroundCmd = null
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
          .sort()
        const paths = files.map((f) => path.join(outputDir, f)).filter((p) => p !== chunk000Path)
        resolve(paths)
      })
      .on('error', (err: Error) => {
        hung.clear()
        backgroundCmd = null
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        reject(new Error(stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message))
      })
    backgroundCmd = cmd
    const hung = setupHungProtection(cmd, reject)
    cmd.run()
  })

  const killBackground = () => {
    if (backgroundCmd) {
      try {
        backgroundCmd.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      backgroundCmd = null
    }
  }

  if (signal) {
    const onAbort = () => {
      killBackground()
      // Reject remainingChunksPromise only if we're still waiting
      // (we can't reject an already-resolved promise; ignore)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }

  return stage1Promise.then((firstChunkPath) => ({
    firstChunkPath,
    remainingChunksPromise,
    killBackground,
  }))
}

/** Phase 1B — UTILITY 5B: Style presets (subtitle metadata only). No custom styling editor. */
export interface BurnStylePreset {
  fontSize?: 'small' | 'medium' | 'large'
  position?: 'bottom' | 'middle'
  backgroundOpacity?: 'none' | 'low' | 'high'
}

/**
 * Burn subtitles into video
 */
export function burnSubtitles(
  videoPath: string,
  subtitlePath: string,
  outputPath: string,
  onProgress?: (progress: FFmpegProgress) => void,
  preset?: BurnStylePreset
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if files exist
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video file not found: ${videoPath}`))
      return
    }
    
    if (!fs.existsSync(subtitlePath)) {
      reject(new Error(`Subtitle file not found: ${subtitlePath}`))
      return
    }
    
    // Copy subtitle file to a temporary location with a simple name (no spaces/special chars)
    // This avoids FFmpeg path parsing issues on Windows
    const tempDir = path.dirname(subtitlePath)
    const originalExt = path.extname(subtitlePath).toLowerCase() || '.srt'
    const tempSubtitlePath = path.join(tempDir, `subs_${Date.now()}${originalExt}`)
    
    try {
      fs.copyFileSync(subtitlePath, tempSubtitlePath)
    } catch (copyError: any) {
      reject(new Error(`Failed to copy subtitle file: ${copyError.message}`))
      return
    }
    
    // Probe video resolution so libass doesn't assume a tiny script resolution and
    // scale the text to huge sizes (common on 1080x1920 vertical videos).
    const probeVideoSize = (p: string): Promise<{ width: number; height: number }> =>
      new Promise((res, rej) => {
        log.debug({ msg: 'About to run ffprobe (size)', path: p })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fluent-ffmpeg doesn't type static .ffprobe
        ;(ffmpeg as any).ffprobe(p, ['-probesize', '100M', '-analyzeduration', '100M'], (err: Error | null, metadata: any) => {
          if (err) {
            log.error({ msg: 'ffprobe failed', error: (err as Error)?.message ?? String(err) })
            return rej(err)
          }
          log.debug({ msg: 'ffprobe (size) succeeded', path: p })
          const v = (metadata?.streams || []).find((s: any) => s.codec_type === 'video')
          const width = Number(v?.width) || 0
          const height = Number(v?.height) || 0
          if (!width || !height) return rej(new Error('Could not read video resolution'))
          res({ width, height })
        })
      })

    probeVideoSize(videoPath)
      .then(({ width, height }) => {
        // Instead of relying on force_style (which can be flaky for SRT/VTT),
        // generate a temporary ASS file with explicit styling + PlayRes set to the
        // video resolution. This guarantees bottom placement and clean "movie" styling.

        // Scale style based on resolution; Phase 1B presets adjust scale.
        const baseFontSize = Math.max(24, Math.min(80, Math.round(height * 0.035)))
        const sizeMult = preset?.fontSize === 'small' ? 0.75 : preset?.fontSize === 'large' ? 1.25 : 1
        const fontSize = Math.round(baseFontSize * sizeMult)
        const isMiddle = preset?.position === 'middle'
        const marginV = isMiddle ? Math.round(height * 0.4) : Math.max(40, Math.min(180, Math.round(height * 0.05)))
        const marginLR = Math.max(20, Math.min(80, Math.round(width * 0.03)))
        const backAlpha = preset?.backgroundOpacity === 'none' ? '00' : preset?.backgroundOpacity === 'high' ? 'B3' : '80'

        const format = detectSubtitleFormat(tempSubtitlePath)
        const entries = format === 'srt' ? parseSRT(tempSubtitlePath) : parseVTT(tempSubtitlePath)

        log.debug({ msg: 'Subtitle parse', format, entries: entries.length, sample: entries[0]?.text?.slice(0, 80) })

        if (entries.length === 0) {
          throw new Error('No subtitle entries parsed (invalid or empty subtitle file).')
        }

        const toAssTime = (seconds: number) => {
          const h = Math.floor(seconds / 3600)
          const m = Math.floor((seconds % 3600) / 60)
          const s = Math.floor(seconds % 60)
          const cs = Math.floor((seconds - Math.floor(seconds)) * 100) // centiseconds
          return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
        }

        const escapeAssText = (t: string) =>
          t.replace(/\r/g, '').split('\n').map((line) => line.replace(/{/g, '').replace(/}/g, '')).join('\\N')

        const assContent =
          `[Script Info]\n` +
          `ScriptType: v4.00+\n` +
          `PlayResX: ${width}\n` +
          `PlayResY: ${height}\n` +
          `ScaledBorderAndShadow: yes\n` +
          `\n` +
          `[V4+ Styles]\n` +
          `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
          // PrimaryColour/BackColour are &HAABBGGRR&; BackColour alpha from preset
          `Style: Default,Arial,${fontSize},&H00FFFFFF&,&H00FFFFFF&,&H00000000&,&H${backAlpha}000000&,0,0,0,0,100,100,0,0,3,0,0,${isMiddle ? '5' : '2'},${marginLR},${marginLR},${marginV},1\n` +
          `\n` +
          `[Events]\n` +
          `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
          entries
            .map((e) => {
              const start = toAssTime(e.startTime)
              const end = toAssTime(e.endTime)
              const text = escapeAssText(e.text)
              return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
            })
            .join('\n') +
          `\n`

        const tempAssPath = path.join(tempDir, `subs_${Date.now()}.ass`)
        fs.writeFileSync(tempAssPath, assContent, 'utf-8')

        // Build filter using ASS file. Escape Windows drive-letter colon.
        let assPathForFfmpeg = path.resolve(tempAssPath).replace(/\\/g, '/')
        assPathForFfmpeg = assPathForFfmpeg.replace(/^([A-Za-z]):/, '$1\\:')

        const subtitleFilter = `subtitles=filename='${assPathForFfmpeg}'`
    
        log.debug({ msg: 'Burning subtitles', video: videoPath, subtitles: subtitlePath, tempSubtitles: tempSubtitlePath, tempAss: tempAssPath, output: outputPath })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fluent-ffmpeg chain types are incomplete
        const cmd = (ffmpeg(videoPath) as any)
          .inputOptions(getGpuInputOptions())
          .videoFilters(subtitleFilter)
          .videoCodec(getGpuVideoCodec())
          .outputOptions(['-threads', FFMPEG_THREADS, ...getEncodePresetOptions(), '-c:a', 'copy'])
          .on('progress', (progress: { percent?: number; timemark?: string }) => {
            hung.reset()
            onProgress?.({
              percent: progress.percent || 0,
              timemark: progress.timemark,
            })
          })
          .on('end', () => {
            hung.clear()
            try {
              if (fs.existsSync(tempSubtitlePath)) fs.unlinkSync(tempSubtitlePath)
              if (fs.existsSync(tempAssPath)) fs.unlinkSync(tempAssPath)
            } catch (e) { /* ignore */ }
            log.debug({ msg: 'Subtitle burning completed', outputPath })
            resolve(outputPath)
          })
          .on('error', (err: any, stdout: any, stderr: any) => {
            hung.clear()
            try {
              if (fs.existsSync(tempSubtitlePath)) fs.unlinkSync(tempSubtitlePath)
              if (fs.existsSync(tempAssPath)) fs.unlinkSync(tempAssPath)
            } catch (e) { /* ignore */ }
            log.error({ msg: 'FFmpeg error', error: (err as Error)?.message ?? String(err) })
            reject(new Error(`FFmpeg error: ${err?.message || err}\n${stderr || ''}`))
          })
          .on('stderr', (stderrLine: string) => {
            if (stderrLine.includes('error') || stderrLine.includes('Error')) {
              log.error({ msg: 'FFmpeg stderr', line: stderrLine })
            }
          })
        const hung = setupHungProtection(cmd, reject)
        cmd.save(outputPath)
      })
      .catch((err) => {
        try {
          if (fs.existsSync(tempSubtitlePath)) fs.unlinkSync(tempSubtitlePath)
        } catch {}
        reject(err)
      })
  })
}

/**
 * Compress video. Phase 1B: optional profile (web/mobile/archive) for resolution + CRF.
 */
export function compressVideo(
  inputPath: string,
  outputPath: string,
  crf: number,
  onProgress?: (progress: FFmpegProgress) => void,
  profile?: CompressProfile
): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = (scaleFilter: string | null, useCrf: number) => {
      const opts: string[] = [
        '-threads', FFMPEG_THREADS,
        ...(getGpuVideoCodec() === 'h264_nvenc' ? [`-cq`, String(useCrf)] : [`-crf`, String(useCrf)]),
        ...getEncodePresetOptions(),
        '-movflags +faststart',
      ]
      if (scaleFilter) opts.push('-vf', scaleFilter)
      const stderrLines: string[] = []
      const cmd = ffmpeg(inputPath)
        .inputOptions(getGpuInputOptions())
        .videoCodec(getGpuVideoCodec())
        .outputOptions(opts)
        .on('progress', (progress: { percent?: number; timemark?: string }) => {
          hung.reset()
          onProgress?.({ percent: progress.percent || 0, timemark: progress.timemark })
        })
        .on('stderr', (line: string) => { stderrLines.push(line) })
        .on('end', () => {
          hung.clear()
          resolve(outputPath)
        })
        .on('error', (err: Error) => {
          hung.clear()
          const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
          reject(new Error(stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message))
        })
      const hung = setupHungProtection(cmd, reject)
      cmd.save(outputPath)
    }

    if (!profile || profile === 'archive') {
      run(null, crf)
      return
    }

    getVideoMetadata(inputPath)
      .then(({ width, height }) => {
        const max = PROFILE_MAX[profile]
        let scaleFilter: string | null = null
        if (width > max.w || height > max.h) {
          const scale = Math.min(max.w / width, max.h / height, 1)
          const w = Math.round(width * scale)
          const h = Math.round(height * scale)
          scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease`
        }
        run(scaleFilter, PROFILE_CRF[profile])
      })
      .catch(() => run(null, crf))
  })
}

/** ffprobe JSON probes: larger second pass helps moov-at-end / sparse metadata. */
const FFPROBE_PROBE_DEEP = { probesize: '256M', analyzeduration: '256M' } as const
/** Last-resort: parse ffmpeg -i banner (stderr); only for small files to avoid slow opens. */
const FFMPEG_BANNER_MAX_BYTES = 25 * 1024 * 1024
const FFMPEG_BANNER_TIMEOUT_MS = 15_000

function finitePositiveSeconds(n: unknown): number | null {
  const x = typeof n === 'string' ? parseFloat(n) : typeof n === 'number' ? n : NaN
  if (!Number.isFinite(x) || x <= 0) return null
  return x
}

function parseDurationTag(tag: string): number | null {
  const s = tag.trim()
  const m = /^(\d+):(\d{2}):(\d+(?:\.\d+)?)$/.exec(s)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const sec = parseFloat(m[3])
  if (min > 59 || sec >= 60) return null
  return h * 3600 + min * 60 + sec
}

function tagsDurationFromTags(tags: Record<string, string> | undefined): number | null {
  if (!tags) return null
  const keys = ['DURATION', 'Duration', 'duration']
  for (const k of keys) {
    const v = tags[k]
    if (typeof v === 'string' && v) {
      const d = parseDurationTag(v)
      if (d !== null && d > 0) return d
    }
  }
  return null
}

function parseTimeBaseSeconds(tb: string | undefined): number | null {
  if (!tb || typeof tb !== 'string') return null
  const parts = tb.split('/')
  if (parts.length !== 2) return null
  const num = parseInt(parts[0], 10)
  const den = parseInt(parts[1], 10)
  if (!Number.isFinite(den) || den === 0 || !Number.isFinite(num)) return null
  return num / den
}

function durationFromStreamNbFrames(stream: Record<string, unknown>): number | null {
  const ratio = parseTimeBaseSeconds(stream.time_base as string | undefined)
  if (!ratio || ratio <= 0) return null
  const nf = stream.nb_frames
  const n = typeof nf === 'string' ? parseInt(nf, 10) : typeof nf === 'number' ? nf : NaN
  if (!Number.isFinite(n) || n <= 0) return null
  return n * ratio
}

/** Where duration was resolved from (logging / metering diagnostics). */
export type DurationProbeSource = 'format' | 'stream' | 'tag' | 'fallback' | 'unknown'

const SOURCE_PRIORITY: Record<Exclude<DurationProbeSource, 'unknown'>, number> = {
  format: 5,
  stream: 4,
  tag: 3,
  fallback: 2,
}

function pickBestDurationSource(
  candidates: { seconds: number; source: Exclude<DurationProbeSource, 'unknown'> }[]
): { seconds: number; source: Exclude<DurationProbeSource, 'unknown'> } | null {
  if (candidates.length === 0) return null
  const maxSec = Math.max(...candidates.map((c) => c.seconds))
  const tied = candidates.filter((c) => c.seconds === maxSec)
  tied.sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source])
  return tied[0]
}

/**
 * Collects plausible durations from ffprobe JSON (format, streams, tags, nb_frames*time_base).
 */
export function collectFfprobeDurationCandidates(
  data: unknown
): { seconds: number; source: Exclude<DurationProbeSource, 'unknown' | 'fallback'> }[] {
  const candidates: { seconds: number; source: Exclude<DurationProbeSource, 'unknown' | 'fallback'> }[] = []
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const format = root?.format && typeof root.format === 'object' ? (root.format as Record<string, unknown>) : null

  if (format) {
    const fd = finitePositiveSeconds(format.duration)
    if (fd !== null) candidates.push({ seconds: fd, source: 'format' })
    const ftags = format.tags as Record<string, string> | undefined
    const td = tagsDurationFromTags(ftags)
    if (td !== null) candidates.push({ seconds: td, source: 'tag' })
  }

  const streams = Array.isArray(root?.streams) ? (root.streams as Record<string, unknown>[]) : []
  for (const s of streams) {
    const ct = s.codec_type
    if (ct !== 'video' && ct !== 'audio') continue
    const sd = finitePositiveSeconds(s.duration)
    if (sd !== null) candidates.push({ seconds: sd, source: 'stream' })
    const stags = s.tags as Record<string, string> | undefined
    const td = tagsDurationFromTags(stags)
    if (td !== null) candidates.push({ seconds: td, source: 'tag' })
    const nb = durationFromStreamNbFrames(s)
    if (nb !== null && nb > 0) candidates.push({ seconds: nb, source: 'stream' })
  }

  return candidates
}

/**
 * Collects plausible durations from ffprobe JSON (format, streams, tags, nb_frames*time_base).
 */
export function resolveDurationSecondsFromFfprobeJson(data: unknown): number {
  const candidates = collectFfprobeDurationCandidates(data)
  if (candidates.length === 0) return 0
  return Math.max(...candidates.map((c) => c.seconds))
}

export interface VideoDurationProbeResult {
  known: boolean
  seconds: number
  source: DurationProbeSource
  lastError?: string
}

async function ffprobeJson(
  videoPath: string,
  opts?: { probesize?: string; analyzeduration?: string }
): Promise<unknown> {
  const probesize = opts?.probesize ?? '100M'
  const analyzeduration = opts?.analyzeduration ?? '100M'
  const args = [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    '-probesize',
    probesize,
    '-analyzeduration',
    analyzeduration,
    videoPath,
  ]
  const { stdout } = await execFileAsync(ffprobePath, args, { maxBuffer: 20 * 1024 * 1024 })
  return JSON.parse(stdout)
}

function getDurationFromFfmpegBanner(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', videoPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const chunks: Buffer[] = []
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        proc.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      fn()
    }
    const timer = setTimeout(() => {
      finish(() => reject(new Error('ffmpeg duration banner probe timed out')))
    }, FFMPEG_BANNER_TIMEOUT_MS)

    const tryParse = (buf: Buffer) => {
      const s = buf.toString('utf8')
      // Typical: "Duration: 00:01:30.04" or "Duration: 01:23:45.000" (fraction optional in some builds)
      const m = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(s)
      if (m) {
        const h = parseInt(m[1], 10)
        const min = parseInt(m[2], 10)
        const sec = parseFloat(m[3])
        const total = h * 3600 + min * 60 + sec
        if (Number.isFinite(total) && total > 0) {
          finish(() => resolve(total))
        }
      }
    }

    proc.stderr?.on('data', (d: Buffer) => {
      chunks.push(d)
      tryParse(Buffer.concat(chunks))
    })
    proc.stdout?.on('data', () => {
      /* ignore */
    })
    proc.on('error', (e) => finish(() => reject(e)))
    proc.on('close', () => {
      if (settled) return
      tryParse(Buffer.concat(chunks))
      if (!settled) finish(() => reject(new Error('Could not parse duration from ffmpeg output')))
    })
  })
}

/**
 * Probe duration without throwing when metadata is missing (still throws if file does not exist).
 * Use for validation gates: unknown duration must not fail the job; enforce limits only when known.
 */
export async function probeVideoDurationResult(videoPath: string): Promise<VideoDurationProbeResult> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  let lastErr: Error | null = null
  const probePasses: (typeof FFPROBE_PROBE_DEEP | undefined)[] = [undefined, FFPROBE_PROBE_DEEP]
  for (const probeOpts of probePasses) {
    try {
      const j = probeOpts
        ? await ffprobeJson(videoPath, { probesize: probeOpts.probesize, analyzeduration: probeOpts.analyzeduration })
        : await ffprobeJson(videoPath)
      const candidates = collectFfprobeDurationCandidates(j)
      const best = pickBestDurationSource(candidates)
      if (best && best.seconds > 0) {
        log.info({
          msg: 'video_duration_probe',
          videoPath,
          duration_sec: best.seconds,
          duration_source: best.source,
          pass: probeOpts ? 'deep' : 'default',
        })
        return { known: true, seconds: best.seconds, source: best.source }
      }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      log.error({ msg: 'ffprobe json failed', videoPath, pass: probeOpts ? 'deep' : 'default', error: lastErr.message })
    }
  }

  try {
    const st = fs.statSync(videoPath)
    if (st.size <= FFMPEG_BANNER_MAX_BYTES) {
      const d3 = await getDurationFromFfmpegBanner(videoPath)
      if (d3 > 0) {
        log.info({ msg: 'video_duration_probe', videoPath, duration_sec: d3, duration_source: 'fallback' })
        return { known: true, seconds: d3, source: 'fallback' }
      }
    }
  } catch (e) {
    log.debug({ msg: 'ffmpeg banner duration fallback failed', videoPath, error: (e as Error)?.message ?? String(e) })
  }

  const msg = lastErr
    ? `Could not determine video duration from metadata (${lastErr.message})`
    : 'Could not determine video duration from metadata. If the file plays in your browser, try re-exporting as MP4 (H.264/AAC) or contact support.'
  log.info({ msg: 'video_duration_probe', videoPath, duration_source: 'unknown', known: false, last_error: msg })
  return { known: false, seconds: 0, source: 'unknown', lastError: msg }
}

/**
 * Resolve duration from ffprobe JSON (preferred), deeper probe, then small-file ffmpeg banner.
 * Throws if duration cannot be determined (strict callers).
 */
export async function probeDurationSeconds(videoPath: string): Promise<number> {
  const r = await probeVideoDurationResult(videoPath)
  if (!r.known) {
    throw new Error(r.lastError || 'Could not determine video duration from metadata')
  }
  return r.seconds
}

/**
 * Get video duration in seconds (multi-source ffprobe + optional small-file fallback).
 */
export function getVideoDuration(videoPath: string): Promise<number> {
  return probeDurationSeconds(videoPath)
}

/** Phase 1B — UTILITY 6: Video metadata for resolution targeting. */
export async function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  let bestW = 0
  let bestH = 0
  let bestD = 0
  let lastErr: Error | null = null
  const probePasses: (typeof FFPROBE_PROBE_DEEP | undefined)[] = [undefined, FFPROBE_PROBE_DEEP]

  for (const probeOpts of probePasses) {
    try {
      const j = probeOpts
        ? await ffprobeJson(videoPath, { probesize: probeOpts.probesize, analyzeduration: probeOpts.analyzeduration })
        : await ffprobeJson(videoPath)
      const streams = Array.isArray((j as Record<string, unknown>)?.streams)
        ? ((j as Record<string, unknown>).streams as Record<string, unknown>[])
        : []
      const v = streams.find((s) => s.codec_type === 'video')
      const w = Number(v?.width) || 0
      const h = Number(v?.height) || 0
      const d = resolveDurationSecondsFromFfprobeJson(j)
      if (w && h) {
        bestW = w
        bestH = h
      }
      if (d > bestD) bestD = d
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }

  if (!bestW || !bestH) {
    throw new Error(lastErr ? `Failed to probe video: ${lastErr.message}` : 'Could not read video resolution')
  }

  if (bestD <= 0) {
    try {
      const st = fs.statSync(videoPath)
      if (st.size <= FFMPEG_BANNER_MAX_BYTES) {
        bestD = await getDurationFromFfmpegBanner(videoPath)
      }
    } catch {
      /* ignore */
    }
  }

  return { width: bestW, height: bestH, duration: bestD }
}

/** Phase 1B — Preset profiles: Web (720p), Mobile (480p), Archive (original). */
export type CompressProfile = 'web' | 'mobile' | 'archive'

const PROFILE_MAX: Record<CompressProfile, { w: number; h: number }> = {
  web: { w: 1280, h: 720 },
  mobile: { w: 854, h: 480 },
  archive: { w: 4096, h: 2160 },
}

const PROFILE_CRF: Record<CompressProfile, number> = {
  web: 26,
  mobile: 28,
  archive: 23,
}
