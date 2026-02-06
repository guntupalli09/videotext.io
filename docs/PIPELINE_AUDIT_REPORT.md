# Upload → Processing Pipeline Audit Report

End-to-end audit of the upload and transcription pipeline, with evidence and conclusions. Timing instrumentation has been added to measure upload (network) and processing (file received → transcription finished).

---

## 1. Frontend upload flow

### 1.1 File selection and upload components

| What | Where | Evidence |
|------|--------|----------|
| File selection | `client/src/components/FileUploadZone.tsx` | `useDropzone({ onDrop, accept, maxSize })`; `onDrop` passes the selected `File` to `onFileSelect?.(file)` / `onFilesSelect?.([file])`. No reading or transformation of file content. |
| Upload API (with progress) | `client/src/lib/api.ts` | `uploadFileWithProgress(file, options, progressOptions)` — used by Video → Transcript and Video → Subtitles. For files &gt; 15 MB uses `uploadFileChunked()`; else XHR with `formData` and `xhr.upload.onprogress`. |
| Upload API (single POST) | `client/src/lib/api.ts` | `uploadFile(file, options)` — `buildUploadFormData(file, options)` then `api('/api/upload', { method: 'POST', body: formData })`. Used by Compress, Burn (dual), Translate, Fix. |
| Chunked upload | `client/src/lib/api.ts` | `uploadFileChunked()`: `formData.append('file', file)` is not used; instead `file.slice(start, end)` → `body: blob` sent to `POST /api/upload/chunk`. Raw byte ranges of the original file. |

**Relevant snippets:**

```96:97:client/src/lib/api.ts
  formData.append('file', file)
  formData.append('toolType', options.toolType)
```

```324:339:client/src/lib/api.ts
    const blob = file.slice(start, end)
    // ...
    const res = await fetch(`${API_ORIGIN}/api/upload/chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', ... },
      body: blob,
    })
```

### 1.2 Client-side processing

| Question | Answer | Evidence |
|----------|--------|----------|
| Is the raw video uploaded? | **Yes.** The same `File` (or its slices) is sent. Size = `file.size`. | No code path compresses, transcodes, or extracts audio in the client. |
| Any client-side compression/transcoding? | **No.** | No ffmpeg.wasm, MediaRecorder, or transcoding in the repo. |
| Preflight only | `client/src/lib/uploadPreflight.ts` | `checkVideoPreflight(file, limits)` uses `<video preload="metadata">` and `getVideoDurationSeconds(file)` to validate duration/size. Does not modify the file. |

**Conclusion:** The browser uploads the **raw video file** (or raw chunks). No client-side compression or audio extraction. File size sent = `file.size`.

### 1.3 Frontend timing (instrumentation added)

- **Metric:** Time from upload start to upload complete (network only).
- **Where:** `client/src/lib/api.ts`
  - **Chunked:** `uploadStartMs = Date.now()` at start of `uploadFileChunked()`; after `/api/upload/complete` returns with `jobId`, log `[UPLOAD_TIMING] { file_size_bytes, upload_duration_ms, tool_type, mode: 'chunked' }`.
  - **XHR:** `uploadStartMs = Date.now()` immediately before `xhr.send(formData)`; in `load` handler when response has `jobId`, log `[UPLOAD_TIMING] { file_size_bytes, upload_duration_ms, tool_type, mode: 'xhr' }`.
  - **Fetch (uploadFile):** `uploadStartMs = Date.now()` before `api('/api/upload', ...)`; after success, log `[UPLOAD_TIMING] { file_size_bytes, upload_duration_ms, tool_type, mode: 'fetch' }`.

Logs go to the browser console. Use them to compare upload time vs file size and tool type.

---

## 2. Backend ingestion and transcription

### 2.1 API endpoint receiving uploads

| Endpoint | Where | Evidence |
|----------|--------|----------|
| Single file | `server/src/routes/upload.ts` | `router.post('/', upload.single('file'), async (req, res) => { ... })`. Multer writes to temp dir; then `addJobToQueue(plan, { toolType, filePath: req.file.path, ... })`. |
| Chunked | Same file | `POST /api/upload/init` → `POST /api/upload/chunk` (raw body) → `POST /api/upload/complete` assembles chunks into one file and calls `addJobToQueue(..., filePath: outPath)`. |
| Dual (burn) | Same file | `router.post('/dual', upload.fields([{ name: 'video' }, { name: 'subtitles' }]), ...)`; enqueues with `filePath` and `filePath2`. |

### 2.2 Audio extraction

| Question | Answer | Evidence |
|----------|--------|----------|
| Where is audio extracted? | **Server only.** | `server/src/services/ffmpeg.ts`: `extractAudio(videoPath, outputPath)` — FFmpeg `-vn`, `libmp3lame`, 16 kHz mono. |
| Who uses it? | Transcription and diarization. | `server/src/services/transcription.ts`: `import { extractAudio, ... } from './ffmpeg'`; short path: `await extractAudio(videoPath, audioPath)` then Whisper on the audio file; long path: `transcribeVideoParallel()` does `extractAudio` then `splitAudioIntoChunks` then transcribes chunks. `server/src/services/diarization.ts` also imports `extractAudio`. |

**Relevant snippets:**

```71:79:server/src/services/ffmpeg.ts
export function extractAudio(videoPath, outputPath, ...) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath)
      .outputOptions(['-threads', FFMPEG_THREADS, '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5'])
      ...
```

```110:114:server/src/services/transcription.ts
  if (durationSec < PARALLEL_THRESHOLD_SEC) {
    const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`)
    try {
      await extractAudio(videoPath, audioPath)
      const audioFile = fs.createReadStream(audioPath)
```

### 2.3 Where transcription is triggered and file type used

| Tool | Where | Input to transcription | File type used by Whisper |
|------|--------|------------------------|----------------------------|
| video-to-transcript | `server/src/workers/videoProcessor.ts` case `'video-to-transcript'` | `videoPath = data.filePath` (video on disk). Calls `transcribeVideoVerbose(videoPath, ...)` or `transcribeVideo(videoPath, 'text', ...)` or `transcribeWithDiarization(videoPath, ...)`. | **Video** path is passed in; `transcription.ts` calls `extractAudio(videoPath, audioPath)` and sends the resulting **audio** file to Whisper. |
| video-to-subtitles | Same file, case `'video-to-subtitles'` | `videoPath = data.filePath`. Single lang: `transcribeVideo(videoPath, format, ...)`. Multi-lang: `generateMultiLanguageSubtitles(videoPath, ...)` (which uses transcription internally). | Same: video path → extract audio server-side → Whisper gets audio. |
| batch-video-to-subtitles | Same file, case `'batch-video-to-subtitles'` | `videoPath = data.filePath`; `transcribeVideo(videoPath, format, ...)`. | Same. |

**Conclusion:** Transcription is triggered in the worker for `video-to-transcript` and `video-to-subtitles` (and batch). The worker always passes a **video** path. The transcription service converts video → audio (via `extractAudio`) and sends **audio** to Whisper.

### 2.4 Backend timing (instrumentation added)

- **Metric:** Time from file received (worker has file and starts transcription work) to transcription finished (processing only).
- **Where:** `server/src/workers/videoProcessor.ts`
  - **video-to-transcript:** `processingStartMs = Date.now()` before the transcription branch (wantDiarization / needVerbose / else); after `fullText` is set (all paths), log `[PROCESSING_TIMING] { job_id, tool_type: 'video-to-transcript', file_received_to_transcription_finished_ms, file_size_bytes }`.
  - **video-to-subtitles (single):** `processingStartMs` before `transcribeVideo(...)`; after it returns, log same shape with `tool_type: 'video-to-subtitles'`.
  - **video-to-subtitles (multi-language):** `processingStartMs` before `generateMultiLanguageSubtitles(...)`; after it returns, log with `multi_language: true`.
  - **batch-video-to-subtitles:** `processingStartMs` before `transcribeVideo(...)`; after it returns, log with `tool_type: 'batch-video-to-subtitles'` and `batch_id`.

Logs go to server stdout. Use them to see processing time vs file size and queue wait.

---

## 3. Summary table

| Question | Answer |
|----------|--------|
| Is the browser uploading raw video? | **Yes.** Same file (or raw chunks). Size = `file.size`. |
| Is any client-side compression occurring? | **No.** |
| Where does audio extraction happen? | **Server only.** `server/src/services/ffmpeg.ts` → `extractAudio()`; used by `transcription.ts` and `diarization.ts`. |
| Actual upload time vs processing time | **Now measurable.** Frontend: `[UPLOAD_TIMING]` in browser console. Backend: `[PROCESSING_TIMING]` in server logs. Run a job and compare. |
| Bottleneck summary | For large files, upload (network) is often dominant. After upload, server-side extraction + Whisper dominate. No client-side compression, so upload size is full video. |

---

## 4. Evidence file reference

| Conclusion | File(s) | Relevant symbols / lines |
|------------|---------|--------------------------|
| Raw file in FormData | `client/src/lib/api.ts` | `buildUploadFormData`, `formData.append('file', file)` |
| Raw chunks in chunked upload | `client/src/lib/api.ts` | `uploadFileChunked`, `file.slice(start, end)`, `body: blob` |
| No client transcoding | Entire `client/` | No ffmpeg, MediaRecorder, or encode APIs |
| Preflight is metadata-only | `client/src/lib/uploadPreflight.ts` | `getVideoDurationSeconds`, `checkVideoPreflight` |
| Upload route | `server/src/routes/upload.ts` | `router.post('/', upload.single('file'))`, `addJobToQueue` |
| Audio extraction | `server/src/services/ffmpeg.ts` | `extractAudio(videoPath, outputPath)` |
| Transcription uses video path, extracts audio | `server/src/services/transcription.ts` | `extractAudio(videoPath, audioPath)`, then Whisper on audio |
| Worker triggers transcription with video path | `server/src/workers/videoProcessor.ts` | `video-to-transcript`, `video-to-subtitles`, `transcribeVideo(videoPath, ...)` |
| Frontend timing | `client/src/lib/api.ts` | `uploadStartMs`, `[UPLOAD_TIMING]` logs |
| Backend timing | `server/src/workers/videoProcessor.ts` | `processingStartMs`, `[PROCESSING_TIMING]` logs |
