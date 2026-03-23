import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

/**
 * GET /api/audio/:filename
 *
 * Serve AAC/M4A audio files extracted for browser playback.
 * Uses Content-Type: audio/mp4 and Content-Disposition: inline so every browser
 * (Chrome, Safari, Firefox, Edge) can play and seek without downloading the file.
 * Only .m4a files are served from this route.
 */
router.get('/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params

    // Whitelist: only serve .m4a files from this route
    if (!filename.endsWith('.m4a')) {
      return res.status(400).json({ message: 'Only .m4a audio files are served from this endpoint' })
    }

    const filePath = path.join(tempDir, filename)

    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(tempDir)
    if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
      return res.status(403).json({ message: 'Access denied' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Audio file not found or has expired' })
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const rangeHeader = req.headers.range

    if (rangeHeader) {
      // Partial content for seeking — required by Safari and mobile browsers
      const [, rangeStr] = rangeHeader.split('=')
      const [startStr, endStr] = (rangeStr || '').split('-')
      const start = parseInt(startStr, 10) || 0
      const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : fileSize - 1
      const chunkSize = end - start + 1
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mp4',
        'Content-Disposition': 'inline',
      })
      fs.createReadStream(filePath, { start, end }).pipe(res)
      return
    }

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Length', fileSize)
    res.setHeader('Content-Type', 'audio/mp4')
    res.setHeader('Content-Disposition', 'inline')
    fs.createReadStream(filePath).pipe(res)
  } catch (error: any) {
    log.error({ msg: 'Audio serve error', error: String(error) })
    res.status(500).json({ message: error.message || 'Audio serve failed' })
  }
})

export default router
