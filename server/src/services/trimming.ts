import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

/** Align with services/ffmpeg.ts. */
const FFMPEG_THREADS = process.env.FFMPEG_THREADS || '4'

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

export interface TrimOptions {
  inputPath: string
  startTime: number // seconds
  endTime: number // seconds
}

export interface TrimResult {
  outputPath: string
  trimmedDuration: number
}

/** Extensions that use the MOV/MP4 muxer family — the only ones that support -movflags. */
const MOV_CONTAINER_EXTS = new Set(['.mp4', '.mov', '.m4v', '.m4a', '.3gp', '.3g2', '.mj2'])

/**
 * Trim video segment. Uses stream copy (-c copy) for speed; no re-encode.
 * Cut points may be up to one keyframe off; use for speed-first workflows.
 */
export function trimVideoSegment(options: TrimOptions): Promise<TrimResult> {
  const { inputPath, startTime, endTime } = options
  const duration = Math.max(0, endTime - startTime)
  const outputPath = path.join(
    tempDir,
    `trimmed-${Date.now()}-${path.basename(inputPath)}`
  )
  // -movflags +faststart moves the moov atom to the start of the file so ffprobe
  // can read it immediately. It is only valid for the MOV/MP4 muxer family —
  // passing it to .mkv/.webm/.avi would cause "Option movflags not found" error.
  const isMp4Container = MOV_CONTAINER_EXTS.has(path.extname(inputPath).toLowerCase())
  const outputOptions = [
    '-threads', FFMPEG_THREADS,
    '-c', 'copy',
    '-t', String(duration),
    '-avoid_negative_ts', 'make_zero',
    '-strict', '-2', // allow Opus in MP4 (experimental in muxer)
    ...(isMp4Container ? ['-movflags', '+faststart'] : []),
  ]

  return new Promise((resolve, reject) => {
    const stderrLines: string[] = []
    ffmpeg(inputPath)
      .inputOptions(['-ss', String(startTime)])
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('stderr', (line: string) => { stderrLines.push(line) })
      .on('end', () => {
        resolve({
          outputPath,
          trimmedDuration: duration,
        })
      })
      .on('error', (err: Error) => {
        const stderr = stderrLines.length ? stderrLines.join('\n').trim().slice(-2000) : ''
        const msg = stderr ? `${err.message}\nffmpeg stderr:\n${stderr}` : err.message
        reject(new Error(msg))
      })
      .run()
  })
}

