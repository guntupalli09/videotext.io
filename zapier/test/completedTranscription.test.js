'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
const API_ORIGIN = 'https://api.videotext.io';

function job(id, overrides) {
  return Object.assign(
    {
      id,
      status: 'completed',
      operation: 'video_to_transcript',
      tool_type: 'video-to-transcript',
      filename: `${id}.txt`,
      duration_seconds: 10,
      txt_url: `/api/download/${id}.txt?jobToken=tok`,
      srt_url: null,
      vtt_url: null,
      download_url: null,
      original_size_bytes: 100,
      created_at: '2026-08-30T00:00:00.000Z',
      completed_at: '2026-08-30T00:00:00.000Z',
      failure_reason: null,
    },
    overrides
  );
}

describe('newCompletedTranscription trigger', () => {
  afterEach(() => nock.cleanAll());

  it('returns items newest-first even though the API lists them oldest-first', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/transcriptions')
      .query(true)
      .reply(200, {
        data: [job('t1'), job('t2'), job('t3')], // ascending, per apiV1.ts keyset ordering
        pagination: { limit: 100, next_cursor: null, has_more: false },
      });

    const bundle = { authData: { api_key: 'vt_live_test' } };
    const result = await appTester(App.triggers.newCompletedTranscription.operation.perform, bundle);

    expect(result.map((r) => r.id)).toEqual(['t3', 't2', 't1']);
  });

  it('exposes stable, absolute-URL output for each item', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/transcriptions')
      .query(true)
      .reply(200, { data: [job('t1')], pagination: { limit: 100, next_cursor: null, has_more: false } });

    const bundle = { authData: { api_key: 'vt_live_test' } };
    const [result] = await appTester(App.triggers.newCompletedTranscription.operation.perform, bundle);

    expect(result.id).toBe('t1');
    expect(result.txt_url).toBe('https://api.videotext.io/api/download/t1.txt?jobToken=tok');
    // tool_type is a raw internal field (server/src/services/apiV1Format.ts) that
    // duplicates `operation` and is not declared in outputFields/sample — must not leak.
    expect(result).not.toHaveProperty('tool_type');
    expect(Object.keys(result).sort()).toEqual(
      App.triggers.newCompletedTranscription.operation.outputFields.map((f) => f.key).sort()
    );
  });

  it('defensively excludes anything not completed or carrying a failure_reason', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/transcriptions')
      .query(true)
      .reply(200, {
        data: [
          job('t1'),
          job('t2', { status: 'processing' }),
          job('t3', { failure_reason: 'timed out' }),
        ],
        pagination: { limit: 100, next_cursor: null, has_more: false },
      });

    const bundle = { authData: { api_key: 'vt_live_test' } };
    const result = await appTester(App.triggers.newCompletedTranscription.operation.perform, bundle);

    expect(result.map((r) => r.id)).toEqual(['t1']);
  });

  it('follows next_cursor across pages, bounded by MAX_PAGES', async () => {
    const page1 = nock(API_ORIGIN)
      .get('/api/v1/transcriptions')
      .query(true)
      .reply(200, { data: [job('t1')], pagination: { limit: 100, next_cursor: 'cursor-2', has_more: true } });
    const page2 = nock(API_ORIGIN)
      .get('/api/v1/transcriptions')
      .query(true)
      .reply(200, { data: [job('t2')], pagination: { limit: 100, next_cursor: null, has_more: false } });

    const bundle = { authData: { api_key: 'vt_live_test' } };
    const result = await appTester(App.triggers.newCompletedTranscription.operation.perform, bundle);

    expect(page1.isDone()).toBe(true);
    expect(page2.isDone()).toBe(true);
    expect(result.map((r) => r.id).sort()).toEqual(['t1', 't2']);
  });
});
