'use strict';

// Keep the shared poll budget tiny so the "never finishes in time" test
// doesn't need to actually wait ~22s of real time.
process.env.VIDEOTEXT_ZAPIER_POLL_BUDGET_MS = '80';
process.env.VIDEOTEXT_ZAPIER_POLL_INTERVAL_MS = '10';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);

const API_ORIGIN = 'https://api.videotext.io';

describe('transcription create', () => {
  afterEach(() => nock.cleanAll());

  it('submits the file to POST /api/v1/transcriptions with field name "file" and polls to completion', async () => {
    nock('https://drive.example.com')
      .get('/video.mp4')
      .reply(200, 'fake-video-bytes', { 'content-type': 'video/mp4', 'content-disposition': 'attachment; filename="clip.mp4"' });

    let postBody = '';
    nock(API_ORIGIN)
      .post('/api/v1/transcriptions')
      .matchHeader('authorization', 'Bearer vt_live_test')
      .reply(function (uri, body) {
        postBody = body;
        return [202, { id: 'job_1', status: 'queued', operation: 'video_to_transcript', created_at: '2026-08-30T00:00:00.000Z' }];
      });

    nock(API_ORIGIN)
      .get('/api/v1/transcriptions/job_1')
      .reply(200, {
        id: 'job_1',
        status: 'completed',
        operation: 'video_to_transcript',
        tool_type: 'video-to-transcript',
        filename: 'job_1_transcript.txt',
        duration_seconds: 42,
        txt_url: '/api/download/job_1_transcript.txt?jobToken=tok123',
        srt_url: null,
        vtt_url: null,
        download_url: null,
        original_size_bytes: 1024,
        created_at: '2026-08-30T00:00:00.000Z',
        completed_at: '2026-08-30T00:00:05.000Z',
        failure_reason: null,
      });

    const bundle = {
      authData: { api_key: 'vt_live_test' },
      inputData: { file: 'https://drive.example.com/video.mp4' },
    };

    const result = await appTester(App.creates.transcription.operation.perform, bundle);

    expect(postBody).toContain('name="file"');
    expect(postBody).toContain('filename="clip.mp4"');
    expect(postBody).not.toContain('toolType');
    expect(postBody).not.toContain('operation');
    expect(postBody).not.toContain('source');

    expect(result.id).toBe('job_1');
    expect(result.status).toBe('completed');
    // relative download_url must be absolutized, query string preserved exactly
    expect(result.txt_url).toBe('https://api.videotext.io/api/download/job_1_transcript.txt?jobToken=tok123');
  });

  it('surfaces a failed job as a thrown, actionable error', async () => {
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'bytes', { 'content-type': 'video/mp4' });
    nock(API_ORIGIN)
      .post('/api/v1/transcriptions')
      .reply(202, { id: 'job_2', status: 'queued', operation: 'video_to_transcript', created_at: '2026-08-30T00:00:00.000Z' });
    nock(API_ORIGIN)
      .get('/api/v1/transcriptions/job_2')
      .reply(200, {
        id: 'job_2',
        status: 'failed',
        operation: 'video_to_transcript',
        filename: null,
        created_at: '2026-08-30T00:00:00.000Z',
        completed_at: '2026-08-30T00:00:05.000Z',
        failure_reason: 'Unsupported codec',
      });

    const bundle = {
      authData: { api_key: 'vt_live_test' },
      inputData: { file: 'https://drive.example.com/video.mp4' },
    };

    await expect(appTester(App.creates.transcription.operation.perform, bundle)).rejects.toThrow(/Unsupported codec/);
  });

  it('returns the still-processing job rather than hanging when it does not finish inside the poll budget', async () => {
    nock('https://drive.example.com').get('/video.mp4').reply(200, 'bytes', { 'content-type': 'video/mp4' });
    nock(API_ORIGIN)
      .post('/api/v1/transcriptions')
      .reply(202, { id: 'job_3', status: 'queued', operation: 'video_to_transcript', created_at: '2026-08-30T00:00:00.000Z' });
    // Always still processing — the budget (80ms) will be exhausted.
    nock(API_ORIGIN)
      .get('/api/v1/transcriptions/job_3')
      .times(20)
      .reply(200, { id: 'job_3', status: 'processing', operation: 'video_to_transcript', created_at: '2026-08-30T00:00:00.000Z', completed_at: null, failure_reason: null });

    const bundle = {
      authData: { api_key: 'vt_live_test' },
      inputData: { file: 'https://drive.example.com/video.mp4' },
    };

    const result = await appTester(App.creates.transcription.operation.perform, bundle);
    expect(result.id).toBe('job_3');
    expect(['queued', 'processing']).toContain(result.status);
  });

  it('fails fast with a clear error when the file field is missing', async () => {
    const bundle = { authData: { api_key: 'vt_live_test' }, inputData: {} };
    await expect(appTester(App.creates.transcription.operation.perform, bundle)).rejects.toThrow(/required/i);
  });
});
