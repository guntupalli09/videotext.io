'use strict';

process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const API_ORIGIN = 'https://api.videotext.io';

describe('videoCompression create', () => {
  afterEach(() => nock.cleanAll());

  it('submits to POST /api/v1/video-compressions and never fabricates compressed_size_bytes', async () => {
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'bytes', { 'content-type': 'video/mp4' });
    nock(API_ORIGIN).post('/api/v1/video-compressions').reply(202, { id: 'cmp_1', status: 'queued', operation: 'video_compression', created_at: '2026-08-30T00:00:00.000Z' });
    nock(API_ORIGIN).get('/api/v1/video-compressions/cmp_1').reply(200, {
      id: 'cmp_1',
      status: 'completed',
      operation: 'video_compression',
      filename: 'cmp_1.mp4',
      download_url: '/api/download/cmp_1.mp4?jobToken=tok',
      original_size_bytes: 5000,
      created_at: '2026-08-30T00:00:00.000Z',
      completed_at: '2026-08-30T00:00:03.000Z',
      failure_reason: null,
    });

    const bundle = { authData: { api_key: 'vt_live_test' }, inputData: { file: 'https://drive.example.com/video.mp4' } };
    const result = await appTester(App.creates.videoCompression.operation.perform, bundle);

    expect(result.download_url).toBe('https://api.videotext.io/api/download/cmp_1.mp4?jobToken=tok');
    expect(result.original_size_bytes).toBe(5000);
    expect(result.compressed_size_bytes).toBeUndefined();
  });
});
