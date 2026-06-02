import express, { Request, Response } from 'express'
import { RequestWithId } from '../middleware/requestId'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileQueue, addJobToQueue, getJobById, getTotalQueueCount as getQueueCountFromWorker, JobData } from '../workers/videoProcessor'
import { validateFileType, validateFileSize, validateSubtitleFile } from '../utils/fileValidation'
import { enforceLanguageLimits, enforceUsageLimits, getDailySoftCapConcurrency, getJobPriority, getMaxDailyImports, getPlanLimits, applySystemLoadGuard } from '../utils/limits'
import { resetDailyImportIfNeeded, resetDailyMinutesIfNeeded, resetUserUsageIfNeeded } from '../utils/usageReset'
import { getUser, saveUser, PlanType, User, atomicResetDailyImportIfNeeded, atomicResetDailyMinutesIfNeeded } from '../models/User'
import { hashFile, checkDuplicateProcessing } from '../services/duplicate'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { sanitizeFilename } from '../utils/sanitizeFilename'
import { assertPathWithinDir } from '../utils/assertPathWithinDir'
import { isQueueAtHardLimit, isQueueAtSoftLimit, getSystemConcurrencyMultiplier } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'
import { checkAndRecordGuestIpImport, extractClientIp } from '../utils/guestIpLimit'
import { trackJobCreated } from '../utils/analytics'
import { insertJobRecord } from '../lib/jobAnalytics'
import { probeVideoDurationResult } from '../services/ffmpeg'
import { STREAM_UPLOAD_ASSEMBLY } from '../utils/featureFlags'
import { getLogger } from '../lib/logger'
import { isValidYoutubeUrl, getYoutubeMetadata, normalizeYoutubeUrl } from '../services/youtube'
import { checkAndRecordYoutubeJob } from '../utils/youtubeRateLimit'
import { enforceSubscriptionState, resolveRequestPlan } from '../utils/subscriptionGuard'

const router = express.Router()
const uploadLog = getLogger('api')

import { normalizeLanguageCode } from '../utils/normalizeLanguage'

// Configure multer for file uploads. On Railway/Fly/Render only /tmp is guaranteed; relative paths can stall Multer.
const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const MAX_CHUNKS = 2000

// Chunked upload metadata (uploadId -> { ... }). Not deleted until /complete finishes successfully.
const chunkUploadMeta = new Map<string, {
  userId: string | null
  plan: PlanType
  filename: string
  totalChunks: number
  totalSize: number
  toolType: string
  options: Record<string, unknown>
  /** Creation time — used to prune abandoned uploads. */
  createdAt: number
}>()

// Prune abandoned upload sessions (never completed) older than 4 hours
const CHUNK_META_TTL_MS = 4 * 60 * 60 * 1000
setInterval(() => {
  const cutoff = Date.now() - CHUNK_META_TTL_MS
  for (const [id, meta] of chunkUploadMeta.entries()) {
    if (meta.createdAt < cutoff) {
      chunkUploadMeta.delete(id)
      const dir = path.join(chunksDir, id)
      if (fs.existsSync(dir)) {
        fs.rm(dir, { recursive: true, force: true }, () => {})
      }
    }
  }
}, 30 * 60 * 1000).unref()

// Tracks uploadIds currently being assembled — prevents duplicate /complete calls
const completingUploads = new Set<string>()
const chunksDir = path.join(tempDir, 'chunks')
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir)
  },
  filename: (req, file, cb) => {
    const safe = sanitizeFilename(file.originalname)
    const uniqueName = `${uuidv4()}-${safe}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 * 1024, // 20GB — max plan (Agency); plan enforcement after upload
  },
})

async function getTotalQueueCount(): Promise<number> {
  return getQueueCountFromWorker()
}

// Single file upload
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  const uploadStartMs = Date.now()
  try {
    const userId = getEffectiveUserId(req) ?? `guest_${uuidv4()}`

    const { toolType, url, webhookUrl, ...options } = req.body

    if (url && (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles')) {
      return res.status(400).json({ message: 'URL downloads are temporarily disabled.' })
    }

    const auth = getAuthFromRequest(req)
    const rateLimitKey = userId
    let user = await getUser(userId)
    const now = new Date()
    if (user) await enforceSubscriptionState(user, now)
    const plan = resolveRequestPlan(user, auth?.plan)

    // Guest IP daily cap — prevents limit bypass via fresh guest UUIDs per request
    if (userId.startsWith('guest_')) {
      const clientIp = extractClientIp(req)
      if (!await checkAndRecordGuestIpImport(clientIp)) {
        if (req.file) try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
        return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
      }
    }

    if (!await checkAndRecordUpload(rateLimitKey)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }

    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }
    if (isQueueAtSoftLimit(queueCount) && plan === 'free') {
      res.setHeader('Retry-After', '60')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    const limits = user?.limits ?? getPlanLimits(plan)
    if (!user) {
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      user = {
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: '',
        plan,
        stripeCustomerId: undefined,
        subscriptionId: undefined,
        paymentMethodId: undefined,
        usageThisMonth: {
          totalMinutes: 0,
          videoCount: 0,
          batchCount: 0,
          languageCount: 0,
          translatedMinutes: 0,
          importCount: 0,
          resetDate,
          importCountToday: 0,
          importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          dailyMinutesToday: 0,
          dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        limits,
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      // Guest users are ephemeral — skip DB write to avoid stripeCustomerId unique constraint issues
      if (!userId.startsWith('guest_')) await saveUser(user)
    } else {
      if (user.plan !== plan) {
        user.plan = plan
        user.limits = getPlanLimits(plan)
        user.updatedAt = now
        await saveUser(user)
      }
      if (resetUserUsageIfNeeded(user, now)) {
        await saveUser(user)
      }
      const dailyImportReset = resetDailyImportIfNeeded(user, now)
      const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
      if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
    }

    // Free plan: 3 imports per day (resets at midnight UTC)
    const dailyCap = getMaxDailyImports(user.plan)
    if (dailyCap !== null && (user.usageThisMonth.importCountToday ?? 0) >= dailyCap) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
      }
      return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
    }

    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as JobData)?.userId === userId)
    // Enforce plan-aware soft-cap concurrency (e.g. Pro drops 4→2→1 after 90/180 daily min)
    // then apply the global system load multiplier so spikes degrade gracefully.
    const planConcurrency = getDailySoftCapConcurrency(plan, user?.usageThisMonth?.dailyMinutesToday ?? 0)
    const effectiveConcurrency = applySystemLoadGuard(planConcurrency, getSystemConcurrencyMultiplier(queueCount))
    if (activeForUser.length >= effectiveConcurrency) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    if (!toolType) {
      return res.status(400).json({ message: 'toolType is required' })
    }

    // File-based input
    if (!req.file) {
      uploadLog.warn({ msg: '[upload] no file in request', toolType, bodyKeys: Object.keys(req.body) })
      return res.status(400).json({ message: 'No file uploaded' })
    }
    const file = req.file

    if (file.size > limits.maxFileSize) {
      fs.unlinkSync(file.path)
      return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
    }

    // Audio-only upload (video-to-transcript / video-to-subtitles): client sent pre-extracted audio; skip server extraction
    const allowedAudioExt = ['.mp3', '.webm', '.wav', '.m4a']
    const looksLikeAudio =
      (file.mimetype && file.mimetype.startsWith('audio/')) ||
      allowedAudioExt.some((ext) => file.originalname.toLowerCase().endsWith(ext))
    const isAudioOnlyUpload =
      (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') &&
      (req.body.uploadMode === 'audio-only' || looksLikeAudio)
    const inputType: 'video' | 'audio' = isAudioOnlyUpload && looksLikeAudio ? 'audio' : 'video'
    const originalNameForJob =
      inputType === 'audio' && req.body.originalFileName
        ? String(req.body.originalFileName)
        : file.originalname

    // Validate file type based on tool
    let typeError: string | null = null
    if (toolType === 'translate-subtitles' || toolType === 'fix-subtitles' || toolType === 'convert-subtitles') {
      const isPlainText = file.originalname.toLowerCase().endsWith('.txt')
      if (toolType === 'translate-subtitles' && isPlainText) {
        // .txt files are valid for translation — no subtitle structure required
        uploadLog.info({ msg: '[upload] txt translation file accepted', originalname: file.originalname })
      } else {
        const subResult = await validateSubtitleFile(file.path)
        uploadLog.info({ msg: '[upload] subtitle validation',
          toolType,
          originalname: file.originalname,
          detectedFormat: subResult.detectedFormat,
          validationError: subResult.error ?? undefined,
        })
        if (subResult.error) {
          typeError = subResult.error
        }
      }
    } else if (toolType !== 'burn-subtitles' && inputType !== 'audio') {
      // For video tools (and not audio-only), validate video type (extension fallback for AVI etc.)
      typeError = await validateFileType(file.path, file.originalname)
    }

    if (typeError) {
      fs.unlinkSync(file.path)
      return res.status(400).json({ message: typeError })
    }

    // Cleanup (unlinkSync) runs only on error paths above; we never delete the file before enqueue.
    // The worker needs the file on disk; fileCleanup cron removes old files later.

    // Parse additional languages if provided
    let additionalLanguages: string[] = []
    if (options.additionalLanguages) {
      try {
        additionalLanguages = typeof options.additionalLanguages === 'string'
          ? JSON.parse(options.additionalLanguages)
          : options.additionalLanguages
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Create job in queue
    let exportFormats: ('txt' | 'json' | 'docx' | 'pdf')[] | undefined
    if (options.exportFormats) {
      try {
        const arr = typeof options.exportFormats === 'string' ? JSON.parse(options.exportFormats) : options.exportFormats
        if (Array.isArray(arr)) exportFormats = arr.filter((f: string) => ['txt', 'json', 'docx', 'pdf'].includes(f))
      } catch {
        // ignore
      }
    }
    const jobOptions: any = {
      format: options.format,
      language: normalizeLanguageCode(options.language),
      targetLanguage: options.targetLanguage,
      compressionLevel: options.compressionLevel,
      targetFormat: options.targetFormat,
      fixTiming: options.fixTiming,
      timingOffsetMs: options.timingOffsetMs,
      grammarFix: options.grammarFix,
      lineBreakFix: options.lineBreakFix,
      removeFillers: options.removeFillers === true || options.removeFillers === 'true',
      compressProfile: options.compressProfile,
      includeSummary: options.includeSummary === true || options.includeSummary === 'true',
      includeChapters: options.includeChapters === true || options.includeChapters === 'true',
      speakerDiarization: options.speakerDiarization === true || options.speakerDiarization === 'true',
      numSpeakers: options.numSpeakers ? Number(options.numSpeakers) : undefined,
      diarizationLanguage: typeof options.diarizationLanguage === 'string' && options.diarizationLanguage.trim() ? options.diarizationLanguage.trim() : undefined,
      glossary: typeof options.glossary === 'string' && options.glossary.trim() ? options.glossary.trim() : undefined,
      exportFormats,
    }
    if (additionalLanguages.length > 0) {
      jobOptions.additionalLanguages = additionalLanguages
    }

    // Enforce multi-language limits (plan-based); requires authenticated user
    if (user && toolType === 'video-to-subtitles' && additionalLanguages.length > 0) {
      const langCheck = enforceLanguageLimits(user, additionalLanguages)
      if (!langCheck.allowed) {
        fs.unlinkSync(file.path)
        return res.status(403).json({ message: langCheck.reason || 'MULTI_LANGUAGE_NOT_AVAILABLE' })
      }
    }

    // Server-side minute limit for paid plans only; free plan uses import count (checked above)
    const minuteChargingTools = ['video-to-transcript', 'video-to-subtitles', 'burn-subtitles', 'compress-video']
    if (user.plan !== 'free' && minuteChargingTools.includes(toolType)) {
      const probe = await probeVideoDurationResult(file.path)
      let durationSeconds = probe.known ? probe.seconds : 0
      if (!probe.known) {
        uploadLog.info({
          msg: 'upload_duration_unknown_allowing_job',
          toolType,
          duration_source: probe.source,
        })
      }
      if (options.trimmedStart != null && options.trimmedEnd != null) {
        const start = parseFloat(String(options.trimmedStart))
        const end = parseFloat(String(options.trimmedEnd))
        durationSeconds = Math.max(0, end - start)
      }
      const requestedMinutes = Math.ceil(durationSeconds / 60)
      const limitCheck = await enforceUsageLimits(user, requestedMinutes)
      if (!limitCheck.allowed) {
        fs.unlinkSync(file.path)
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
      }
    }

    // Cache lookup: same user + same file + same tool + same options → instant result (configurable TTL). Skip for audio-only (hash would be of audio, not video).
    let videoHash: string | undefined
    if (
      userId &&
      (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') &&
      inputType !== 'audio'
    ) {
      try {
        videoHash = await hashFile(file.path)
        const cacheOptions = { ...jobOptions } as Record<string, unknown>
        if (options.trimmedStart != null) cacheOptions.trimmedStart = parseFloat(String(options.trimmedStart))
        if (options.trimmedEnd != null) cacheOptions.trimmedEnd = parseFloat(String(options.trimmedEnd))
        const cached = await checkDuplicateProcessing(userId, videoHash, toolType, cacheOptions)
        if (cached && fs.existsSync(cached.outputPath)) {
          const cachedFileName = cached.fileName || path.basename(cached.outputPath)
          const cachedJob = await addJobToQueue(plan, {
            toolType: 'cached-result',
            userId,
            plan,
            cachedResult: {
              downloadUrl: `/api/download/${cachedFileName}`,
              fileName: cachedFileName,
            },
            requestId: (req as RequestWithId).requestId,
          })
          try {
            await insertJobRecord({
              id: String(cachedJob.id),
              userId,
              toolType: 'cached-result',
              planAtRun: plan,
            })
          } catch {
            // non-blocking
          }

          return res.status(202).json({
            jobId: cachedJob.id,
            status: 'queued',
            jobToken: (cachedJob.data as JobData)?.jobToken,
          })
        }
      } catch {
        // If hashing fails, fall back to normal processing
      }
    }

    // If the client already has a Deepgram live transcript, skip Whisper
    let parsedPrecomputedTranscript: JobData['precomputedTranscript'] | undefined
    if (typeof options.precomputedTranscript === 'string' && options.precomputedTranscript.trim()) {
      try {
        parsedPrecomputedTranscript = JSON.parse(options.precomputedTranscript)
      } catch {
        // Ignore — fall back to normal Whisper transcription
      }
    }

    const job = await addJobToQueue(plan, {
      toolType,
      filePath: file.path,
      userId,
      plan,
      videoHash,
      originalName: originalNameForJob,
      fileSize: file.size,
      trimmedStart: options.trimmedStart != null ? parseFloat(String(options.trimmedStart)) : undefined,
      trimmedEnd: options.trimmedEnd != null ? parseFloat(String(options.trimmedEnd)) : undefined,
      options: Object.keys(jobOptions).length > 0 ? jobOptions : undefined,
      webhookUrl: typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined,
      inputType: inputType === 'audio' ? 'audio' : undefined,
      requestId: (req as RequestWithId).requestId,
      ...(parsedPrecomputedTranscript && { precomputedTranscript: parsedPrecomputedTranscript }),
    })
    uploadLog.info({ msg: 'upload_end', jobId: job.id, durationMs: Date.now() - uploadStartMs })
    try {
      trackJobCreated({
        job_id: String(job.id),
        user_id: userId,
        tool_type: toolType,
        file_size_bytes: file.size,
        plan,
      })
    } catch {
      // non-blocking
    }
    try {
      await insertJobRecord({
        id: String(job.id),
        userId,
        toolType: inputType === 'audio' ? 'voice-to-transcript' : toolType,
        planAtRun: plan,
        fileSizeBytes: file.size,
      })
    } catch {
      // non-blocking
    }
    res.status(202).json({
      jobId: job.id,
      status: 'queued',
      jobToken: (job.data as JobData)?.jobToken,
    })
  } catch (error: any) {
    uploadLog.error({ msg: 'Upload error', error: String(error) })
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({ message: error.message || 'Upload failed' })
  }
})

// Dual file upload (for burn-subtitles)
router.post('/dual', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitles', maxCount: 1 },
]), async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req) ?? `guest_${uuidv4()}`

    const { toolType, trimmedStart, trimmedEnd, burnFontSize, burnPosition, burnBackgroundOpacity } = req.body
    const auth = getAuthFromRequest(req)
    let burnUser = await getUser(userId)
    const now = new Date()
    if (burnUser) await enforceSubscriptionState(burnUser, now)
    const plan = resolveRequestPlan(burnUser, auth?.plan)

    // Guest IP daily cap
    if (userId.startsWith('guest_')) {
      const clientIp = extractClientIp(req)
      if (!await checkAndRecordGuestIpImport(clientIp)) {
        return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
      }
    }

    if (!await checkAndRecordUpload(userId)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }
    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    const isBurnSubtitles = toolType === 'burn-subtitles'
    const isFixSubtitles = toolType === 'fix-subtitles'

    if (!toolType || (!isBurnSubtitles && !isFixSubtitles)) {
      return res.status(400).json({ message: 'toolType must be burn-subtitles or fix-subtitles' })
    }

    // fix-subtitles: subtitle required, video optional
    if (isFixSubtitles) {
      if (!files.subtitles) {
        if (files.video) fs.unlinkSync(files.video[0].path)
        return res.status(400).json({ message: 'Subtitle file is required' })
      }
      const subtitleFileForFix = files.subtitles[0]
      const videoFileForScenes = files.video?.[0]
      const subValidation = await validateSubtitleFile(subtitleFileForFix.path)
      if (subValidation.error) {
        fs.unlinkSync(subtitleFileForFix.path)
        if (videoFileForScenes) fs.unlinkSync(videoFileForScenes.path)
        return res.status(400).json({ message: subValidation.error })
      }
      const fixJob = await addJobToQueue(plan, {
        toolType: 'fix-subtitles',
        filePath: subtitleFileForFix.path,
        filePath2: videoFileForScenes?.path,
        userId,
        plan,
        originalName: subtitleFileForFix.originalname,
        fileSize: subtitleFileForFix.size,
        requestId: (req as any).requestId,
      })
      try {
        await insertJobRecord({
          id: String(fixJob.id),
          userId,
          toolType: 'fix-subtitles',
          planAtRun: plan,
          fileSizeBytes: subtitleFileForFix.size,
        })
      } catch { /* non-blocking */ }
      return res.status(202).json({
        jobId: fixJob.id,
        status: 'queued',
        jobToken: (fixJob.data as any)?.jobToken,
      })
    }

    // burn-subtitles: both files required
    if (!files.video || !files.subtitles) {
      // Cleanup any uploaded files
      if (files.video) fs.unlinkSync(files.video[0].path)
      if (files.subtitles) fs.unlinkSync(files.subtitles[0].path)
      return res.status(400).json({ message: 'Both video and subtitle files are required' })
    }

    const videoFile = files.video[0]
    const subtitleFile = files.subtitles[0]

    const burnLimits = getPlanLimits(plan)
    if (!burnUser) {
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      burnUser = {
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: '',
        plan,
        stripeCustomerId: undefined,
        subscriptionId: undefined,
        paymentMethodId: undefined,
        usageThisMonth: {
          totalMinutes: 0, videoCount: 0, batchCount: 0, languageCount: 0, translatedMinutes: 0, importCount: 0, resetDate,
          importCountToday: 0,
          importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          dailyMinutesToday: 0,
          dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        limits: burnLimits,
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      // Guest users are ephemeral — skip DB write to avoid stripeCustomerId unique constraint issues
      if (!userId.startsWith('guest_')) await saveUser(burnUser)
    } else {
      if (burnUser.plan !== plan) {
        burnUser.plan = plan
        burnUser.limits = getPlanLimits(plan)
        burnUser.updatedAt = now
        await saveUser(burnUser)
      }
      if (resetUserUsageIfNeeded(burnUser, now)) {
        await saveUser(burnUser)
      }
      const dailyImportReset = resetDailyImportIfNeeded(burnUser, now)
      const dailyMinutesReset = resetDailyMinutesIfNeeded(burnUser, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(burnUser.id, now, burnUser.usageThisMonth.importCountTodayResetDate!)
      if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(burnUser.id, now, burnUser.usageThisMonth.dailyMinutesTodayResetDate!)
    }

    const burnDailyCap = getMaxDailyImports(burnUser.plan)
    if (burnDailyCap !== null && (burnUser.usageThisMonth.importCountToday ?? 0) >= burnDailyCap) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
    }

    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as JobData)?.userId === userId)
    const burnPlanConcurrency = getDailySoftCapConcurrency(plan, burnUser?.usageThisMonth?.dailyMinutesToday ?? 0)
    const burnEffectiveConcurrency = applySystemLoadGuard(burnPlanConcurrency, getSystemConcurrencyMultiplier(queueCount))
    if (activeForUser.length >= burnEffectiveConcurrency) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    // Validate video file (plan-based size)
    if (videoFile.size > burnLimits.maxFileSize) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
    }

    const videoTypeError = await validateFileType(videoFile.path, videoFile.originalname)
    if (videoTypeError) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: videoTypeError })
    }

    // Validate subtitle file (content-based; no extension check)
    const subResult = await validateSubtitleFile(subtitleFile.path)
    uploadLog.info({ msg: '[upload] subtitle validation (dual)',
      toolType: 'burn-subtitles',
      originalname: subtitleFile.originalname,
      detectedFormat: subResult.detectedFormat,
      validationError: subResult.error ?? undefined,
    })
    if (subResult.error) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: subResult.error })
    }

    // Server-side minute limit for burn-subtitles (unknown duration: allow job; pre-check uses 0 minutes)
    const probe = await probeVideoDurationResult(videoFile.path)
    let durationSeconds = probe.known ? probe.seconds : 0
    if (!probe.known) {
      uploadLog.info({ msg: 'upload_duration_unknown_allowing_job', toolType: 'burn-subtitles', duration_source: probe.source })
    }
    if (trimmedStart != null && trimmedEnd != null) {
      const start = parseFloat(String(trimmedStart))
      const end = parseFloat(String(trimmedEnd))
      durationSeconds = Math.max(0, end - start)
    }
    const requestedMinutes = Math.ceil(durationSeconds / 60)
    if (burnUser.plan !== 'free') {
      const limitCheck = await enforceUsageLimits(burnUser, requestedMinutes)
      if (!limitCheck.allowed) {
        fs.unlinkSync(videoFile.path)
        fs.unlinkSync(subtitleFile.path)
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
      }
    }

    const job = await addJobToQueue(plan, {
      toolType: 'burn-subtitles',
      filePath: videoFile.path,
      filePath2: subtitleFile.path,
      userId,
      plan,
      originalName: videoFile.originalname,
      originalName2: subtitleFile.originalname,
      fileSize: videoFile.size,
      trimmedStart: trimmedStart != null ? parseFloat(String(trimmedStart)) : undefined,
      trimmedEnd: trimmedEnd != null ? parseFloat(String(trimmedEnd)) : undefined,
      options:
        burnFontSize || burnPosition || burnBackgroundOpacity
          ? {
              burnFontSize: burnFontSize || undefined,
              burnPosition: burnPosition || undefined,
              burnBackgroundOpacity: burnBackgroundOpacity || undefined,
            }
          : undefined,
      requestId: (req as RequestWithId).requestId,
    })

    try {
      await insertJobRecord({
        id: String(job.id),
        userId,
        toolType: 'burn-subtitles',
        planAtRun: plan,
        fileSizeBytes: videoFile.size,
      })
    } catch {
      // non-blocking
    }

    res.status(202).json({
      jobId: job.id,
      status: 'queued',
      jobToken: (job.data as JobData)?.jobToken,
    })
  } catch (error: any) {
    uploadLog.error({ msg: 'Upload error', error: String(error) })
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    if (files.video) {
      try {
        fs.unlinkSync(files.video[0].path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (files.subtitles) {
      try {
        fs.unlinkSync(files.subtitles[0].path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({ message: error.message || 'Upload failed' })
  }
})

// Timeout for init (Redis/DB can hang; respond 503 instead of leaving client pending).
const INIT_TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// ─── Chunked upload (init + chunk + complete) for large files ─────────────────
router.get('/init', (_req: Request, res: Response) => {
  res.status(405).json({ message: 'Method Not Allowed. Use POST /api/upload/init.' })
})
router.post('/init', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req) ?? `guest_${uuidv4()}`
    const auth = getAuthFromRequest(req)
    const rateLimitKey = userId
    let user: User | null = null
    try {
      user = (await withTimeout(getUser(userId), INIT_TIMEOUT_MS, 'getUser')) ?? null
    } catch (e) {
      const msg = (e as Error)?.message ?? ''
      const isTimeout = msg.includes('timed out')
      if (isTimeout) {
        uploadLog.error({ msg: '[upload/init] getUser timeout' })
        return res.status(503).json({ message: 'Service temporarily busy. Please retry.' })
      }
      uploadLog.warn({ msg: '[upload/init] getUser failed', error: msg })
    }
    const now = new Date()
    if (user) await enforceSubscriptionState(user, now)
    const plan = resolveRequestPlan(user, auth?.plan)

    if (user?.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
    }

    // Guest IP daily cap
    if (userId.startsWith('guest_')) {
      const clientIp = extractClientIp(req)
      if (!await checkAndRecordGuestIpImport(clientIp)) {
        return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
      }
    }

    if (!await checkAndRecordUpload(rateLimitKey)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }

    let queueCount: number
    try {
      queueCount = await withTimeout(getTotalQueueCount(), INIT_TIMEOUT_MS, 'getTotalQueueCount')
    } catch (e) {
      const msg = (e as Error)?.message ?? ''
      const isTimeout = msg.includes('timed out')
      if (isTimeout) {
        uploadLog.error({ msg: '[upload/init] queue count timeout (Redis slow or unreachable)' })
        res.setHeader('Retry-After', '30')
        return res.status(503).json({ message: 'Queue temporarily unavailable. Please retry in a moment.' })
      }
      uploadLog.error({ msg: '[upload/init] queue count failed', error: msg })
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'Queue unavailable. Please retry in a moment.' })
    }
    if (isQueueAtHardLimit(queueCount)) {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }
    if (isQueueAtSoftLimit(queueCount) && plan === 'free') {
      res.setHeader('Retry-After', '60')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Request body must be JSON with filename, totalChunks, toolType, totalSize' })
    }
    const { filename, totalSize, totalChunks, toolType, ...rest } = body as {
      filename: string
      totalSize?: number
      totalChunks: number
      toolType: string
      [k: string]: unknown
    }
    if (!filename || !totalChunks || !toolType) {
      return res.status(400).json({ message: 'filename, totalChunks, and toolType are required' })
    }
    if (typeof totalSize !== 'number' || totalSize < 0) {
      return res.status(400).json({ message: 'totalSize is required and must be a non-negative number' })
    }
    if (totalChunks > MAX_CHUNKS || totalChunks < 1) {
      return res.status(400).json({ message: `totalChunks must be between 1 and ${MAX_CHUNKS}` })
    }

    const limits = getPlanLimits(user?.plan || plan)
    if (totalSize > limits.maxFileSize) {
      return res.status(400).json({ message: 'Total size exceeds plan limit. Upgrade for larger files.' })
    }

    const uploadId = uuidv4()
    const dir = path.join(chunksDir, uploadId)
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch (e) {
      uploadLog.error({ msg: '[upload/init] mkdir failed', dir, error: (e as Error)?.message })
      return res.status(500).json({ message: 'Upload storage unavailable. Please retry.' })
    }

    chunkUploadMeta.set(uploadId, {
      userId,
      plan,
      filename,
      totalChunks,
      totalSize,
      toolType,
      options: rest || {},
      createdAt: Date.now(),
    })

    uploadLog.info({
      msg: 'upload_start',
      env: process.env.NODE_ENV,
      uploadId,
      totalChunks,
      totalSizeBytes: totalSize,
    })

    return res.json({ uploadId })
  } catch (error: any) {
    const msg = error?.message || String(error)
    const stack = error?.stack
    uploadLog.error({ msg: '[upload/init] 500', error: msg, stack: stack || undefined })
    return res.status(500).json({ message: msg || 'Upload init failed' })
  }
})

/** Chunk handler: req.body is raw Buffer. Mount in index with express.raw() for POST /api/upload/chunk */
export async function handleUploadChunk(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.headers['x-upload-id'] as string
    const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10)
    if (!uploadId || Number.isNaN(chunkIndex) || chunkIndex < 0) {
      res.status(400).json({ message: 'x-upload-id and x-chunk-index required' })
      return
    }

    const meta = chunkUploadMeta.get(uploadId)
    uploadLog.info({
      msg: 'chunk_upload_state',
      uploadId,
      metaExists: !!meta,
    })
    if (!meta) {
      res.status(404).json({ message: 'Upload session not found or expired' })
      return
    }

    const body = req.body as Buffer
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ message: 'Chunk body required (raw binary)' })
      return
    }

    const chunkPath = path.join(chunksDir, uploadId, `chunk_${chunkIndex}`)
    await fs.promises.writeFile(chunkPath, body)
    // Verify chunk was written so we never confirm a chunk the server doesn't have
    const stat = await fs.promises.stat(chunkPath).catch(() => null)
    if (!stat || stat.size !== body.length) {
      try { await fs.promises.unlink(chunkPath) } catch { /* ignore */ }
      uploadLog.error({ msg: '[upload/chunk] write verify failed', uploadId, chunkIndex, expected: body.length, actual: stat?.size })
      res.status(500).json({ message: 'Chunk write failed. Please retry.' })
      return
    }
    res.json({ ok: true })
  } catch (error: any) {
    uploadLog.error({ msg: '[upload/chunk] 500', error: error?.message || String(error), stack: error?.stack })
    res.status(500).json({ message: error.message || 'Chunk upload failed' })
  }
}

router.post('/complete', async (req: Request, res: Response) => {
  const tStart = Date.now()
  let uploadId: string | undefined
  try {
    ;({ uploadId } = req.body as { uploadId?: string })
    if (!uploadId) {
      return res.status(400).json({ message: 'uploadId required' })
    }

    const meta = chunkUploadMeta.get(uploadId)
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found or expired' })
    }
    if (completingUploads.has(uploadId)) {
      return res.status(409).json({ message: 'Upload completion already in progress for this session' })
    }
    completingUploads.add(uploadId)
    if (meta.userId && !meta.userId.startsWith('guest_')) {
      const user = await getUser(meta.userId)
      if (user) {
        await enforceSubscriptionState(user)
        meta.plan = user.plan
      }
    }
    // Do NOT delete meta here — only after /complete finishes successfully (in finish handler)

    const dir = path.join(chunksDir, uploadId)
    if (!fs.existsSync(dir)) {
      return res.status(400).json({ message: 'No chunks found' })
    }

    // Pre-flight disk check: require at least 3× the declared file size in free space.
    // This covers: assembled file + extracted audio + audio chunks without running out mid-write.
    // 3× is conservative but safe; 20GB files need ~60GB headroom which is expected on Agency plans.
    try {
      const diskStat = fs.statfsSync(tempDir)
      const freeBytesNow = diskStat.bfree * diskStat.bsize
      const needed = (meta.totalSize ?? 0) * 3
      if (needed > 0 && freeBytesNow < needed) {
        completingUploads.delete(uploadId)
        uploadLog.warn({ msg: '[upload/complete] disk pre-flight failed', freeMb: Math.round(freeBytesNow / 1024 / 1024), neededMb: Math.round(needed / 1024 / 1024) })
        return res.status(503).json({ message: 'Server storage is temporarily full. Please try again in a few minutes.' })
      }
    } catch {
      // statfsSync not available on all platforms — skip the check rather than blocking the upload
    }

    const totalChunks = Math.min(meta.totalChunks, MAX_CHUNKS)
    const totalSizeBytes = meta.totalSize
    const safeFilename = sanitizeFilename(meta.filename)
    const outPath = path.join(tempDir, `${uuidv4()}-${safeFilename}`)
    try {
      assertPathWithinDir(tempDir, path.resolve(outPath))
    } catch {
      return res.status(400).json({ message: 'Invalid filename' })
    }
    const out = fs.createWriteStream(outPath, { flags: 'a' })
    let totalSizeSoFar = 0
    const maxFileSize = getPlanLimits(meta.plan).maxFileSize
    const declaredTotal = meta.totalSize

    async function doEnqueueJob(): Promise<{ job: Awaited<ReturnType<typeof addJobToQueue>>; fileSize: number }> {
      if (!meta) throw new Error('Upload session not found')
      let user = meta.userId ? await getUser(meta.userId) : null
      const now = new Date()
      if (user) {
        await enforceSubscriptionState(user, now)
        meta.plan = user.plan
      }
      if (!user && meta.userId) {
        const limits = getPlanLimits(meta.plan)
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        user = {
          id: meta.userId!,
          email: `${meta.userId}@example.com`,
          passwordHash: '',
          plan: meta.plan,
          stripeCustomerId: undefined,
          subscriptionId: undefined,
          paymentMethodId: undefined,
          usageThisMonth: {
            totalMinutes: 0,
            videoCount: 0,
            batchCount: 0,
            languageCount: 0,
            translatedMinutes: 0,
            importCount: 0,
            resetDate,
            importCountToday: 0,
            importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            dailyMinutesToday: 0,
            dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
          limits,
          overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
          createdAt: now,
          updatedAt: now,
        }
        // Guest users are ephemeral — skip DB write to avoid stripeCustomerId unique constraint issues
        if (!meta.userId!.startsWith('guest_')) await saveUser(user)
      }
      if (user) {
        const dailyImportReset = resetDailyImportIfNeeded(user, now)
        const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
        if (dailyImportReset && !meta.userId!.startsWith('guest_')) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
        if (dailyMinutesReset && !meta.userId!.startsWith('guest_')) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
        const chunkDailyCap = getMaxDailyImports(user.plan)
        if (chunkDailyCap !== null && (user.usageThisMonth.importCountToday ?? 0) >= chunkDailyCap) {
          throw Object.assign(new Error("You've used today's 3 free imports. They reset at midnight — or upgrade to Pro."), { statusCode: 403 })
        }
      }
      const fileSize = fs.statSync(outPath).size
      const planLimit = getPlanLimits(meta.plan).maxFileSize
      if (fileSize > planLimit) {
        fs.unlinkSync(outPath)
        throw Object.assign(new Error('File exceeds plan limit. Upgrade for larger files.'), { statusCode: 400 })
      }
      const opts = meta.options || {}
      const trimmedStart = opts.trimmedStart != null ? (typeof opts.trimmedStart === 'number' ? opts.trimmedStart : parseFloat(String(opts.trimmedStart))) : undefined
      const trimmedEnd = opts.trimmedEnd != null ? (typeof opts.trimmedEnd === 'number' ? opts.trimmedEnd : parseFloat(String(opts.trimmedEnd))) : undefined
      const { trimmedStart: _s, trimmedEnd: _e, uploadMode: _um, originalFileName: _ofn, originalFileSize: _ofs, ...restOptions } = opts
      const isChunkedAudioOnly =
        (meta.toolType === 'video-to-transcript' || meta.toolType === 'video-to-subtitles') &&
        opts.uploadMode === 'audio-only'
      const job = await addJobToQueue(meta.plan, {
        toolType: meta.toolType,
        filePath: outPath,
        userId: meta.userId!,
        plan: meta.plan,
        originalName: isChunkedAudioOnly && opts.originalFileName ? String(opts.originalFileName) : safeFilename,
        fileSize,
        trimmedStart,
        trimmedEnd,
        options: Object.keys(restOptions).length > 0 ? restOptions : undefined,
        inputType: isChunkedAudioOnly ? 'audio' : undefined,
        requestId: (req as RequestWithId).requestId,
      })
      try {
        await insertJobRecord({
          id: String(job.id),
          userId: meta.userId!,
          toolType: isChunkedAudioOnly ? 'voice-to-transcript' : meta.toolType,
          planAtRun: meta.plan,
          fileSizeBytes: fileSize,
        })
      } catch {
        // non-blocking
      }
      return { job, fileSize }
    }

    const timings: {
      tStart: number
      tValidationStart: number
      tValidationEnd: number
      tAssemblyStart: number
      tAssemblyEnd: number
      tOutEnd: number
      tFinishEnter: number
      tBeforeEnqueue: number
      tAfterEnqueue: number
      tBeforeResponse: number
    } = {
      tStart,
      tValidationStart: 0,
      tValidationEnd: 0,
      tAssemblyStart: 0,
      tAssemblyEnd: 0,
      tOutEnd: 0,
      tFinishEnter: 0,
      tBeforeEnqueue: 0,
      tAfterEnqueue: 0,
      tBeforeResponse: 0,
    }

    timings.tValidationStart = Date.now()
    if (STREAM_UPLOAD_ASSEMBLY) {
      // Phase 1: streaming reassembly — validate then stream chunks without loading into memory
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(dir, `chunk_${i}`)
        if (!fs.existsSync(chunkPath)) {
          out.destroy()
          try { fs.unlinkSync(outPath) } catch { /* ignore */ }
          return res.status(400).json({ message: `Missing chunk ${i}` })
        }
        const stat = fs.statSync(chunkPath)
        totalSizeSoFar += stat.size
        if (totalSizeSoFar > maxFileSize) {
          out.destroy()
          try { fs.unlinkSync(outPath) } catch { /* ignore */ }
          return res.status(400).json({ message: 'Total size exceeds plan limit. Upgrade for larger files.' })
        }
        if (declaredTotal != null && totalSizeSoFar > declaredTotal) {
          out.destroy()
          try { fs.unlinkSync(outPath) } catch { /* ignore */ }
          return res.status(400).json({ message: 'Chunk total exceeds declared totalSize.' })
        }
      }
    timings.tValidationEnd = Date.now()
    timings.tAssemblyStart = Date.now()
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(dir, `chunk_${i}`)
          await new Promise<void>((resolve, reject) => {
            const src = fs.createReadStream(chunkPath)
            src.on('error', reject)
            src.on('end', resolve)
            src.pipe(out, { end: false })
          })
          await fs.promises.unlink(chunkPath)
        }
      } catch (err: any) {
        out.destroy()
        try { fs.unlinkSync(outPath) } catch { /* ignore */ }
        uploadLog.error({ msg: '[upload/complete] streaming reassembly failed', error: err?.message || String(err), stack: err?.stack })
        return res.status(500).json({ message: err?.message || 'Upload complete failed' })
      }
    timings.tAssemblyEnd = Date.now()
    } else {
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(dir, `chunk_${i}`)
        if (!fs.existsSync(chunkPath)) {
          out.destroy()
          try { fs.unlinkSync(outPath) } catch { /* ignore */ }
          return res.status(400).json({ message: `Missing chunk ${i}` })
        }
        const stat = fs.statSync(chunkPath)
        totalSizeSoFar += stat.size
        if (totalSizeSoFar > maxFileSize) {
          out.destroy()
          try { fs.unlinkSync(outPath) } catch { /* ignore */ }
          return res.status(400).json({ message: 'Total size exceeds plan limit. Upgrade for larger files.' })
        }
        if (declaredTotal != null && totalSizeSoFar > declaredTotal) {
          out.destroy()
          try { fs.unlinkSync(outPath) } catch { /* ignore */ }
          return res.status(400).json({ message: 'Chunk total exceeds declared totalSize.' })
        }
        const buf = fs.readFileSync(chunkPath)
        out.write(buf)
        fs.unlinkSync(chunkPath)
      }
    timings.tValidationEnd = Date.now()
    timings.tAssemblyStart = timings.tValidationStart
    timings.tAssemblyEnd = timings.tValidationEnd
    }

    const onError = (err: any) => {
      completingUploads.delete(uploadId!)
      if (res.headersSent) return
      try { fs.unlinkSync(outPath) } catch { /* ignore */ }
      uploadLog.error({ msg: '[upload/complete] 500', error: err?.message || String(err), stack: err?.stack })
      res.status(500).json({ message: err?.message || 'Upload complete failed' })
    }
    out.once('error', onError)
    out.once('finish', async () => {
      completingUploads.delete(uploadId!)
      timings.tFinishEnter = Date.now()
      out.removeListener('error', onError)
      if (res.headersSent) return
      try {
        try { fs.rmdirSync(dir) } catch { /* ignore if not empty or missing */ }
        timings.tBeforeEnqueue = Date.now()
        const { job, fileSize } = await doEnqueueJob()
        timings.tAfterEnqueue = Date.now()
        timings.tBeforeResponse = Date.now()
        chunkUploadMeta.delete(uploadId!)
        uploadLog.info({
          msg: 'upload_complete_timing',
          uploadId,
          totalChunks,
          totalSizeBytes,
          validation_ms: timings.tValidationEnd - timings.tValidationStart,
          assembly_ms: timings.tAssemblyEnd - timings.tAssemblyStart,
          stream_finish_wait_ms: timings.tFinishEnter - timings.tOutEnd,
          enqueue_ms: timings.tAfterEnqueue - timings.tBeforeEnqueue,
          total_complete_route_ms: timings.tBeforeResponse - timings.tStart,
        })
        try {
          trackJobCreated({
            job_id: String(job.id),
            user_id: meta.userId ?? undefined,
            tool_type: meta.toolType,
            file_size_bytes: fileSize,
            plan: meta.plan,
          })
        } catch {
          // non-blocking
        }
        return res.status(202).json({
          jobId: job.id,
          status: 'queued',
          jobToken: (job.data as JobData)?.jobToken,
        })
      } catch (error: any) {
        if (error?.statusCode === 400) {
          return res.status(400).json({ message: error?.message || 'File exceeds plan limit. Upgrade for larger files.' })
        }
        onError(error)
      }
    })
    timings.tOutEnd = Date.now()
    out.end()
  } catch (error: any) {
    if (uploadId) completingUploads.delete(uploadId)
    uploadLog.error({ msg: '[upload/complete] 500', error: error?.message || String(error), stack: error?.stack })
    return res.status(500).json({ message: error.message || 'Upload complete failed' })
  }
})

// ─── YouTube ingestion endpoint ──────────────────────────────────────────────
// POST /api/upload/youtube
//
// Validates the YouTube URL, fetches metadata (non-blocking — ~1-2 s network call),
// enforces plan duration + usage limits, applies YouTube-specific rate limiting
// (separate from the per-minute file upload limit), then enqueues a
// 'youtube-to-transcript' job.  The worker fetches and encodes the audio itself
// so this endpoint never downloads any media, keeping the API thread free.
//
// Response is identical to the file upload endpoint: { jobId, status, jobToken }
// so the client can use the exact same polling flow.
router.post('/youtube', async (req: Request, res: Response) => {
  const ytStartMs = Date.now()
  try {
    const userId = getEffectiveUserId(req) ?? `guest_${uuidv4()}`

    const { youtubeUrl, toolType: rawToolType, webhookUrl, ...options } = req.body

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return res.status(400).json({ message: 'youtubeUrl is required.' })
    }

    if (!isValidYoutubeUrl(youtubeUrl)) {
      return res.status(400).json({ message: 'Invalid YouTube URL. Paste a youtube.com or youtu.be link.' })
    }

    const auth = getAuthFromRequest(req)
    let user = await getUser(userId)
    const now = new Date()
    if (user) await enforceSubscriptionState(user, now)
    const plan = resolveRequestPlan(user, auth?.plan)

    // ── Queue capacity ────────────────────────────────────────────────────────
    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }
    if (isQueueAtSoftLimit(queueCount) && plan === 'free') {
      res.setHeader('Retry-After', '60')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    // ── YouTube-specific rate limit (hourly, separate from file upload limit) ─
    const ytRl = await checkAndRecordYoutubeJob(userId, plan)
    if (!ytRl.allowed) {
      const retryAfterSec = Math.ceil(ytRl.retryAfterMs / 1000)
      res.setHeader('Retry-After', String(retryAfterSec))
      return res.status(429).json({
        message: `YouTube limit reached. You can submit ${
          plan === 'free' ? '3' : plan === 'basic' ? '6' : plan === 'agency' ? '20' : '10'
        } YouTube jobs per hour on the ${plan} plan. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      })
    }

    // ── Fetch metadata (title, duration, thumbnail) ───────────────────────────
    // This is the only network call in the API layer; all media fetching happens in the worker.
    let ytMeta: { title: string; durationSec: number; thumbnailUrl: string | undefined; videoId: string; defaultLanguage?: string }
    try {
      ytMeta = await getYoutubeMetadata(youtubeUrl)
    } catch (err: any) {
      uploadLog.warn({ msg: '[youtube] metadata fetch failed', error: err.message, youtubeUrl: youtubeUrl.slice(0, 80) })
      // Surface live/unavailable messages directly; mask low-level errors
      const msg: string = err.message || ''
      const userMessage = (
        msg.includes('Live stream') || msg.includes('live stream') ||
        msg.includes('unavailable') || msg.includes('private') ||
        msg.includes('age-restricted') || msg.includes('duration')
      )
        ? msg
        : 'Could not access that YouTube video. It may be private, age-restricted, or unavailable.'
      return res.status(400).json({ message: userMessage })
    }

    // ── Ensure/create user record ─────────────────────────────────────────────
    const limits = user?.limits ?? getPlanLimits(plan)
    if (!user) {
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      user = {
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: '',
        plan,
        stripeCustomerId: undefined,
        subscriptionId: undefined,
        paymentMethodId: undefined,
        usageThisMonth: {
          totalMinutes: 0,
          videoCount: 0,
          batchCount: 0,
          languageCount: 0,
          translatedMinutes: 0,
          importCount: 0,
          resetDate,
          importCountToday: 0,
          importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          dailyMinutesToday: 0,
          dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        limits,
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      // Guest users are ephemeral — skip DB write to avoid stripeCustomerId unique constraint issues
      if (!userId.startsWith('guest_')) await saveUser(user)
    } else {
      if (user.plan !== plan) {
        user.plan = plan
        user.limits = getPlanLimits(plan)
        user.updatedAt = now
        await saveUser(user)
      }
      if (resetUserUsageIfNeeded(user, now)) {
        await saveUser(user)
      }
      const dailyImportReset = resetDailyImportIfNeeded(user, now)
      const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
      if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
    }

    // ── Import count check (free plan: 3 imports/day, resets at midnight UTC) ─
    const ytDailyCap = getMaxDailyImports(user.plan)
    if (ytDailyCap !== null && (user.usageThisMonth.importCountToday ?? 0) >= ytDailyCap) {
      return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
    }

    // ── Concurrent job cap ────────────────────────────────────────────────────
    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as JobData)?.userId === userId)
    const ytPlanConcurrency = getDailySoftCapConcurrency(plan, user?.usageThisMonth?.dailyMinutesToday ?? 0)
    const ytEffectiveConcurrency = applySystemLoadGuard(ytPlanConcurrency, getSystemConcurrencyMultiplier(queueCount))
    if (activeForUser.length >= ytEffectiveConcurrency) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    // ── Duration limit (plan-based) ───────────────────────────────────────────
    const maxDurationSec = limits.maxVideoDuration * 60
    if (ytMeta.durationSec > maxDurationSec) {
      return res.status(400).json({
        message: `This video is ${Math.round(ytMeta.durationSec / 60)} minutes. Your ${plan} plan supports videos up to ${limits.maxVideoDuration} minutes. Upgrade for longer videos.`,
      })
    }

    // ── Minute usage limits (paid plans) ─────────────────────────────────────
    if (user.plan !== 'free') {
      const requestedMinutes = Math.ceil(ytMeta.durationSec / 60)
      const limitCheck = await enforceUsageLimits(user, requestedMinutes)
      if (!limitCheck.allowed) {
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
      }
    }

    // ── Parse transcript options ──────────────────────────────────────────────
    let exportFormats: ('txt' | 'json' | 'docx' | 'pdf')[] | undefined
    if (options.exportFormats) {
      try {
        const arr = typeof options.exportFormats === 'string'
          ? JSON.parse(options.exportFormats)
          : options.exportFormats
        if (Array.isArray(arr)) {
          exportFormats = arr.filter((f: string) => ['txt', 'json', 'docx', 'pdf'].includes(f))
        }
      } catch { /* ignore */ }
    }

    const jobOptions = {
      language: normalizeLanguageCode(options.language),
      includeSummary: options.includeSummary === true || options.includeSummary === 'true',
      includeChapters: options.includeChapters === true || options.includeChapters === 'true',
      speakerDiarization: options.speakerDiarization === true || options.speakerDiarization === 'true',
      numSpeakers: options.numSpeakers ? Number(options.numSpeakers) : undefined,
      diarizationLanguage: typeof options.diarizationLanguage === 'string' && options.diarizationLanguage.trim() ? options.diarizationLanguage.trim() : undefined,
      glossary: typeof options.glossary === 'string' && options.glossary.trim() ? options.glossary.trim() : undefined,
      exportFormats,
    }

    // ── Enqueue ───────────────────────────────────────────────────────────────
    const job = await addJobToQueue(plan, {
      toolType: 'youtube-to-transcript',
      userId,
      plan,
      youtubeUrl: normalizeYoutubeUrl(youtubeUrl.trim()),
      youtubeTitle: ytMeta.title,
      youtubeThumbnailUrl: ytMeta.thumbnailUrl,
      youtubeDurationSec: ytMeta.durationSec,
      youtubeDefaultLanguage: ytMeta.defaultLanguage,
      originalName: ytMeta.title.replace(/[^\w\s.\-]/g, '_').trim() + '.wav',
      options: jobOptions,
      webhookUrl: typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined,
      requestId: (req as RequestWithId).requestId,
    })

    uploadLog.info({
      msg: 'youtube_job_enqueued',
      jobId: job.id,
      durationMs: Date.now() - ytStartMs,
      ytDurationSec: ytMeta.durationSec,
    })

    try {
      trackJobCreated({
        job_id: String(job.id),
        user_id: userId,
        tool_type: 'youtube-to-transcript',
        file_size_bytes: 0,
        plan,
      })
    } catch { /* non-blocking */ }

    try {
      await insertJobRecord({
        id: String(job.id),
        userId,
        toolType: 'youtube-to-transcript',
        planAtRun: plan,
        fileSizeBytes: 0,
      })
    } catch { /* non-blocking */ }

    return res.status(202).json({
      jobId: job.id,
      status: 'queued',
      jobToken: (job.data as JobData)?.jobToken,
      // Pass back metadata so the client can show the thumbnail/title immediately
      youtubeTitle: ytMeta.title,
      youtubeThumbnailUrl: ytMeta.thumbnailUrl,
      youtubeDurationSec: ytMeta.durationSec,
    })
  } catch (error: any) {
    uploadLog.error({ msg: '[youtube] endpoint error', error: String(error) })
    return res.status(500).json({ message: error.message || 'Failed to process YouTube URL.' })
  }
})

export default router
