'use strict';

process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const API_ORIGIN = 'https://api.videotext.io';

describe('subtitleFix create', () => {
  afterEach(() => nock.cleanAll());

  it('works with subtitles only (video optional and omitted)', async () => {
    nock('https://drive.example.com').get('/subs.srt').reply(200, 'subs', { 'content-type': 'text/plain' });

    let postBody = '';
    nock(API_ORIGIN)
      .post('/api/v1/subtitle-fixes')
      .reply(function (uri, body) {
        postBody = body;
        return [202, { id: 'fix_1', status: 'queued', operation: 'subtitle_fix', created_at: '2026-08-30T00:00:00.000Z' }];
      });
    nock(API_ORIGIN).get('/api/v1/subtitle-fixes/fix_1').reply(200, {
      id: 'fix_1', status: 'completed', operation: 'subtitle_fix', filename: 'fix_1.srt',
      srt_url: '/api/download/fix_1.srt?jobToken=tok', download_url: null,
      created_at: '2026-08-30T00:00:00.000Z', completed_at: '2026-08-30T00:00:02.000Z', failure_reason: null,
    });

    const bundle = { authData: { api_key: 'vt_live_test' }, inputData: { subtitles: 'https://drive.example.com/subs.srt' } };
    const result = await appTester(App.creates.subtitleFix.operation.perform, bundle);

    expect(postBody).toContain('name="subtitles"');
    expect(postBody).not.toContain('name="video"');
    expect(result.status).toBe('completed');
  });

  it('includes the optional video field for scene-aware fixes when provided', async () => {
    nock('https://drive.example.com').get('/subs.srt').reply(200, 'subs', { 'content-type': 'text/plain' });
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'video', { 'content-type': 'video/mp4' });

    let postBody = '';
    nock(API_ORIGIN)
      .post('/api/v1/subtitle-fixes')
      .reply(function (uri, body) {
        postBody = body;
        return [202, { id: 'fix_2', status: 'queued', operation: 'subtitle_fix', created_at: '2026-08-30T00:00:00.000Z' }];
      });
    nock(API_ORIGIN).get('/api/v1/subtitle-fixes/fix_2').reply(200, {
      id: 'fix_2', status: 'completed', operation: 'subtitle_fix', filename: 'fix_2.srt',
      srt_url: '/api/download/fix_2.srt?jobToken=tok', download_url: null,
      created_at: '2026-08-30T00:00:00.000Z', completed_at: '2026-08-30T00:00:02.000Z', failure_reason: null,
    });

    const bundle = {
      authData: { api_key: 'vt_live_test' },
      inputData: { subtitles: 'https://drive.example.com/subs.srt', video: 'https://drive.example.com/video.mp4' },
    };
    await appTester(App.creates.subtitleFix.operation.perform, bundle);

    expect(postBody).toContain('name="subtitles"');
    expect(postBody).toContain('name="video"');
  });

  it('requires the subtitle file', async () => {
    const bundle = { authData: { api_key: 'vt_live_test' }, inputData: {} };
    await expect(appTester(App.creates.subtitleFix.operation.perform, bundle)).rejects.toThrow(/Subtitle File is required/);
  });
});
