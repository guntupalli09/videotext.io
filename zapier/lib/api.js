'use strict';

const FormData = require('form-data');
const { BASE_URL, API_ORIGIN } = require('../constants');
const { appendFileField } = require('./files');
const { runAsyncJob } = require('./polling');

/**
 * Converts a relative `/api/download/...?jobToken=...` URL (see
 * docs/API_PRIVATE_BETA.md — download URLs are relative, authorized by the
 * `jobToken` query param) into an absolute, directly-clickable/fetchable
 * URL for downstream Zap steps. The query string (jobToken) is preserved
 * byte-for-byte — never stripped or re-encoded, since that token is what
 * authorizes anonymous access to the file. Already-absolute URLs pass
 * through unchanged.
 */
function absolutizeDownloadUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Applies absolutizeDownloadUrl to every known output-URL field on a job record. */
function shapeJobOutput(job) {
  if (!job) return job;
  const shaped = { ...job };
  for (const field of ['txt_url', 'srt_url', 'vtt_url', 'download_url']) {
    if (shaped[field]) shaped[field] = absolutizeDownloadUrl(shaped[field]);
  }
  return shaped;
}

/**
 * Submits a single-file operation. `fieldName` is always `"file"` for every
 * single-file /api/v1 route (see server/src/routes/apiV1.ts
 * mountSingleFileOperation — POST /transcriptions, /subtitles,
 * /subtitle-translations, /video-compressions all share it).
 *
 * `extraFields` are additional plain multipart body fields (e.g.
 * `targetLanguage` for subtitle-translations). This never includes
 * `toolType`/`operation`/`source` — the server always derives and forces
 * those itself (see apiOperations.ts) and ignores anything a client sends
 * for them, so this integration doesn't send them either.
 */
async function submitSingleFileJob(z, bundle, resourcePath, opts) {
  opts = opts || {};
  const form = new FormData();
  await appendFileField(form, 'file', bundle.inputData.file, { label: opts.fileLabel || 'File' });

  if (opts.extraFields) {
    for (const [key, value] of Object.entries(opts.extraFields)) {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    }
  }

  const job = await runAsyncJob(z, resourcePath, async () => {
    const response = await z.request({ url: `${BASE_URL}${resourcePath}`, method: 'POST', body: form });
    return response.data;
  });
  return shapeJobOutput(job);
}

/**
 * Submits a dual-file operation. `fields` is an ordered list of
 * `{ name, value, label, required }` — field names must match the exact
 * multipart names the backend expects: `video`/`subtitles` for both
 * subtitle-fixes (subtitles required, video optional) and subtitle-burns
 * (both required) — see server/src/services/dualFileIntake.ts.
 */
async function submitDualFileJob(z, bundle, resourcePath, fields) {
  // Validate every required field is present before downloading anything —
  // fail fast with a clear message instead of starting (and then aborting)
  // network transfers for a request that was never going to succeed.
  for (const f of fields) {
    const missing = f.value === undefined || f.value === null || f.value === '';
    if (missing && f.required) throw new Error(`${f.label} is required.`);
  }

  const form = new FormData();
  for (const f of fields) {
    if (f.value === undefined || f.value === null || f.value === '') continue;
    // eslint-disable-next-line no-await-in-loop
    await appendFileField(form, f.name, f.value, { label: f.label });
  }

  const job = await runAsyncJob(z, resourcePath, async () => {
    const response = await z.request({ url: `${BASE_URL}${resourcePath}`, method: 'POST', body: form });
    return response.data;
  });
  return shapeJobOutput(job);
}

async function getJob(z, resourcePath, id) {
  const response = await z.request({ url: `${BASE_URL}${resourcePath}/${encodeURIComponent(id)}` });
  return shapeJobOutput(response.data);
}

async function listJobs(z, resourcePath, params) {
  const response = await z.request({ url: `${BASE_URL}${resourcePath}`, params });
  return response.data;
}

module.exports = {
  absolutizeDownloadUrl,
  shapeJobOutput,
  submitSingleFileJob,
  submitDualFileJob,
  getJob,
  listJobs,
};
