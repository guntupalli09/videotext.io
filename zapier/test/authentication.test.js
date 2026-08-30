'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);

const API_ORIGIN = 'https://api.videotext.io';

describe('authentication', () => {
  afterEach(() => nock.cleanAll());

  it('passes with a valid API key and returns a connection label source', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/me')
      .matchHeader('authorization', 'Bearer vt_live_valid')
      .reply(200, { id: 'usr_1', email: 'user@example.com', plan: 'pro', usage: {} });

    const bundle = { authData: { api_key: 'vt_live_valid' } };
    const response = await appTester(App.authentication.test, bundle);
    expect(response.status).toBe(200);
    expect(response.data.email).toBe('user@example.com');
  });

  it('fails on an invalid API key (401 INVALID_API_KEY)', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/me')
      .reply(401, { error: { code: 'INVALID_API_KEY', message: 'Invalid API key.', request_id: 'req_1' } });

    const bundle = { authData: { api_key: 'vt_live_bad' } };
    await expect(appTester(App.authentication.test, bundle)).rejects.toThrow(/API key is invalid/i);
  });

  it('fails on a revoked API key (401 API_KEY_REVOKED)', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/me')
      .reply(401, { error: { code: 'API_KEY_REVOKED', message: 'This API key has been revoked.', request_id: 'req_2' } });

    const bundle = { authData: { api_key: 'vt_live_revoked' } };
    await expect(appTester(App.authentication.test, bundle)).rejects.toThrow(/revoked/i);
  });

  it('fails on a free-plan account (403 UPGRADE_REQUIRED)', async () => {
    nock(API_ORIGIN)
      .get('/api/v1/me')
      .reply(403, { error: { code: 'UPGRADE_REQUIRED', message: 'Pro required.', request_id: 'req_3' } });

    const bundle = { authData: { api_key: 'vt_live_free' } };
    await expect(appTester(App.authentication.test, bundle)).rejects.toThrow(/Pro plan/i);
  });

  it('never sends the API key to a non-VideoText host', async () => {
    const fileHost = nock('https://files.example.com')
      .get('/video.mp4')
      .reply(function () {
        expect(this.req.headers.authorization).toBeUndefined();
        return [200, 'binary-data', { 'content-type': 'video/mp4' }];
      });

    const { appendFileField } = require('../lib/files');
    const FormData = require('form-data');
    const form = new FormData();
    await appendFileField(form, 'file', 'https://files.example.com/video.mp4', { label: 'File' });

    expect(fileHost.isDone()).toBe(true);
  });
});
