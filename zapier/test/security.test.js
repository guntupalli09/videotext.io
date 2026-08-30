'use strict';

process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const { redactApiKey } = require('../lib/errors');
const API_ORIGIN = 'https://api.videotext.io';

describe('security: operation forcing and secret handling', () => {
  afterEach(() => nock.cleanAll());

  it('never sends toolType, operation, or source on any create — the server is the sole authority (see apiOperations.ts)', async () => {
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'bytes', { 'content-type': 'video/mp4' });

    let postBody = '';
    nock(API_ORIGIN)
      .post('/api/v1/transcriptions')
      .reply(function (uri, body) {
        postBody = body;
        return [202, { id: 'j1', status: 'queued', operation: 'video_to_transcript', created_at: '2026-08-30T00:00:00.000Z' }];
      });
    nock(API_ORIGIN)
      .get('/api/v1/transcriptions/j1')
      .reply(200, { id: 'j1', status: 'completed', operation: 'video_to_transcript', filename: null, created_at: '2026-08-30T00:00:00.000Z', completed_at: '2026-08-30T00:00:01.000Z', failure_reason: null });

    const bundle = { authData: { api_key: 'vt_live_test' }, inputData: { file: 'https://drive.example.com/video.mp4' } };
    await appTester(App.creates.transcription.operation.perform, bundle);

    expect(postBody).not.toMatch(/name="toolType"/);
    expect(postBody).not.toMatch(/name="operation"/);
    expect(postBody).not.toMatch(/name="source"/);
  });

  it('no create input field named toolType, operation, or source exists for a user to fill in', () => {
    for (const create of Object.values(App.creates)) {
      const keys = create.operation.inputFields.filter((f) => typeof f === 'object').map((f) => f.key);
      expect(keys).not.toContain('toolType');
      expect(keys).not.toContain('operation');
      expect(keys).not.toContain('source');
    }
  });

  it('redacts a raw vt_live_ key from any string', () => {
    const text = 'call failed for key vt_live_AbCd1234EfGh5678';
    expect(redactApiKey(text)).toBe('call failed for key vt_live_***REDACTED***');
  });

  it('never includes the raw API key in a thrown authentication error', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/me')
      .reply(401, { error: { code: 'INVALID_API_KEY', message: 'Invalid API key.', request_id: 'req_1' } });

    const bundle = { authData: { api_key: 'vt_live_SUPERSECRET123' } };
    try {
      await appTester(App.authentication.test, bundle);
      throw new Error('expected to throw');
    } catch (err) {
      expect(err.message).not.toContain('vt_live_SUPERSECRET123');
    }
  });
});
