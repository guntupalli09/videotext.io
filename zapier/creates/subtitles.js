'use strict';

const { submitSingleFileJob } = require('../lib/api');

// POST /api/v1/subtitles — single "file" field, same pipeline as the web
// app's Video-to-Subtitles (docs/API_PRIVATE_BETA.md).
const perform = (z, bundle) => submitSingleFileJob(z, bundle, '/subtitles', { fileLabel: 'Audio or Video File' });

const sample = {
  id: '12346',
  status: 'completed',
  operation: 'video_to_subtitles',
  filename: 'b2c3d4e5-my-video.srt',
  duration_seconds: 612,
  txt_url: null,
  srt_url: 'https://api.videotext.io/api/download/b2c3d4e5-my-video.srt?jobToken=sample-token',
  vtt_url: null,
  download_url: null,
  original_size_bytes: 104857600,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:52:14.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'subtitles',
  noun: 'Subtitles',
  display: {
    label: 'Generate Subtitles',
    description: 'Generate subtitle files from an audio or video file.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'file',
        label: 'Audio or Video File',
        type: 'file',
        required: true,
        helpText: 'The audio or video file to generate subtitles for.',
      },
    ],
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'filename', label: 'Filename', type: 'string' },
      { key: 'srt_url', label: 'Subtitles (SRT) URL', type: 'string' },
      { key: 'vtt_url', label: 'Subtitles (VTT) URL', type: 'string' },
      { key: 'download_url', label: 'Download URL', type: 'string' },
      { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    ],
    sample,
  },
};
