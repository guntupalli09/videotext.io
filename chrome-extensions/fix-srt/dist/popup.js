import { LOGIN_URL, PRICING_URL, MAX_SRT_BYTES, LARGE_SRT_WARN_BYTES } from './config.js'
import { validateSrtSelection, parseSrtPreview, formatBytes, formatDuration } from './srtValidate.js'
import { remainingImports, isFreePlan } from './api.js'

const FINDING_LABELS = {
  overlap: 'Overlapping cues',
  long_line: 'Line too long (CPL)',
  fast_reading: 'Reading speed (CPS)',
  reading_speed: 'Reading speed (CPS)',
  large_gap: 'Large gap (reported, not auto-fixed)',
  scene_cut: 'Spans a scene cut (warning only)',
  invalid_timing: 'Invalid timing',
}

const els = {
  accountChip: document.getElementById('account-chip'),
  authPanel: document.getElementById('auth-panel'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginSubmit: document.getElementById('login-submit'),
  loginError: document.getElementById('login-error'),
  openSiteLogin: document.getElementById('open-site-login'),
  quotaPanel: document.getElementById('quota-panel'),
  quotaCopy: document.getElementById('quota-copy'),
  upgradeLink: document.getElementById('upgrade-link'),
  dropPanel: document.getElementById('drop-panel'),
  dropzone: document.getElementById('dropzone'),
  pickFile: document.getElementById('pick-file'),
  fileInput: document.getElementById('file-input'),
  fileMeta: document.getElementById('file-meta'),
  fileErrors: document.getElementById('file-errors'),
  fileWarnings: document.getElementById('file-warnings'),
  optionsPanel: document.getElementById('options-panel'),
  fixBtn: document.getElementById('fix-btn'),
  processPanel: document.getElementById('process-panel'),
  processCopy: document.getElementById('process-copy'),
  processDetail: document.getElementById('process-detail'),
  cancelBtn: document.getElementById('cancel-btn'),
  resultPanel: document.getElementById('result-panel'),
  resultSummary: document.getElementById('result-summary'),
  findings: document.getElementById('findings'),
  preview: document.getElementById('preview'),
  downloadBtn: document.getElementById('download-btn'),
  anotherBtn: document.getElementById('another-btn'),
  resultNote: document.getElementById('result-note'),
  errorPanel: document.getElementById('error-panel'),
  errorCopy: document.getElementById('error-copy'),
  retryReset: document.getElementById('retry-reset'),
  usageLine: document.getElementById('usage-line'),
  signOut: document.getElementById('sign-out'),
  optTiming: document.getElementById('opt-timing'),
  optGrammar: document.getElementById('opt-grammar'),
  optLines: document.getElementById('opt-lines'),
  optFillers: document.getElementById('opt-fillers'),
}

let session = null
let usage = null
let selected = null

init()

async function init() {
  bind()
  const state = await send({ type: 'GET_STATE' })
  applyState(state)
}

function bind() {
  els.loginForm.addEventListener('submit', onLogin)
  els.openSiteLogin.addEventListener('click', () => chrome.tabs.create({ url: LOGIN_URL }))
  els.upgradeLink.href = PRICING_URL
  els.signOut.addEventListener('click', onSignOut)
  els.pickFile.addEventListener('click', (event) => {
    event.stopPropagation()
    els.fileInput.click()
  })
  els.dropzone.addEventListener('click', () => els.fileInput.click())
  els.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      els.fileInput.click()
    }
  })
  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files[0]) void onFile(els.fileInput.files[0])
  })
  ;['dragenter', 'dragover'].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault()
      els.dropzone.classList.add('drag')
    })
  })
  ;['dragleave', 'drop'].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault()
      els.dropzone.classList.remove('drag')
    })
  })
  els.dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0]
    if (file) void onFile(file)
  })
  els.fixBtn.addEventListener('click', onFix)
  els.cancelBtn.addEventListener('click', async () => {
    await send({ type: 'CANCEL_FIX' })
    showIdle()
  })
  els.downloadBtn.addEventListener('click', onDownload)
  els.anotherBtn.addEventListener('click', onReset)
  els.retryReset.addEventListener('click', onReset)
}

function applyState(state) {
  session = state.session || null
  usage = state.usage || null
  renderAccount()
  renderUsage()

  const job = state.job || { status: 'idle' }
  if (job.status === 'uploading' || job.status === 'processing') {
    showProcessing(job)
    return
  }
  if (job.status === 'completed' && job.content) {
    showResult(job)
    return
  }
  if (job.status === 'failed') {
    showError(job.message || 'Processing failed')
    return
  }
  if (job.status === 'quota') {
    showQuota(job.message)
    return
  }
  showIdle()
}

function renderAccount() {
  const signedIn = !!session?.token
  els.authPanel.classList.toggle('hidden', signedIn)
  els.signOut.classList.toggle('hidden', !signedIn)
  els.accountChip.classList.toggle('hidden', !signedIn)
  if (signedIn) {
    const plan = (session.plan || usage?.plan || 'free').toLowerCase()
    els.accountChip.textContent = `${session.email || 'Signed in'} · ${plan}`
  }
}

function renderUsage() {
  if (!session) {
    els.usageLine.textContent = 'Sign in to use your VideoText import allowance.'
    return
  }
  const plan = usage?.plan || session.plan || 'free'
  const remaining = remainingImports(usage)
  if (usage?.quotaType === 'unlimited' || remaining === Infinity) {
    els.usageLine.textContent = `${plan} plan · unlimited imports`
    return
  }
  if (remaining == null) {
    els.usageLine.textContent = `${plan} plan`
    return
  }
  els.usageLine.textContent = `${plan} plan · ${remaining} import${remaining === 1 ? '' : 's'} remaining`
}

async function onLogin(event) {
  event.preventDefault()
  els.loginError.classList.add('hidden')
  els.loginSubmit.disabled = true
  try {
    const state = await send({
      type: 'LOGIN',
      email: els.loginEmail.value,
      password: els.loginPassword.value,
    })
    els.loginPassword.value = ''
    applyState(state)
    if (selected?.validation.ok) maybeShowOptions()
  } catch (error) {
    els.loginError.textContent = error.message || 'Sign in failed'
    els.loginError.classList.remove('hidden')
  } finally {
    els.loginSubmit.disabled = false
  }
}

async function onSignOut() {
  const state = await send({ type: 'LOGOUT' })
  selected = null
  applyState(state)
}

async function onFile(file) {
  const text = await file.text()
  const validation = validateSrtSelection(
    { name: file.name, size: file.size, text },
    { maxBytes: MAX_SRT_BYTES, warnBytes: LARGE_SRT_WARN_BYTES }
  )
  selected = { file, text, validation }
  renderFile()
  maybeShowOptions()
}

function renderFile() {
  if (!selected) {
    els.fileMeta.classList.add('hidden')
    els.fileErrors.classList.add('hidden')
    els.fileWarnings.classList.add('hidden')
    return
  }
  const { file, validation } = selected
  const stats = validation.stats
  els.fileMeta.classList.remove('hidden')
  els.fileMeta.innerHTML = `
    <strong>${escapeHtml(file.name)}</strong>
    <span>${formatBytes(file.size)} · ${stats.cueCount} cue${stats.cueCount === 1 ? '' : 's'} · about ${formatDuration(stats.durationSec)}</span>
  `
  renderList(els.fileErrors, validation.errors)
  renderList(els.fileWarnings, validation.warnings)
}

function maybeShowOptions() {
  const ok = !!selected?.validation.ok
  const signedIn = !!session?.token
  els.optionsPanel.classList.toggle('hidden', !ok)
  els.fixBtn.disabled = !ok || !signedIn
  els.fixBtn.textContent = signedIn ? 'Fix SRT' : 'Sign in to Fix SRT'
  if (ok && signedIn) {
    const remaining = remainingImports(usage)
    if (isFreePlan(usage?.plan || session.plan) && usage?.quotaType === 'imports' && remaining !== null && remaining <= 0) {
      showQuota('Your free VideoText imports are used up for this period.')
      els.fixBtn.disabled = true
    }
  }
}

async function onFix() {
  if (!selected?.validation.ok) return
  if (!session?.token) {
    els.authPanel.classList.remove('hidden')
    els.loginEmail.focus()
    return
  }
  showProcessing({ message: 'Uploading SRT to VideoText…', progress: null })
  try {
    const state = await send({
      type: 'START_FIX',
      fileName: selected.file.name,
      fileText: selected.text,
      options: {
        fixTiming: els.optTiming.checked,
        grammarFix: els.optGrammar.checked,
        lineBreakFix: els.optLines.checked,
        removeFillers: els.optFillers.checked,
      },
    })
    applyState(state)
  } catch (error) {
    if (error.code === 'QUOTA') {
      showQuota(error.message)
      return
    }
    showError(error.message || 'Processing failed')
  }
}

function showIdle() {
  els.processPanel.classList.add('hidden')
  els.resultPanel.classList.add('hidden')
  els.errorPanel.classList.add('hidden')
  els.quotaPanel.classList.add('hidden')
  els.dropPanel.classList.remove('hidden')
  renderFile()
  maybeShowOptions()
}

function showProcessing(job) {
  els.authPanel.classList.add('hidden')
  els.dropPanel.classList.add('hidden')
  els.optionsPanel.classList.add('hidden')
  els.resultPanel.classList.add('hidden')
  els.errorPanel.classList.add('hidden')
  els.quotaPanel.classList.add('hidden')
  els.processPanel.classList.remove('hidden')
  els.processCopy.textContent = job.message || 'Fixing on VideoText…'
  if (Number.isFinite(job.progress)) {
    els.processDetail.textContent = `Server job progress: ${job.progress}%`
  } else {
    els.processDetail.textContent = 'No percentage estimate — waiting for the VideoText job.'
  }
}

function showResult(job) {
  els.processPanel.classList.add('hidden')
  els.dropPanel.classList.add('hidden')
  els.optionsPanel.classList.add('hidden')
  els.errorPanel.classList.add('hidden')
  els.quotaPanel.classList.add('hidden')
  els.resultPanel.classList.remove('hidden')

  const issues = job.issues || []
  const warnings = job.warnings || []
  els.resultSummary.textContent = issues.length
    ? `VideoText reported ${issues.length} finding${issues.length === 1 ? '' : 's'} on this file.`
    : 'No structural findings were reported. The file was still re-serialized (overlaps are always resolved).'

  els.findings.innerHTML = ''
  const grouped = groupFindings(issues, warnings)
  if (!grouped.length) {
    els.findings.innerHTML = '<div class="finding">No issue report items returned for this job.</div>'
  } else {
    for (const item of grouped) {
      const div = document.createElement('div')
      div.className = 'finding'
      div.textContent = `${item.label} · ${item.count}`
      els.findings.appendChild(div)
    }
  }

  const rows = parseSrtPreview(job.content, 30)
  els.preview.textContent = rows.length
    ? rows.map((r) => `${r.index}\n${r.start} --> ${r.end}\n${r.text}`).join('\n\n')
    : job.content.slice(0, 2000)
  els.resultNote.textContent = isFreePlan(session?.plan || usage?.plan)
    ? 'Free-plan downloads from VideoText may include a watermark cue.'
    : ''
}

function showQuota(message) {
  els.processPanel.classList.add('hidden')
  els.quotaPanel.classList.remove('hidden')
  els.quotaCopy.textContent = message || 'Your free VideoText imports are used up.'
  els.fixBtn.disabled = true
}

function showError(message) {
  els.processPanel.classList.add('hidden')
  els.resultPanel.classList.add('hidden')
  els.errorPanel.classList.remove('hidden')
  els.errorCopy.textContent = message
}

function groupFindings(issues, warnings) {
  const counts = new Map()
  for (const item of [...issues, ...warnings]) {
    const key = item.type || 'other'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].map(([type, count]) => ({
    type,
    count,
    label: FINDING_LABELS[type] || type,
  }))
}

async function onDownload() {
  const result = await send({ type: 'DOWNLOAD_TEXT' })
  const blob = new Blob([result.content], { type: 'application/x-subrip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.fileName || 'subtitles_fixed.srt'
  a.click()
  URL.revokeObjectURL(url)
}

async function onReset() {
  await send({ type: 'RESET_JOB' })
  selected = null
  els.fileInput.value = ''
  els.optTiming.checked = false
  els.optGrammar.checked = false
  els.optLines.checked = false
  els.optFillers.checked = false
  const state = await send({ type: 'REFRESH_USAGE' })
  applyState({ ...state, job: { status: 'idle' } })
}

function renderList(node, items) {
  node.innerHTML = ''
  if (!items.length) {
    node.classList.add('hidden')
    return
  }
  node.classList.remove('hidden')
  for (const item of items) {
    const li = document.createElement('li')
    li.textContent = item
    node.appendChild(li)
  }
}

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!response?.ok && message.type !== 'GET_STATE') {
        const error = new Error(response?.error || 'Request failed')
        error.code = response?.code
        reject(error)
        return
      }
      resolve(response || {})
    })
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
