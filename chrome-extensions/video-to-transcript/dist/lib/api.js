/**
 * VideoText API client for the Chrome extension.
 *
 * This is a thin, read-the-contract-from-the-web-app client: every endpoint,
 * field name and status code here is taken from the existing production API
 * (server/src/routes/upload.ts, server/src/routes/jobs.ts,
 * server/src/routes/usage.ts) as used by client/src/lib/api.ts. The extension
 * creates no endpoints of its own and duplicates no backend logic — in
 * particular it performs no entitlement, quota or billing arithmetic. The
 * server decides; the extension renders what it says.
 */
import { API_ORIGIN, CHUNK_SIZE_BYTES, CHUNK_THRESHOLD_BYTES, MAX_CHUNKS, TOOL_TYPE, } from './config.js';
import { SessionExpiredError, VideoTextApiError } from './errors.js';
/** Timeout for short GET requests (status/usage) so a stalled network fails fast and polling retries. */
const GET_TIMEOUT_MS = 25_000;
/** Timeout for a single upload request or chunk. */
const UPLOAD_TIMEOUT_MS = 180_000;
/**
 * Single entry point for API requests. Mirrors the /api/* contract enforced by
 * client/src/lib/api.ts::api() so a typo cannot produce /upload or /api/api/*.
 */
async function request(path, token, init = {}) {
    if (!path.startsWith('/api/')) {
        throw new Error(`API path must start with /api/. Got: ${path}`);
    }
    const { timeoutMs, ...rest } = init;
    const headers = new Headers(rest.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        return await fetch(`${API_ORIGIN}${path}`, {
            ...rest,
            headers,
            signal: rest.signal ?? controller.signal,
        });
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
/** Turn a non-2xx response into a VideoTextApiError carrying the server's own message. */
async function toApiError(response, fallback) {
    let message = fallback;
    try {
        const text = await response.text();
        if (text.trim()) {
            const parsed = JSON.parse(text);
            if (parsed?.message)
                message = parsed.message;
        }
    }
    catch {
        // Non-JSON body (proxy error page) — keep the fallback.
    }
    const retryAfter = response.headers.get('Retry-After');
    return new VideoTextApiError(response.status, message, retryAfter ? Number(retryAfter) || undefined : undefined);
}
/** GET /api/usage/current — plan, remaining allowance, and the plan's file-size/duration limits. */
export async function getCurrentUsage(token) {
    const response = await request('/api/usage/current', token, { timeoutMs: GET_TIMEOUT_MS });
    if (!response.ok)
        throw await toApiError(response, 'Could not load your VideoText account.');
    return (await response.json());
}
/** GET /api/job/:jobId — 404 means the job is gone from the queue, not a failure of this poll. */
export async function getJobStatus(jobId, token, jobToken) {
    const query = jobToken ? `?jobToken=${encodeURIComponent(jobToken)}` : '';
    const response = await request(`/api/job/${encodeURIComponent(jobId)}${query}`, token, {
        timeoutMs: GET_TIMEOUT_MS,
    });
    if (response.status === 404)
        throw new SessionExpiredError();
    if (!response.ok)
        throw await toApiError(response, 'Could not check transcription status.');
    return (await response.json());
}
/** Fetch transcript text from result.downloadUrl. Ownership is enforced server-side (server/src/routes/download.ts). */
export async function fetchTranscriptText(downloadUrl, token) {
    const path = downloadUrl.startsWith('/api/') ? downloadUrl : `/api/download/${downloadUrl}`;
    const response = await request(path, token, { timeoutMs: GET_TIMEOUT_MS });
    if (!response.ok)
        throw await toApiError(response, 'Could not download the transcript.');
    return response.text();
}
/**
 * Upload a file and create a transcription job.
 *
 * Routes to the single-request endpoint or the chunked endpoints on the same
 * 15 MB threshold the web app uses (CHUNK_THRESHOLD in client/src/lib/api.ts),
 * so extension uploads look identical to web uploads on the server.
 */
export async function uploadForTranscription(file, token, options) {
    return file.size > CHUNK_THRESHOLD_BYTES
        ? uploadChunked(file, token, options)
        : uploadSingle(file, token, options);
}
function parseUploadResponse(text) {
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        throw new Error('Unexpected response from VideoText. Please try again.');
    }
    if (!data?.jobId)
        throw new Error('Upload accepted but no job was created. Please try again.');
    return { jobId: String(data.jobId), status: data.status ?? 'queued', jobToken: data.jobToken };
}
async function uploadSingle(file, token, options) {
    const form = new FormData();
    form.append('file', file);
    form.append('toolType', TOOL_TYPE);
    if (options.language)
        form.append('language', options.language);
    if (options.audioOnly) {
        form.append('uploadMode', 'audio-only');
        form.append('originalFileName', file.name);
        form.append('originalFileSize', String(file.size));
    }
    // fetch() gives no upload-progress events; the popup shows an indeterminate
    // "Uploading…" state for single-request uploads rather than a fake percentage.
    options.onProgress?.(0);
    const response = await request('/api/upload', token, {
        method: 'POST',
        body: form,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        signal: options.signal,
    });
    if (!response.ok)
        throw await toApiError(response, 'Upload failed. Please try again.');
    options.onProgress?.(100);
    return parseUploadResponse(await response.text());
}
async function uploadChunked(file, token, options) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);
    if (totalChunks > MAX_CHUNKS) {
        // Cannot happen for any current plan limit at 8 MB chunks (2000 × 8 MB = 16 GB),
        // but the server rejects totalChunks > MAX_CHUNKS, so fail with a clear message.
        throw new Error('This file is too large to upload from the extension. Use videotext.io instead.');
    }
    const initBody = {
        filename: file.name,
        totalSize: file.size,
        totalChunks,
        toolType: TOOL_TYPE,
    };
    if (options.language)
        initBody.language = options.language;
    if (options.audioOnly) {
        initBody.uploadMode = 'audio-only';
        initBody.originalFileName = file.name;
        initBody.originalFileSize = file.size;
    }
    const initResponse = await request('/api/upload/init', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initBody),
        timeoutMs: GET_TIMEOUT_MS,
        signal: options.signal,
    });
    if (!initResponse.ok)
        throw await toApiError(initResponse, 'Upload could not be started.');
    const { uploadId } = (await initResponse.json());
    if (!uploadId)
        throw new Error('Upload could not be started. Please try again.');
    for (let index = 0; index < totalChunks; index++) {
        if (options.signal?.aborted)
            throw new DOMException('Upload cancelled', 'AbortError');
        const start = index * CHUNK_SIZE_BYTES;
        const blob = file.slice(start, Math.min(start + CHUNK_SIZE_BYTES, file.size));
        const chunkResponse = await request('/api/upload/chunk', token, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'x-upload-id': uploadId,
                'x-chunk-index': String(index),
            },
            body: await blob.arrayBuffer(),
            timeoutMs: UPLOAD_TIMEOUT_MS,
            signal: options.signal,
        });
        if (!chunkResponse.ok)
            throw await toApiError(chunkResponse, 'Upload interrupted. Please try again.');
        // Real progress: bytes actually accepted by the server, not a timer.
        options.onProgress?.(Math.round(((index + 1) / totalChunks) * 100));
    }
    const completeResponse = await request('/api/upload/complete', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
        timeoutMs: UPLOAD_TIMEOUT_MS,
        signal: options.signal,
    });
    if (!completeResponse.ok)
        throw await toApiError(completeResponse, 'Upload could not be finished.');
    return parseUploadResponse(await completeResponse.text());
}
/**
 * Job lifecycle transition. Copied from client/src/lib/jobPolling.ts: lifecycle
 * depends ONLY on `status`. A missing result on a completed job is still
 * completed, and a failed poll (network/parse) is never a failed job.
 */
export function getJobLifecycleTransition(status) {
    if (status.status === 'completed')
        return 'completed';
    if (status.status === 'failed')
        return 'failed';
    return 'continue';
}
