'use strict';

process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const API_ORIGIN = 'https://api.videotext.io';

describe('subtitleTranslation create', () => {
  afterEach(() => nock.cleanAll());

  it('sends targetLanguage on the multipart body and preserves it after GET drops the field', async () => {
    nock('https://drive.example.com').get('/subs.srt').reply(200, 'subs', { 'content-type': 'text/plain' });

    let postBody = '';
    nock(API_ORIGIN)
      .post('/api/v1/subtitle-translations')
      .reply(function (uri, body) {
        postBody = body;
        return [202, {
          id: 'tr_1',
          status: 'queued',
          operation: 'subtitle_translation',
          created_at: '2026-08-30T00:00:00.000Z',
          target_language: 'Spanish',
        }];
      });

    // GET intentionally omits target_language (see docs/API_PRIVATE_BETA.md).
    nock(API_ORIGIN).get('/api/v1/subtitle-translations/tr_1').reply(200, {
      id: 'tr_1',
      status: 'completed',
      operation: 'subtitle_translation',
      filename: 'tr_1_es.srt',
      srt_url: '/api/download/tr_1_es.srt?jobToken=tok',
      download_url: null,
      created_at: '2026-08-30T00:00:00.000Z',
      completed_at: '2026-08-30T00:00:02.000Z',
      failure_reason: null,
    });

    const bundle = {
      authData: { api_key: 'vt_live_test' },
      inputData: { file: 'https://drive.example.com/subs.srt', targetLanguage: 'Spanish' },
    };
    const result = await appTester(App.creates.subtitleTranslation.operation.perform, bundle);

    expect(postBody).toContain('name="targetLanguage"');
    expect(postBody).toContain('Spanish');
    expect(result.target_language).toBe('Spanish');
    expect(result.srt_url).toBe('https://api.videotext.io/api/download/tr_1_es.srt?jobToken=tok');
  });
});
