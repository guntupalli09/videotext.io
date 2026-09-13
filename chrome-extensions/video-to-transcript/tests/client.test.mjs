/**
 * Behavioural tests for the compiled extension modules in dist/.
 *
 * Testing the built output rather than the TypeScript sources means these cover
 * exactly the code Chrome runs. `fetch` and `chrome.storage` are stubbed so the
 * API client, job-status handling, transcript handling, upload validation and
 * quota/paywall classification can be exercised without a browser or a network.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')

if (!existsSync(DIST)) {
  test('extension bundle', { skip: 'run `npm run build` first' }, () => {})
} else {
  // chrome.storage.local, backed by a plain Map.
  const store = new Map()
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys) => {
          const names = Array.isArray(keys) ? keys : [keys]
          return Object.fromEntries(names.filter((k) => store.has(k)).map((k) => [k, store.get(k)]))
        },
        set: async (items) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v)
        },
        remove: async (keys) => {
          for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k)
        },
      },
    },
  }

  const load = (file) => import(pathToFileURL(resolve(DIST, file)).href)

  const api = await load('lib/api.js')
  const errors = await load('lib/errors.js')
  const transcript = await load('lib/transcript.js')
  const validation = await load('lib/validation.js')
  const session = await load('lib/session.js')
  const languages = await load('lib/languages.js')

  const originalFetch = globalThis.fetch
  /** Install a one-shot fetch stub and capture the request it receives. */
  function stubFetch(handler) {
    const calls = []
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return handler(String(url), init)
    }
    return calls
  }
  const json = (status, body, headers = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

  test.afterEach(() => {
    globalThis.fetch = originalFetch
    store.clear()
  })

  // ── Upload validation ──────────────────────────────────────────────────────

  const fakeFile = (name, { size = 1024, type = '' } = {}) => {
    const file = new File([new Uint8Array(1)], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  test('accepts every media type the backend supports', () => {
    for (const ext of validation.ACCEPTED_EXTENSIONS) {
      assert.ok(validation.isAcceptedFile(fakeFile(`clip${ext}`)), `${ext} should be accepted`)
    }
    assert.equal(validation.ACCEPTED_EXTENSIONS.length, 20)
  })

  test('rejects files that are not audio or video', () => {
    for (const name of ['notes.pdf', 'archive.zip', 'subtitles.srt', 'page.html', 'noextension']) {
      assert.equal(validation.isAcceptedFile(fakeFile(name)), false, `${name} should be rejected`)
    }
  })

  test('classifies audio input so the audio-only upload mode is used', () => {
    assert.equal(validation.isAudioFile(fakeFile('podcast.mp3')), true)
    assert.equal(validation.isAudioFile(fakeFile('voice.m4a')), true)
    assert.equal(validation.isAudioFile(fakeFile('clip.mp4')), false)
    assert.equal(validation.isAudioFile(fakeFile('clip.bin', { type: 'audio/wav' })), true)
  })

  test('pre-flight blocks an unsupported file with an actionable message', async () => {
    const result = await validation.preflight(fakeFile('notes.pdf'), {})
    assert.equal(result.allowed, false)
    assert.match(result.reason, /supported media file/i)
  })

  test('pre-flight blocks a file over the plan size limit', async () => {
    const twoGb = 2 * 1024 * 1024 * 1024
    const result = await validation.preflight(fakeFile('big.mp4', { size: twoGb + 1 }), {
      maxFileSize: twoGb,
    })
    assert.equal(result.allowed, false)
    assert.match(result.reason, /2\.0 GB/)
  })

  test('pre-flight allows a file within the plan size limit', async () => {
    const result = await validation.preflight(fakeFile('clip.mp4', { size: 5 * 1024 * 1024 }), {
      maxFileSize: 2 * 1024 * 1024 * 1024,
    })
    assert.equal(result.allowed, true)
  })

  // ── API client ─────────────────────────────────────────────────────────────

  test('upload posts the file to /api/upload with the bearer token and tool type', async () => {
    const calls = stubFetch(() => json(202, { jobId: 'job-1', status: 'queued', jobToken: 'tok-1' }))
    const result = await api.uploadForTranscription(fakeFile('clip.mp4'), 'jwt-abc', {
      language: 'English',
      audioOnly: false,
    })

    assert.deepEqual(result, { jobId: 'job-1', status: 'queued', jobToken: 'tok-1' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://api.videotext.io/api/upload')
    assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer jwt-abc')
    const form = calls[0].init.body
    assert.equal(form.get('toolType'), 'video-to-transcript')
    assert.equal(form.get('language'), 'English')
    assert.equal(form.get('uploadMode'), null)
  })

  test('auto-detect sends no language field, matching the web app', async () => {
    const calls = stubFetch(() => json(202, { jobId: 'job-2', status: 'queued' }))
    await api.uploadForTranscription(fakeFile('clip.mp4'), 'jwt', {
      language: languages.AUTO_DETECT_VALUE,
      audioOnly: false,
    })
    assert.equal(calls[0].init.body.get('language'), null)
  })

  test('audio input sets the audio-only upload mode', async () => {
    const calls = stubFetch(() => json(202, { jobId: 'job-3', status: 'queued' }))
    await api.uploadForTranscription(fakeFile('show.mp3'), 'jwt', { language: '', audioOnly: true })
    const form = calls[0].init.body
    assert.equal(form.get('uploadMode'), 'audio-only')
    assert.equal(form.get('originalFileName'), 'show.mp3')
  })

  test('a quota refusal surfaces the backend message verbatim and is flagged as a quota error', async () => {
    const message =
      "You've used all 3 free imports this month. They reset on the 1st — or upgrade to Pro for unlimited processing."
    stubFetch(() => json(403, { message }))
    await assert.rejects(
      () => api.uploadForTranscription(fakeFile('clip.mp4'), 'jwt', { language: '', audioOnly: false }),
      (error) => {
        assert.ok(error instanceof errors.VideoTextApiError)
        assert.equal(error.status, 403)
        assert.equal(error.message, message)
        assert.equal(error.isQuotaError, true)
        assert.equal(error.isAuthError, false)
        return true
      }
    )
  })

  test('a rate limit is flagged as busy and keeps Retry-After', async () => {
    stubFetch(() => json(429, { message: 'Too many uploads. Please wait a minute before trying again.' }, { 'Retry-After': '60' }))
    await assert.rejects(
      () => api.uploadForTranscription(fakeFile('clip.mp4'), 'jwt', { language: '', audioOnly: false }),
      (error) => {
        assert.equal(error.isBusyError, true)
        assert.equal(error.retryAfterSeconds, 60)
        return true
      }
    )
  })

  test('a rejected session is flagged as an auth error so the popup signs out', async () => {
    stubFetch(() => json(401, { message: 'Session expired. Please log in again.' }))
    await assert.rejects(
      () => api.getCurrentUsage('stale-jwt'),
      (error) => {
        assert.equal(error.isAuthError, true)
        return true
      }
    )
  })

  test('chunked upload drives init → chunk → complete for a file over the threshold', async () => {
    const big = fakeFile('long.mp4', { size: 20 * 1024 * 1024 }) // > 15 MB threshold
    big.slice = () => ({ arrayBuffer: async () => new ArrayBuffer(8) })

    const calls = stubFetch((url) => {
      if (url.endsWith('/api/upload/init')) return json(200, { uploadId: 'upload-1' })
      if (url.endsWith('/api/upload/chunk')) return json(200, {})
      if (url.endsWith('/api/upload/complete')) return json(202, { jobId: 'job-9', status: 'queued', jobToken: 't' })
      throw new Error(`unexpected request: ${url}`)
    })

    const progress = []
    const result = await api.uploadForTranscription(big, 'jwt', {
      language: 'German',
      audioOnly: false,
      onProgress: (p) => progress.push(p),
    })

    assert.equal(result.jobId, 'job-9')
    const paths = calls.map((c) => new URL(c.url).pathname)
    assert.equal(paths[0], '/api/upload/init')
    assert.equal(paths.at(-1), '/api/upload/complete')
    assert.equal(paths.filter((p) => p === '/api/upload/chunk').length, 3, '20 MB at 8 MB chunks is 3 chunks')

    const initBody = JSON.parse(calls[0].init.body)
    assert.equal(initBody.toolType, 'video-to-transcript')
    assert.equal(initBody.totalChunks, 3)
    assert.equal(initBody.totalSize, 20 * 1024 * 1024)
    assert.equal(initBody.language, 'German')

    // Progress is reported per accepted chunk — real bytes, never a timer.
    assert.deepEqual(progress, [33, 67, 100])
    assert.equal(calls[1].init.headers.get('x-chunk-index'), '0')
    assert.equal(calls[1].init.headers.get('x-upload-id'), 'upload-1')
  })

  test('a job id the backend no longer knows becomes SessionExpiredError', async () => {
    stubFetch(() => json(404, { message: 'Job not found' }))
    await assert.rejects(
      () => api.getJobStatus('gone', 'jwt'),
      (error) => error instanceof errors.SessionExpiredError
    )
  })

  test('job status passes the job token through as a query parameter', async () => {
    const calls = stubFetch(() => json(200, { status: 'processing', progress: 42 }))
    const status = await api.getJobStatus('job-1', 'jwt', 'tok 1')
    assert.equal(calls[0].url, 'https://api.videotext.io/api/job/job-1?jobToken=tok%201')
    assert.equal(status.progress, 42)
  })

  // ── Job lifecycle ──────────────────────────────────────────────────────────

  test('lifecycle transitions depend only on status', () => {
    assert.equal(api.getJobLifecycleTransition({ status: 'queued', progress: 0 }), 'continue')
    assert.equal(api.getJobLifecycleTransition({ status: 'processing', progress: 50 }), 'continue')
    assert.equal(api.getJobLifecycleTransition({ status: 'failed', progress: 0 }), 'failed')
    // Completed with no result is still completed — never a failure.
    assert.equal(api.getJobLifecycleTransition({ status: 'completed', progress: 100 }), 'completed')
    assert.equal(
      api.getJobLifecycleTransition({ status: 'completed', progress: 100, result: { downloadUrl: '/api/download/x' } }),
      'completed'
    )
  })

  test('network failures are distinguished from API errors so polling can continue', () => {
    assert.equal(errors.isNetworkError(new TypeError('Failed to fetch')), true)
    assert.equal(errors.isNetworkError(Object.assign(new Error('aborted'), { name: 'AbortError' })), true)
    assert.equal(errors.isNetworkError(new errors.VideoTextApiError(500, 'server error')), false)
  })

  test('polling constants match the web app', async () => {
    const config = await load('lib/config.js')
    assert.equal(config.JOB_POLL_INTERVAL_MS, 1500)
    assert.equal(config.POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS, 5)
    assert.equal(config.CHUNK_THRESHOLD_BYTES, 15 * 1024 * 1024)
    assert.ok(config.CHUNK_SIZE_BYTES <= 10 * 1024 * 1024, 'chunks must fit the server 10 MB raw-body limit')
  })

  // ── Transcript result handling ─────────────────────────────────────────────

  test('segments become text joined on a blank line, as the web app does', () => {
    const text = transcript.segmentsToText([
      { start: 0, end: 2, text: 'Hello there.' },
      { start: 2, end: 4, text: 'This is VideoText.' },
    ])
    assert.equal(text, 'Hello there.\n\nThis is VideoText.')
    assert.equal(transcript.wordCount(text), 5)
  })

  test('transcript text falls back to the download URL when there are no segments', async () => {
    const calls = stubFetch(() => new Response('Downloaded transcript body', { status: 200 }))
    const text = await api.fetchTranscriptText('/api/download/out-123.txt', 'jwt')
    assert.equal(text, 'Downloaded transcript body')
    assert.equal(calls[0].url, 'https://api.videotext.io/api/download/out-123.txt')
    assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer jwt')
  })

  test('an unauthorised download surfaces the backend message', async () => {
    stubFetch(() => json(401, { message: 'Authentication required.' }))
    await assert.rejects(
      () => api.fetchTranscriptText('/api/download/out.txt', 'jwt'),
      (error) => error.isAuthError === true
    )
  })

  test('download filenames are derived from the source file and are filesystem-safe', () => {
    assert.equal(transcript.transcriptFileName('Team sync.mp4'), 'Team sync-transcript.txt')
    assert.equal(transcript.transcriptFileName('a/b:c*d.mov'), 'a-b-c-d-transcript.txt')
    assert.equal(transcript.transcriptFileName(''), 'transcript-transcript.txt')
    assert.ok(!/[\\/:*?"<>|]/.test(transcript.transcriptFileName('weird:/name?.mp4')))
  })

  // ── Usage / paywall handling ───────────────────────────────────────────────

  test('usage is read from the account endpoint, not computed locally', async () => {
    const calls = stubFetch(() =>
      json(200, {
        plan: 'free',
        quotaType: 'imports',
        used: 2,
        limit: 3,
        remaining: 1,
        limits: { maxFileSize: 2147483648, maxVideoDuration: 30 },
      })
    )
    const usage = await api.getCurrentUsage('jwt')
    assert.equal(calls[0].url, 'https://api.videotext.io/api/usage/current')
    assert.equal(usage.quotaType, 'imports')
    assert.equal(usage.remaining, 1)
    assert.equal(usage.limits.maxVideoDuration, 30)
  })

  // ── Session handling ───────────────────────────────────────────────────────

  const makeJwt = (expSeconds) => {
    const payload = Buffer.from(JSON.stringify({ userId: 'u1', plan: 'pro', exp: expSeconds })).toString('base64url')
    return `header.${payload}.signature`
  }

  test('a valid stored session is returned', async () => {
    const token = makeJwt(Math.floor(Date.now() / 1000) + 3600)
    await chrome.storage.local.set({
      'videotext:authToken': token,
      'videotext:plan': 'pro',
      'videotext:email': 'user@example.com',
    })
    const current = await session.getSession()
    assert.equal(current.token, token)
    assert.equal(current.plan, 'pro')
  })

  test('an expired token is treated as signed out and cleared from storage', async () => {
    await chrome.storage.local.set({ 'videotext:authToken': makeJwt(Math.floor(Date.now() / 1000) - 60) })
    assert.equal(await session.getSession(), null)
    assert.deepEqual(await chrome.storage.local.get(['videotext:authToken']), {})
  })

  test('no stored token means signed out', async () => {
    assert.equal(await session.getSession(), null)
  })

  test('an in-flight job is persisted so reopening the popup resumes it', async () => {
    await session.setActiveJob({ jobId: 'job-7', jobToken: 'tok', fileName: 'clip.mp4', language: '', startedAt: 1 })
    assert.equal((await session.getActiveJob()).jobId, 'job-7')
    await session.clearActiveJob()
    assert.equal(await session.getActiveJob(), null)
  })

  // ── Language options ───────────────────────────────────────────────────────

  test('offers the production language list plus auto-detect', () => {
    assert.equal(languages.LANGUAGES.length, 72)
    assert.ok(languages.LANGUAGES.includes('English'))
    assert.ok(languages.LANGUAGES.includes('Chinese (Simplified)'))
    assert.equal(languages.AUTO_DETECT_VALUE, '')
    assert.equal(languages.AUTO_DETECT_LABEL, 'Auto-detect')
  })
}
