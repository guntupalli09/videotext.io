import { login, getCurrentUsage, uploadFixSrt, pollJob, downloadFixedFile, remainingImports, ApiError } from './api.js'
import { isFreePlan } from './api.js'

const SESSION_KEY = 'session'
const JOB_KEY = 'jobState'

let activeAbort = null

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof ApiError ? error.message : String(error?.message || error),
        code: error instanceof ApiError ? error.code : null,
        status: error instanceof ApiError ? error.status : 0,
      })
    })
  return true
})

async function handleMessage(message) {
  switch (message?.type) {
    case 'GET_STATE':
      return { ok: true, ...(await readState()) }
    case 'LOGIN':
      return loginAndStore(message.email, message.password)
    case 'STORE_SESSION':
      return storeExternalSession(message.session)
    case 'LOGOUT':
      await chrome.storage.session.remove([SESSION_KEY])
      await chrome.storage.local.remove([SESSION_KEY])
      return { ok: true, session: null, usage: null }
    case 'REFRESH_USAGE':
      return refreshUsage()
    case 'START_FIX':
      return startFix(message)
    case 'CANCEL_FIX':
      if (activeAbort) activeAbort.abort()
      await setJobState({ status: 'idle' })
      return { ok: true }
    case 'RESET_JOB':
      await setJobState({ status: 'idle' })
      return { ok: true }
    case 'DOWNLOAD_TEXT':
      return downloadText()
    default:
      throw new ApiError('Unknown extension message')
  }
}

async function readState() {
  const session = await getSession()
  const job = await getJobState()
  let usage = null
  if (session?.token) {
    try {
      usage = await getCurrentUsage(session.token)
    } catch {
      usage = null
    }
  }
  return { session, usage, job }
}

async function loginAndStore(email, password) {
  const session = await login(email, password)
  await saveSession(session)
  const usage = await getCurrentUsage(session.token)
  await setJobState({ status: 'idle' })
  return { ok: true, session, usage }
}

async function storeExternalSession(session) {
  if (!session?.token || !session.userId) {
    throw new ApiError('Incomplete VideoText session')
  }
  const next = {
    token: session.token,
    userId: session.userId,
    plan: String(session.plan || 'free').toLowerCase(),
    email: session.email || '',
  }
  await saveSession(next)
  const usage = await getCurrentUsage(next.token)
  return { ok: true, session: next, usage }
}

async function refreshUsage() {
  const session = await getSession()
  if (!session?.token) return { ok: true, session: null, usage: null }
  const usage = await getCurrentUsage(session.token)
  if (usage.plan && usage.plan !== session.plan) {
    session.plan = String(usage.plan).toLowerCase()
    if (usage.email) session.email = usage.email
    await saveSession(session)
  }
  return { ok: true, session, usage }
}

async function startFix(message) {
  const session = await getSession()
  if (!session?.token) {
    throw new ApiError('Sign in to VideoText to fix and download SRT files.', { code: 'AUTH', status: 401 })
  }

  const usage = await getCurrentUsage(session.token)
  const remaining = remainingImports(usage)
  if (isFreePlan(usage.plan || session.plan) && usage.quotaType === 'imports' && remaining !== null && remaining <= 0) {
    await setJobState({
      status: 'quota',
      message: 'Free monthly imports are used up. Upgrade to continue, or wait until the quota resets.',
    })
    return { ok: false, code: 'QUOTA', usage, session, error: 'Free monthly imports are used up.' }
  }

  const file = new File([message.fileText], message.fileName, { type: 'application/x-subrip' })
  await setJobState({
    status: 'uploading',
    fileName: message.fileName,
    message: 'Uploading SRT to VideoText…',
    progress: null,
  })

  const uploaded = await uploadFixSrt(file, message.options || {}, session)
  await setJobState({
    status: 'processing',
    fileName: message.fileName,
    jobId: uploaded.jobId,
    jobToken: uploaded.jobToken,
    message: 'Fixing on VideoText…',
    progress: 0,
  })

  activeAbort = new AbortController()
  try {
    const result = await pollJob(uploaded.jobId, {
      token: session.token,
      jobToken: uploaded.jobToken,
      signal: activeAbort.signal,
      onUpdate: async (status) => {
        const queue = status.queuePosition
        await setJobState({
          status: 'processing',
          fileName: message.fileName,
          jobId: uploaded.jobId,
          jobToken: uploaded.jobToken,
          progress: Number.isFinite(status.progress) ? status.progress : null,
          queuePosition: queue,
          message: queue > 0
            ? `Waiting in queue — ${queue} job${queue === 1 ? '' : 's'} ahead`
            : 'Fixing on VideoText…',
        })
      },
    })

    if (result.requiresAuth) {
      throw new ApiError('Sign in to VideoText to view the result.', { code: 'AUTH', status: 401 })
    }

    const downloadUrl = result.result?.downloadUrl
    if (!downloadUrl) {
      throw new ApiError('Fix finished but no file was returned.')
    }

    const content = await downloadFixedFile(downloadUrl, session.token)
    await setJobState({
      status: 'completed',
      fileName: message.fileName,
      jobId: uploaded.jobId,
      downloadUrl,
      resultFileName: result.result?.fileName || suggestFixedName(message.fileName),
      issues: result.result?.issues || [],
      warnings: result.result?.warnings || [],
      content,
      message: 'Fixed SRT ready',
    })
    return { ok: true, ...(await readState()) }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'CANCELLED') {
      await setJobState({ status: 'idle' })
      return { ok: true, cancelled: true }
    }
    await setJobState({
      status: 'failed',
      fileName: message.fileName,
      message: error.message || 'Processing failed',
    })
    throw error
  } finally {
    activeAbort = null
  }
}

async function downloadText() {
  const job = await getJobState()
  if (!job?.content) {
    throw new ApiError('Nothing to download yet')
  }
  return {
    ok: true,
    content: job.content,
    fileName: job.resultFileName || suggestFixedName(job.fileName || 'subtitles.srt'),
  }
}

function suggestFixedName(name) {
  const stem = String(name || 'subtitles').replace(/\.srt$/i, '')
  return `${stem}_subtitles_fixed.srt`
}

async function getSession() {
  const sessionStore = await chrome.storage.session.get(SESSION_KEY)
  if (sessionStore[SESSION_KEY]) return sessionStore[SESSION_KEY]
  const local = await chrome.storage.local.get(SESSION_KEY)
  return local[SESSION_KEY] || null
}

async function saveSession(session) {
  await chrome.storage.session.set({ [SESSION_KEY]: session })
  await chrome.storage.local.set({ [SESSION_KEY]: session })
}

async function getJobState() {
  const data = await chrome.storage.session.get(JOB_KEY)
  return data[JOB_KEY] || { status: 'idle' }
}

async function setJobState(state) {
  await chrome.storage.session.set({ [JOB_KEY]: state })
}
