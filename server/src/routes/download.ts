import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { getEffectivePlan } from '../utils/subscriptionGuard'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

// Strong, highly visible watermark strings
const WATERMARK_LINE1 = 'Fast AI transcription by VideoText.io — Free Plan'
const WATERMARK_LINE2 = '⚠  Remove this watermark: videotext.io/pricing  |  Upgrade to Pro'
const WATERMARK_SEPARATOR = '=================================================================================='
const TEXT_EXTENSIONS = new Set(['.srt', '.vtt', '.txt', '.json', '.csv'])

/**
 * Apply a strong, highly visible watermark to free-plan exports.
 * - SRT/VTT: first 8-second cue at the very start, impossible to miss
 * - TXT/CSV: bold header + footer with separator lines
 * - JSON: _watermark field at the top
 */
function applyWatermark(content: string, ext: string): string {
  switch (ext) {
    case '.srt': {
      // Prominent 8-second two-line cue at the very start of the video
      const cue = [
        '0',
        '00:00:00,000 --> 00:00:08,000',
        WATERMARK_LINE1,
        WATERMARK_LINE2,
        '',
        '',
      ].join('\n')
      return cue + content.trimStart()
    }
    case '.vtt': {
      const lines = content.split('\n')
      const headerIdx = lines.findIndex((l) => l.startsWith('WEBVTT'))
      const cueLines = ['', '00:00:00.000 --> 00:00:08.000', WATERMARK_LINE1, WATERMARK_LINE2, '']
      if (headerIdx >= 0) {
        lines.splice(headerIdx + 1, 0, ...cueLines)
      }
      return lines.join('\n')
    }
    case '.json': {
      try {
        const obj = JSON.parse(content)
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
          const watermarked = {
            _watermark: `${WATERMARK_LINE1} | ${WATERMARK_LINE2}`,
            _upgrade: 'videotext.io/pricing',
            ...obj,
          }
          return JSON.stringify(watermarked, null, 2)
        }
      } catch { /* fall through */ }
      return `${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n\n${content}\n\n${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n`
    }
    default: {
      // TXT, CSV, and any other text format
      const header = `${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n\n`
      const footer = `\n\n${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n`
      return header + content + footer
    }
  }
}

router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const filePath = path.join(tempDir, filename)

    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(tempDir)

    if (!resolvedPath.startsWith(resolvedDir)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' })
    }

    // Safe filename for Content-Disposition: no CR/LF/control chars, escape quotes
    const safeForHeader = filename.replace(/[\0\r\n]/g, '').replace(/"/g, '\\"')
    const asciiSafe = safeForHeader.replace(/[^\x20-\x7E]/g, '_')

    const ext = path.extname(filename).toLowerCase()
    const isDownloadRequest = req.query.wm === '1'

    // Apply server-side watermark when ?wm=1 and user is on free plan (or unauthenticated)
    if (isDownloadRequest && TEXT_EXTENSIONS.has(ext)) {
      const { plan } = await getEffectivePlan(req)
      const isPaid = plan !== 'free'

      if (!isPaid) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const watermarked = applyWatermark(content, ext)
        res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"`)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.send(watermarked)
      }
    }

    // Paid plan or non-text file: stream directly with optional Range support
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const rangeHeader = req.headers.range

    if (rangeHeader) {
      const [unit, rangeStr] = rangeHeader.split('=')
      const [startStr, endStr] = (rangeStr || '').split('-')
      const start = parseInt(startStr, 10) || 0
      const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : fileSize - 1
      const chunkSize = end - start + 1
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Disposition': `attachment; filename="${asciiSafe}"`,
        'Content-Type': unit === 'bytes' ? 'application/octet-stream' : 'application/octet-stream',
      })
      fs.createReadStream(filePath, { start, end }).pipe(res)
      return
    }

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Length', fileSize)
    res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"`)
    res.setHeader('Content-Type', 'application/octet-stream')
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error: any) {
    log.error({ msg: 'Download error', error: String(error) })
    res.status(500).json({ message: error.message || 'Download failed' })
  }
})

export default router
