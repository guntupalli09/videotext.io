'use strict';

// Friendly, user-facing messages for the VideoText /api/v1 error envelope
// `{ error: { code, message, request_id } }` — see docs/API_PRIVATE_BETA.md
// "Errors" table. Falls back to the API's own `message` for anything not
// explicitly mapped here (VALIDATION_ERROR, FILE_TOO_LARGE, etc.) so we never
// invent wording for a code we haven't audited.
const FRIENDLY_MESSAGES = {
  INVALID_API_KEY: 'Your VideoText API key is invalid. Reconnect your VideoText account with a valid API key.',
  API_KEY_REVOKED: 'This VideoText API key has been revoked. Generate a new key in VideoText Settings → Integrations → API Keys and reconnect.',
  UPGRADE_REQUIRED: 'The VideoText API requires a Pro plan. Upgrade your VideoText account to use this integration.',
  QUOTA_EXCEEDED: 'VideoText usage limit reached (daily imports, monthly minutes, or concurrent jobs). Try again later or upgrade your plan.',
  RATE_LIMITED: 'Too many requests to VideoText right now. This step will be retried automatically.',
  TRANSCRIPTION_NOT_FOUND: 'That VideoText job could not be found. It may belong to a different account or have been deleted.',
  FORBIDDEN: 'VideoText rejected this request (not authenticated, or a specific action check failed).',
};

/** Never let a raw API key reach a Zapier-visible error message or log line. */
function redactApiKey(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/vt_live_[A-Za-z0-9]+/g, 'vt_live_***REDACTED***');
}

/**
 * Builds a clean Error to throw from an action/trigger perform(). Always a
 * plain Error (Zapier surfaces `.message` to the user) with no stack trace,
 * DB detail, secrets, or internal implementation detail attached.
 */
function friendlyApiError(code, message, httpStatus) {
  const text = redactApiKey(FRIENDLY_MESSAGES[code] || message || `VideoText API error (${httpStatus || 'unknown status'})`);
  const err = new Error(text);
  err.name = 'VideoTextApiError';
  err.code = code;
  return err;
}

module.exports = { FRIENDLY_MESSAGES, redactApiKey, friendlyApiError };
