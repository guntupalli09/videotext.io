'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const MAX_REDIRECTS = 5;

/**
 * Resolves a Zapier `type: 'file'` input value to `{ url, name }`.
 *
 * At runtime this is almost always a plain URL string — either a signed
 * URL to a file hydrated by an upstream Zap step (Google Drive, Dropbox,
 * Gmail, ...) or a URL the user typed directly (per
 * zapier-platform-schema: "Field type of `file` will accept either a file
 * object or a string. If a URL is provided in the string, Zapier will
 * automatically make a GET for that file."). Some sources instead hand
 * Zapier a `{ url, name/filename }`-shaped object; both are supported here.
 */
function resolveFileInput(value) {
  if (!value) return null;
  if (typeof value === 'string') return { url: value, name: undefined };
  if (typeof value === 'object') {
    const url = value.url || value.href;
    const name = value.name || value.filename;
    if (url) return { url, name };
  }
  return null;
}

function requestStream(fileUrl, redirectsLeft) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(fileUrl);
    } catch (err) {
      reject(new Error('The file provided to this step is not a valid, downloadable URL.'));
      return;
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      reject(new Error('The file provided to this step must be an http(s) URL.'));
      return;
    }

    const client = target.protocol === 'http:' ? http : https;
    const req = client.get(target, (res) => {
      const status = res.statusCode || 0;

      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        let nextUrl;
        try {
          nextUrl = new URL(res.headers.location, target).toString();
        } catch (err) {
          reject(new Error('VideoText could not follow the redirect for this file.'));
          return;
        }
        resolve(requestStream(nextUrl, redirectsLeft - 1));
        return;
      }

      if (status !== 200) {
        res.resume();
        if (status === 401 || status === 403 || status === 404 || status === 410) {
          reject(new Error('VideoText could not access the file for this step — the source link is private, expired, or no longer exists.'));
        } else {
          reject(new Error(`VideoText could not download the input file for this step (upstream returned HTTP ${status}).`));
        }
        return;
      }

      // Deliberately left in Node's default paused (non-flowing) mode — an
      // IncomingMessage never emits 'data' until something attaches a
      // listener or calls .resume(). We hand it to form-data as-is and let
      // it start the flow itself once the multipart body is actually read
      // (i.e. once the POST request goes out). Calling .resume() here
      // ourselves would be a race for multi-file uploads: the *next* file
      // field's download may still be in flight (still being awaited)
      // while this one starts draining with nothing yet subscribed to
      // consume it, silently losing bytes.
      resolve(res);
    });

    req.on('error', () => {
      reject(new Error('VideoText could not reach the file for this step — the source link may be unreachable or has expired.'));
    });
  });
}

function filenameFromHeadersOrUrl(fileUrl, headers, fallback) {
  const disposition = headers && headers['content-disposition'];
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch (err) {
        return match[1];
      }
    }
  }
  try {
    const pathname = new URL(fileUrl).pathname;
    const base = decodeURIComponent(pathname.split('/').pop() || '');
    if (base) return base;
  } catch (err) {
    // ignore — fall through to fallback
  }
  return fallback;
}

/**
 * Downloads a Zapier file-field value as a stream and appends it to a
 * `form-data` FormData instance under `fieldName`, matching the exact
 * multipart field name the VideoText API expects for that upload. Streams
 * directly into the multipart body — the file is never buffered whole in
 * memory. Preserves filename (from Content-Disposition, the source URL, or
 * the upstream app's own filename metadata) and Content-Type where known.
 *
 * Throws an actionable Error (never leaking the source URL, which may be
 * a signed/private link) for a missing field, an invalid file reference, or
 * a download failure.
 */
async function appendFileField(form, fieldName, fileInputValue, opts) {
  opts = opts || {};
  const resolved = resolveFileInput(fileInputValue);
  if (!resolved) {
    throw new Error(`${opts.label || fieldName} is required — connect a file from a previous step, or provide a direct file URL.`);
  }

  const stream = await requestStream(resolved.url, MAX_REDIRECTS);
  const filename = resolved.name || filenameFromHeadersOrUrl(resolved.url, stream.headers, opts.defaultFilename || fieldName);
  const contentType = (stream.headers && stream.headers['content-type']) || undefined;

  form.append(fieldName, stream, { filename, contentType });

  return { filename, contentType };
}

module.exports = { appendFileField, resolveFileInput, requestStream, filenameFromHeadersOrUrl };
