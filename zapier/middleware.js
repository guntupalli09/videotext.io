'use strict';

const { BASE_URL } = require('./constants');
const { friendlyApiError } = require('./lib/errors');

/**
 * Attaches `Authorization: Bearer vt_live_...` to requests aimed at the
 * VideoText API only. Never applied to other hosts — in particular, this
 * must never leak onto a signed file-download URL (Google Drive, Dropbox,
 * Zapier's own file storage) that a create's file field points at, which
 * would otherwise expose the VideoText API key to an unrelated third party.
 */
const includeApiKey = (request, z, bundle) => {
  const apiKey = bundle.authData && bundle.authData.api_key;
  if (apiKey && typeof request.url === 'string' && request.url.indexOf(BASE_URL) === 0) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${apiKey}`;
  }
  return request;
};

/**
 * Turns VideoText's `{ error: { code, message, request_id } }` envelope
 * (see docs/API_PRIVATE_BETA.md) into a clean, user-facing Zapier error
 * before Zapier's own generic throwForStatus middleware would throw a
 * bare "500/401/..." error. 429s are already handled (with proper
 * Retry-After-based retry) by Zapier's built-in throwForThrottling
 * middleware, which runs before this one, so they never reach here.
 */
const handleApiErrors = (response, z, bundle) => {
  if (typeof response.request?.url === 'string' && response.request.url.indexOf(BASE_URL) !== 0) {
    // Not a VideoText API call (e.g. downloading a source file) — leave as-is.
    return response;
  }

  const body = response.data;
  if (body && body.error && body.error.code) {
    throw friendlyApiError(body.error.code, body.error.message, response.status);
  }

  return response;
};

module.exports = {
  befores: [includeApiKey],
  afters: [handleApiErrors],
  includeApiKey,
  handleApiErrors,
};
