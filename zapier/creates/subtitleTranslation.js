'use strict';

const { submitSingleFileJob } = require('../lib/api');
const { TARGET_LANGUAGES } = require('../lib/languages');

// POST /api/v1/subtitle-translations — "file" field (subtitle or .txt
// transcript) + "targetLanguage" body field, same pipeline as the web
// app's Translate Subtitles page (docs/API_PRIVATE_BETA.md).
const perform = (z, bundle) =>
  submitSingleFileJob(z, bundle, '/subtitle-translations', {
    fileLabel: 'Subtitle File',
    extraFields: { targetLanguage: bundle.inputData.targetLanguage },
  });

const sample = {
  id: '12347',
  status: 'completed',
  operation: 'subtitle_translation',
  filename: 'c3d4e5f6-my-video_es.srt',
  target_language: 'Spanish',
  duration_seconds: null,
  txt_url: null,
  srt_url: 'https://api.videotext.io/api/download/c3d4e5f6-my-video_es.srt?jobToken=sample-token',
  vtt_url: null,
  download_url: null,
  original_size_bytes: 4096,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:52:14.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'subtitleTranslation',
  noun: 'Translation',
  display: {
    label: 'Translate Subtitles',
    description: 'Translate a subtitle file into another language.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'file',
        label: 'Subtitle File',
        type: 'file',
        required: true,
        helpText: 'The subtitle (.srt/.vtt) or .txt transcript file to translate.',
      },
      {
        key: 'targetLanguage',
        label: 'Target Language',
        type: 'string',
        required: true,
        choices: TARGET_LANGUAGES,
        helpText: 'The language to translate the subtitles into.',
      },
    ],
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'operation', label: 'Operation', type: 'string' },
      { key: 'filename', label: 'Filename', type: 'string' },
      { key: 'target_language', label: 'Target Language', type: 'string' },
      { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
      { key: 'txt_url', label: 'Transcript (TXT) URL', type: 'string' },
      { key: 'srt_url', label: 'Subtitles (SRT) URL', type: 'string' },
      { key: 'vtt_url', label: 'Subtitles (VTT) URL', type: 'string' },
      { key: 'download_url', label: 'Download URL', type: 'string' },
      { key: 'original_size_bytes', label: 'Original Size (bytes)', type: 'number' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
      { key: 'failure_reason', label: 'Failure Reason', type: 'string' },
    ],
    sample,
  },
};
