/**
 * Popup UI for "Video to Transcript — VideoText".
 *
 * One screen, one job: pick an audio/video file, send it to the user's existing
 * VideoText account, show the transcript. All transcription, all quota
 * enforcement and all plan logic stay on the VideoText backend — this file
 * uploads, polls, and renders.
 *
 * Progress is only ever shown when the backend gives us a real number: bytes the
 * server has accepted during a chunked upload, `queuePosition` while queued, and
 * `progress` reported by the worker while processing. Nothing here fabricates a
 * percentage or a time estimate.
 */
import { fetchTranscriptText, getCurrentUsage, getJobLifecycleTransition, getJobStatus, uploadForTranscription, } from './lib/api.js';
import { JOB_POLL_INTERVAL_MS, POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS, URLS } from './lib/config.js';
import { SessionExpiredError, VideoTextApiError, getUserFacingMessage, isNetworkError } from './lib/errors.js';
import { AUTO_DETECT_LABEL, AUTO_DETECT_VALUE, LANGUAGES } from './lib/languages.js';
import { clearActiveJob, clearSession, getActiveJob, getSession, setActiveJob, updateSessionDetails, } from './lib/session.js';
import { segmentsToText, transcriptFileName, wordCount } from './lib/transcript.js';
import { FILE_INPUT_ACCEPT, formatBytes, formatDuration, isAudioFile, preflight, readMediaDurationSeconds, } from './lib/validation.js';
const VIEW_IDS = {
    'signed-out': 'view-signed-out',
    idle: 'view-idle',
    processing: 'view-processing',
    result: 'view-result',
    error: 'view-error',
};
function el(id) {
    const node = document.getElementById(id);
    if (!node)
        throw new Error(`Missing element #${id}`);
    return node;
}
// ── State ────────────────────────────────────────────────────────────────────
let session = null;
let usage = null;
let selectedFile = null;
let uploadAbort = null;
let pollTimer = null;
let transcriptText = '';
let transcriptSourceName = 'transcript';
// ── View switching ───────────────────────────────────────────────────────────
function showView(view) {
    for (const [name, id] of Object.entries(VIEW_IDS)) {
        el(id).hidden = name !== view;
    }
}
function showIdleError(message) {
    const node = el('idle-error');
    node.textContent = message ?? '';
    node.hidden = !message;
}
function showError(message, options = {}) {
    el('error-message').textContent = message;
    el('error-upgrade').hidden = !options.offerUpgrade;
    showView('error');
}
function stopPolling() {
    if (pollTimer != null) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
}
// ── Account header + allowance ───────────────────────────────────────────────
function renderAccount() {
    const account = el('account');
    const plan = el('account-plan');
    if (!session) {
        account.hidden = true;
        return;
    }
    account.hidden = false;
    plan.textContent = (usage?.plan ?? session.plan ?? 'free').replace(/_/g, ' ');
}
/**
 * Remaining allowance, stated only in the terms the backend itself reports
 * (server/src/routes/usage.ts). No client-side quota arithmetic: if the server
 * says `quotaType: 'unlimited'` we say so, and for `imports` we echo `remaining`.
 */
function renderAllowance() {
    const node = el('allowance');
    if (!usage) {
        node.textContent = '';
        return;
    }
    if (usage.quotaType === 'imports' && typeof usage.remaining === 'number') {
        node.textContent =
            usage.remaining === 1
                ? '1 transcription left on your plan'
                : `${usage.remaining} transcriptions left on your plan`;
        return;
    }
    if (usage.quotaType === 'unlimited') {
        node.textContent = 'Unlimited transcriptions on your plan';
        return;
    }
    node.textContent = '';
}
// ── File selection ───────────────────────────────────────────────────────────
function clearSelectedFile() {
    selectedFile = null;
    el('file-input').value = '';
    el('file-card').hidden = true;
    el('dropzone').hidden = false;
    el('transcribe').disabled = true;
    showIdleError(null);
}
async function selectFile(file) {
    showIdleError(null);
    const check = await preflight(file, {
        maxFileSize: usage?.limits?.maxFileSize,
        maxVideoDuration: usage?.limits?.maxVideoDuration,
    });
    if (!check.allowed) {
        selectedFile = null;
        el('file-card').hidden = true;
        el('dropzone').hidden = false;
        el('transcribe').disabled = true;
        showIdleError(check.reason ?? 'This file cannot be transcribed.');
        return;
    }
    selectedFile = file;
    el('file-name').textContent = file.name;
    el('file-card').hidden = false;
    el('dropzone').hidden = true;
    el('transcribe').disabled = false;
    // Media metadata, when the browser can read it. Size is always known.
    const meta = el('file-meta');
    meta.textContent = formatBytes(file.size);
    const seconds = await readMediaDurationSeconds(file);
    if (seconds != null && selectedFile === file) {
        meta.textContent = `${formatBytes(file.size)} · ${formatDuration(seconds)}`;
    }
}
// ── Transcription ────────────────────────────────────────────────────────────
function setProcessing(title, detail, fileName) {
    el('processing-title').textContent = title;
    el('processing-detail').textContent = detail;
    el('processing-file').textContent = fileName;
    showView('processing');
}
function setUploadProgress(percent) {
    const track = el('progress-track');
    if (percent == null) {
        track.hidden = true;
        return;
    }
    track.hidden = false;
    el('progress-bar').style.width = `${Math.max(0, Math.min(100, percent))}%`;
}
async function startTranscription() {
    if (!selectedFile || !session)
        return;
    const file = selectedFile;
    const language = el('language').value;
    uploadAbort = new AbortController();
    el('cancel-upload').hidden = false;
    setUploadProgress(null);
    setProcessing('Uploading your file…', 'Keep this window open until the upload finishes.', file.name);
    try {
        const result = await uploadForTranscription(file, session.token, {
            language,
            audioOnly: isAudioFile(file),
            signal: uploadAbort.signal,
            onProgress: (percent) => {
                // Only meaningful for chunked uploads, where each step is a chunk the
                // server has accepted. Single-request uploads stay indeterminate.
                if (file.size > 15 * 1024 * 1024)
                    setUploadProgress(percent);
            },
        });
        await setActiveJob({
            jobId: result.jobId,
            jobToken: result.jobToken,
            fileName: file.name,
            language,
            startedAt: Date.now(),
        });
        uploadAbort = null;
        el('cancel-upload').hidden = true;
        setUploadProgress(null);
        transcriptSourceName = file.name;
        setProcessing('Transcribing your file…', 'Queued', file.name);
        void pollJob(result.jobId, result.jobToken, file.name);
    }
    catch (error) {
        uploadAbort = null;
        el('cancel-upload').hidden = true;
        setUploadProgress(null);
        handleFailure(error);
    }
}
/**
 * Poll job status. Lifecycle follows client/src/lib/jobPolling.ts exactly:
 * only `status` moves the UI, a network error keeps polling (up to
 * POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS), and `completed` with no result
 * is still completed.
 */
async function pollJob(jobId, jobToken, fileName) {
    stopPolling();
    if (!session)
        return;
    let consecutiveNetworkErrors = 0;
    const tick = async () => {
        if (!session)
            return;
        let status;
        try {
            status = await getJobStatus(jobId, session.token, jobToken);
            consecutiveNetworkErrors = 0;
        }
        catch (error) {
            if (isNetworkError(error)) {
                consecutiveNetworkErrors++;
                if (consecutiveNetworkErrors >= POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS) {
                    showError('Lost connection to VideoText. Your transcription may still be running — reopen this window to check.');
                    return;
                }
                pollTimer = setTimeout(() => void tick(), JOB_POLL_INTERVAL_MS);
                return;
            }
            await clearActiveJob();
            handleFailure(error);
            return;
        }
        const transition = getJobLifecycleTransition(status);
        if (transition === 'completed') {
            await clearActiveJob();
            await showResult(status, fileName);
            return;
        }
        if (transition === 'failed') {
            await clearActiveJob();
            showError('Transcription failed. Please try the file again, or open VideoText for more detail.');
            return;
        }
        // Still running — report only what the backend actually told us.
        let detail = 'Queued';
        if (status.status === 'queued' && typeof status.queuePosition === 'number' && status.queuePosition > 0) {
            detail = `Queued — ${status.queuePosition} job${status.queuePosition === 1 ? '' : 's'} ahead of you`;
        }
        else if (status.status === 'processing') {
            detail = typeof status.progress === 'number' && status.progress > 0
                ? `Processing — ${Math.round(status.progress)}%`
                : 'Processing';
        }
        setProcessing('Transcribing your file…', detail, fileName);
        setUploadProgress(status.status === 'processing' && typeof status.progress === 'number' && status.progress > 0
            ? status.progress
            : null);
        pollTimer = setTimeout(() => void tick(), JOB_POLL_INTERVAL_MS);
    };
    await tick();
}
async function showResult(status, fileName) {
    if (!session)
        return;
    transcriptSourceName = fileName;
    // Same resolution order as client/src/pages/VideoToTranscript.tsx: segments first,
    // then the download URL.
    try {
        if (status.result?.segments?.length) {
            transcriptText = segmentsToText(status.result.segments);
        }
        else if (status.result?.downloadUrl) {
            transcriptText = await fetchTranscriptText(status.result.downloadUrl, session.token);
        }
        else {
            transcriptText = '';
        }
    }
    catch (error) {
        handleFailure(error);
        return;
    }
    if (!transcriptText.trim()) {
        showError('The transcription finished but returned no text. Open VideoText to review this job.');
        return;
    }
    el('transcript').textContent = transcriptText;
    const words = wordCount(transcriptText);
    const segments = status.result?.segments?.length ?? 0;
    el('result-meta').textContent = segments
        ? `${words.toLocaleString()} words · ${segments.toLocaleString()} segments`
        : `${words.toLocaleString()} words`;
    showView('result');
}
/** Map a thrown value to the right screen, using the backend's own message wherever there is one. */
function handleFailure(error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
        showView('idle');
        return;
    }
    if (error instanceof SessionExpiredError) {
        showError(error.message);
        return;
    }
    if (error instanceof VideoTextApiError) {
        if (error.isAuthError) {
            void clearSession().then(() => {
                session = null;
                renderAccount();
                showView('signed-out');
            });
            return;
        }
        if (error.isQuotaError) {
            showError(error.message, { offerUpgrade: true });
            return;
        }
        if (error.isBusyError) {
            const wait = error.retryAfterSeconds;
            showError(wait ? `${error.message} (Try again in about ${wait}s.)` : error.message);
            return;
        }
        showError(error.message);
        return;
    }
    showError(getUserFacingMessage(error));
}
// ── Result actions ───────────────────────────────────────────────────────────
async function copyTranscript() {
    const button = el('copy');
    const original = 'Copy Transcript';
    try {
        await navigator.clipboard.writeText(transcriptText);
        button.textContent = 'Copied';
    }
    catch {
        // Clipboard API can refuse when the popup is not focused; the textarea path
        // is the long-standing fallback and needs no extra permission.
        const area = document.createElement('textarea');
        area.value = transcriptText;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        button.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    }
    setTimeout(() => {
        button.textContent = original;
    }, 1600);
}
function downloadTranscript() {
    // A blob URL + <a download> keeps the extension free of the "downloads"
    // permission; the file never leaves the user's machine.
    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = transcriptFileName(transcriptSourceName);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
async function resetToIdle() {
    stopPolling();
    await clearActiveJob();
    transcriptText = '';
    clearSelectedFile();
    showView('idle');
    await refreshUsage();
}
// ── Session / usage ──────────────────────────────────────────────────────────
async function refreshUsage() {
    if (!session)
        return;
    try {
        usage = await getCurrentUsage(session.token);
        await updateSessionDetails(usage.plan, usage.email);
        renderAccount();
        renderAllowance();
    }
    catch (error) {
        if (error instanceof VideoTextApiError && error.isAuthError) {
            await clearSession();
            session = null;
            renderAccount();
            showView('signed-out');
            return;
        }
        // A usage read failure must not block transcribing — the server still
        // enforces every limit at upload time.
        renderAllowance();
    }
}
async function loadSession() {
    session = await getSession();
    renderAccount();
    return session != null;
}
// ── Wiring ───────────────────────────────────────────────────────────────────
function populateLanguages() {
    const select = el('language');
    const auto = document.createElement('option');
    auto.value = AUTO_DETECT_VALUE;
    auto.textContent = AUTO_DETECT_LABEL;
    select.appendChild(auto);
    for (const language of LANGUAGES) {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        select.appendChild(option);
    }
}
function wireEvents() {
    const fileInput = el('file-input');
    fileInput.accept = FILE_INPUT_ACCEPT;
    el('select-file').addEventListener('click', (event) => {
        event.stopPropagation();
        fileInput.click();
    });
    el('dropzone').addEventListener('click', () => fileInput.click());
    el('dropzone').addEventListener('keydown', (event) => {
        const key = event.key;
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            fileInput.click();
        }
    });
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file)
            void selectFile(file);
    });
    const dropzone = el('dropzone');
    for (const type of ['dragenter', 'dragover']) {
        dropzone.addEventListener(type, (event) => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        });
    }
    for (const type of ['dragleave', 'drop']) {
        dropzone.addEventListener(type, () => dropzone.classList.remove('is-dragging'));
    }
    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file)
            void selectFile(file);
    });
    el('clear-file').addEventListener('click', clearSelectedFile);
    el('transcribe').addEventListener('click', () => void startTranscription());
    el('cancel-upload').addEventListener('click', () => uploadAbort?.abort());
    el('copy').addEventListener('click', () => void copyTranscript());
    el('download').addEventListener('click', downloadTranscript);
    el('new-transcription').addEventListener('click', () => void resetToIdle());
    el('error-retry').addEventListener('click', () => void resetToIdle());
    el('sign-in').addEventListener('click', () => {
        void chrome.tabs.create({ url: URLS.extensionAuth });
    });
    el('sign-in-recheck').addEventListener('click', () => void init());
}
async function init() {
    stopPolling();
    if (!(await loadSession())) {
        showView('signed-out');
        return;
    }
    await refreshUsage();
    if (!session)
        return; // refreshUsage may have signed us out on a 401.
    // Resume a job that was still running when the popup last closed.
    const active = await getActiveJob();
    if (active) {
        transcriptSourceName = active.fileName;
        setProcessing('Transcribing your file…', 'Checking status…', active.fileName);
        void pollJob(active.jobId, active.jobToken, active.fileName);
        return;
    }
    clearSelectedFile();
    showView('idle');
}
populateLanguages();
wireEvents();
void init();
