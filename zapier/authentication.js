'use strict';

const { BASE_URL } = require('./constants');

// GET /api/v1/me — see docs/API_PRIVATE_BETA.md. Requires HTTP 200; any
// auth failure (missing/invalid/revoked key, free-plan account) is turned
// into a friendly message by middleware.js's handleApiErrors before this
// ever throws a generic error.
const test = (z, bundle) => z.request({ url: `${BASE_URL}/me` });

module.exports = {
  type: 'custom',

  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText:
        'Paste your VideoText API key (starts with `vt_live_`). Create one from ' +
        'VideoText → Settings → Integrations → API Keys. API keys are a Pro-plan feature.',
    },
  ],

  test,

  // GET /api/v1/me returns { id, email, plan, usage }. Zapier reads the
  // test response into `json.<field>` for this template.
  connectionLabel: 'VideoText — {{json.email}}',
};
