'use strict';

// Production API base — see docs/API_PRIVATE_BETA.md and server/src/index.ts
// (`process.env.API_BASE_URL || 'https://api.videotext.io'`). Overridable for
// local/staging development against a different VideoText deployment.
const API_ORIGIN = (process.env.VIDEOTEXT_API_ORIGIN || 'https://api.videotext.io').replace(/\/+$/, '');
const BASE_URL = `${API_ORIGIN}/api/v1`;

module.exports = { API_ORIGIN, BASE_URL };
