'use strict';

process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const API_ORIGIN = 'https://api.videotext.io';

describe('subtitleBurn create', () => {
  afterEach(() => nock.cleanAll());

  it('requires both video and subtitles', async () => {
    await expect(
      appTester(App.creates.subtitleBurn.operation.perform, {
        authData: { api_key: 'vt_live_test' },
        inputData: { video: 'https://drive.example.com/video.mp4' },
      })
    ).rejects.toThrow(/Subtitle File is required/);

    await expect(
      appTester(App.creates.subtitleBurn.operation.perform, {
        authData: { api_key: 'vt_live_test' },
        inputData: { subtitles: 'https://drive.example.com/subs.srt' },
      })
    ).rejects.toThrow(/Video File is required/);
  });

  it('submits both files and returns a usable absolute MP4 download URL', async () => {
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'video', { 'content-type': 'video/mp4' });
    nock('https://drive.example.com').get('/subs.srt').reply(200, 'subs', { 'content-type': 'text/plain' });

    let postBody = '';
    nock(API_ORIGIN)
      .post('/api/v1/subtitle-burns')
      .reply(function (uri, body) {
        postBody = body;
        return [202, { id: 'burn_1', status: 'queued', operation: 'subtitle_burn', created_at: '2026-08-30T00:00:00.000Z' }];
      });
    nock(API_ORIGIN).get('/api/v1/subtitle-burns/burn_1').reply(200, {
      id: 'burn_1', status: 'completed', operation: 'subtitle_burn', filename: 'burn_1.mp4',
      download_url: '/api/download/burn_1.mp4?jobToken=tok',
      created_at: '2026-08-30T00:00:00.000Z', completed_at: '2026-08-30T00:00:05.000Z', failure_reason: null,
    });

    const bundle = {
      authData: { api_key: 'vt_live_test' },
      inputData: { video: 'https://drive.example.com/video.mp4', subtitles: 'https://drive.example.com/subs.srt' },
    };
    const result = await appTester(App.creates.subtitleBurn.operation.perform, bundle);

    expect(postBody).toContain('name="video"');
    expect(postBody).toContain('name="subtitles"');
    expect(result.download_url).toBe('https://api.videotext.io/api/download/burn_1.mp4?jobToken=tok');
  });
});
