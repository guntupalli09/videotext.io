'use strict';

const nock = require('nock');
const FormData = require('form-data');
// form-data's FormData is a legacy (pre-Readable) combined-stream — unlike a
// real Node Readable it does not start flowing just because something
// attaches a 'data' listener; it needs an explicit .resume() (this is what
// zapier-platform-core's request client does internally for a stream body).
const getStream = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    stream.resume();
  });

const { appendFileField, resolveFileInput } = require('../lib/files');
const { includeApiKey } = require('../middleware');

describe('resolveFileInput', () => {
  it('accepts a plain URL string', () => {
    expect(resolveFileInput('https://example.com/a.mp4')).toEqual({ url: 'https://example.com/a.mp4', name: undefined });
  });

  it('accepts a { url, name } object', () => {
    expect(resolveFileInput({ url: 'https://example.com/a.mp4', name: 'a.mp4' })).toEqual({
      url: 'https://example.com/a.mp4',
      name: 'a.mp4',
    });
  });

  it('returns null for empty input', () => {
    expect(resolveFileInput(undefined)).toBeNull();
    expect(resolveFileInput(null)).toBeNull();
  });
});

describe('appendFileField', () => {
  afterEach(() => nock.cleanAll());

  it('downloads a file and appends it to the form, preserving filename and content-type', async () => {
    nock('https://drive.example.com')
      .get('/download/abc')
      .reply(200, 'hello world', {
        'content-type': 'video/mp4',
        'content-disposition': 'attachment; filename="my-video.mp4"',
      });

    const form = new FormData();
    const result = await appendFileField(form, 'file', 'https://drive.example.com/download/abc', { label: 'File' });

    expect(result.filename).toBe('my-video.mp4');
    expect(result.contentType).toBe('video/mp4');

    const body = await getStream(form);
    expect(body.toString()).toContain('hello world');
    expect(body.toString()).toContain('name="file"');
    expect(body.toString()).toContain('filename="my-video.mp4"');
  });

  it('follows redirects', async () => {
    nock('https://drive.example.com').get('/redirect').reply(302, undefined, { Location: 'https://drive.example.com/final' });
    nock('https://drive.example.com').get('/final').reply(200, 'redirected-content', { 'content-type': 'text/plain' });

    const form = new FormData();
    const result = await appendFileField(form, 'file', 'https://drive.example.com/redirect', { label: 'File' });
    expect(result.filename).toBe('redirect');
  });

  it('throws an actionable error when the field value is missing', async () => {
    const form = new FormData();
    await expect(appendFileField(form, 'video', undefined, { label: 'Video File' })).rejects.toThrow(/Video File is required/);
  });

  it('throws an actionable error for an inaccessible/expired file (403)', async () => {
    nock('https://drive.example.com').get('/expired').reply(403, 'forbidden');

    const form = new FormData();
    await expect(
      appendFileField(form, 'file', 'https://drive.example.com/expired', { label: 'File' })
    ).rejects.toThrow(/private, expired, or no longer exists/);
  });

  it('never includes the raw source URL in its error message', async () => {
    nock('https://drive.example.com').get('/secret?token=shh').reply(404);

    const form = new FormData();
    try {
      await appendFileField(form, 'file', 'https://drive.example.com/secret?token=shh', { label: 'File' });
      throw new Error('expected to throw');
    } catch (err) {
      expect(err.message).not.toContain('shh');
      expect(err.message).not.toContain('token=');
    }
  });
});

describe('includeApiKey middleware', () => {
  it('adds Authorization only for requests to the VideoText API base URL', () => {
    const bundle = { authData: { api_key: 'vt_live_secret' } };

    const apiRequest = { url: 'https://api.videotext.io/api/v1/me', headers: {} };
    expect(includeApiKey(apiRequest, {}, bundle).headers.Authorization).toBe('Bearer vt_live_secret');

    const fileRequest = { url: 'https://drive.example.com/download/abc', headers: {} };
    expect(includeApiKey(fileRequest, {}, bundle).headers.Authorization).toBeUndefined();
  });
});
