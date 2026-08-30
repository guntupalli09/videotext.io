'use strict';

process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const API_ORIGIN = 'https://api.videotext.io';

describe('subtitles create', () => {
  afterEach(() => nock.cleanAll());

  it('submits to POST /api/v1/subtitles and returns the completed SRT output', async () => {
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'bytes', { 'content-type': 'video/mp4' });
    nock(API_ORIGIN).post('/api/v1/subtitles').reply(202, { id: 'sub_1', status: 'queued', operation: 'video_to_subtitles', created_at: '2026-08-30T00:00:00.000Z' });
    nock(API_ORIGIN).get('/api/v1/subtitles/sub_1').reply(200, {
      id: 'sub_1',
      status: 'completed',
      operation: 'video_to_subtitles',
      filename: 'sub_1.srt',
      srt_url: '/api/download/sub_1.srt?jobToken=tok',
      vtt_url: null,
      download_url: null,
      duration_seconds: 30,
      created_at: '2026-08-30T00:00:00.000Z',
      completed_at: '2026-08-30T00:00:02.000Z',
      failure_reason: null,
    });

    const bundle = { authData: { api_key: 'vt_live_test' }, inputData: { file: 'https://drive.example.com/video.mp4' } };
    const result = await appTester(App.creates.subtitles.operation.perform, bundle);
    expect(result.status).toBe('completed');
    expect(result.srt_url).toBe('https://api.videotext.io/api/download/sub_1.srt?jobToken=tok');
  });
});
