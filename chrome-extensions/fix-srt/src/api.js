import {
  API_ORIGIN,
  TOOL_TYPE,
  POLL_INTERVAL_MS,
  POLL_MAX_MS,
  POLL_NETWORK_FAIL_LIMIT,
} from './config.js'

export class ApiError extends Error {
  constructor(message, { status = 0, code = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function login(email, password) {
  const response = await fetch(`${API_ORIGIN}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  const data = await readJson(response)
  if (!response.ok) {
    throw new ApiError(data.message || 'Sign in failed', { status: response.status })
  }
  if (!data.token || !data.userId || data.plan == null) {
    throw new ApiError('Invalid login response')
  }
  return {
    token: data.token,
    userId: data.userId,
    plan: String(data.plan).toLowerCase(),
    email: data.email || email.trim().toLowerCase(),
  }
}

export async function getCurrentUsage(token) {
  const response = await apiFetch('/api/usage/current', { token, timeoutMs: 25000 })
  if (!response.ok) {
    throw new ApiError('Could not load account usage', { status: response.status })
  }
  return response.json()
}

export async function uploadFixSrt(file, options, session) {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('toolType', TOOL_TYPE)
  form.append('fixTiming', String(!!options.fixTiming))
  form.append('grammarFix', String(!!options.grammarFix))
  form.append('lineBreakFix', String(!!options.lineBreakFix))
  form.append('removeFillers', String(!!options.removeFillers))

  const response = await fetch(`${API_ORIGIN}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'x-user-id': session.userId,
      'x-plan': session.plan || 'free',
    },
    body: form,
  })
  const data = await readJson(response)
  if (!response.ok || !data.jobId) {
    throw new ApiError(mapUploadError(data.message || 'Upload failed'), {
      status: response.status,
    })
  }
  return {
    jobId: data.jobId,
    jobToken: data.jobToken,
    status: data.status || 'queued',
  }
}

export async function getJobStatus(jobId, { token, jobToken } = {}) {
  let path = `/api/job/${jobId}`
  if (jobToken) path += `?jobToken=${encodeURIComponent(jobToken)}`
  const response = await apiFetch(path, { token, timeoutMs: 25000 })
  if (response.status === 404) {
    throw new ApiError('This job expired. Upload the file again.', { status: 404, code: 'EXPIRED' })
  }
  if (!response.ok) {
    throw new ApiError('Failed to get job status', { status: response.status })
  }
  return response.json()
}

export async function downloadFixedFile(downloadUrl, token) {
  const url = downloadUrl.startsWith('http') ? downloadUrl : `${API_ORIGIN}${downloadUrl}`
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.status === 401) {
    throw new ApiError('Sign in to download the fixed file.', { status: 401, code: 'AUTH' })
  }
  if (!response.ok) {
    throw new ApiError('Download failed', { status: response.status })
  }
  return response.text()
}

export async function pollJob(jobId, { token, jobToken, onUpdate, signal } = {}) {
  const started = Date.now()
  let networkFails = 0

  while (true) {
    if (signal?.aborted) {
      throw new ApiError('Processing cancelled', { code: 'CANCELLED' })
    }
    if (Date.now() - started > POLL_MAX_MS) {
      throw new ApiError('Processing is taking too long. Try again, or use videotext.io/fix-subtitles.', {
        code: 'TIMEOUT',
      })
    }
    try {
      const status = await getJobStatus(jobId, { token, jobToken })
      networkFails = 0
      onUpdate?.(status)
      if (status.status === 'completed') return status
      if (status.status === 'failed') {
        throw new ApiError(status.result?.message || 'VideoText could not fix this file.', {
          code: 'FAILED',
        })
      }
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'EXPIRED' || error.code === 'FAILED')) {
        throw error
      }
      networkFails += 1
      if (networkFails >= POLL_NETWORK_FAIL_LIMIT) {
        throw new ApiError('Network error while checking job status. Check your connection and try again.', {
          code: 'NETWORK',
        })
      }
    }
    await sleep(POLL_INTERVAL_MS, signal)
  }
}

export function remainingImports(usage) {
  if (!usage) return null
  if (usage.quotaType === 'unlimited') return Infinity
  if (usage.remaining != null) return usage.remaining
  const limit = usage.limit ?? 3
  const used = usage.used ?? usage.usage?.importCount ?? 0
  return limit - used
}

export function isFreePlan(plan) {
  return !plan || String(plan).toLowerCase() === 'free'
}

function mapUploadError(message) {
  if (/unsupported subtitle format/i.test(message)) {
    return "This file doesn't look like a subtitle file. Upload a valid SRT."
  }
  if (/quota|import/i.test(message) && /exceed|limit|reached/i.test(message)) {
    return message
  }
  return message
}

async function apiFetch(path, { token, timeoutMs } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const options = { headers }
  if (timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(`${API_ORIGIN}${path}`, { ...options, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }
  return fetch(`${API_ORIGIN}${path}`, options)
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new ApiError('Processing cancelled', { code: 'CANCELLED' }))
      },
      { once: true }
    )
  })
}
