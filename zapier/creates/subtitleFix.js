'use strict';

const { submitDualFileJob } = require('../lib/api');

// POST /api/v1/subtitle-fixes — dual-file: "subtitles" required, "video"
// optional (scene-aware fixes when provided). See
// server/src/services/dualFileIntake.ts runFixSubtitlesDualIntake and
// docs/API_PRIVATE_BETA.md.
const perform = (z, bundle) =>
  submitDualFileJob(z, bundle, '/subtitle-fixes', [
    { name: 'subtitles', value: bundle.inputData.subtitles, label: 'Subtitle File', required: true },
    { name: 'video', value: bundle.inputData.video, label: 'Video File', required: false },
  ]);

const sample = {
  id: '12348',
  status: 'completed',
  operation: 'subtitle_fix',
  filename: 'd4e5f6a7-my-video_fixed.srt',
  srt_url: 'https://api.videotext.io/api/download/d4e5f6a7-my-video_fixed.srt?jobToken=sample-token',
  download_url: null,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:52:14.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'subtitleFix',
  noun: 'Subtitle Fix',
  display: {
    label: 'Fix Subtitles',
    description: 'Repair and improve an existing subtitle file.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'subtitles',
        label: 'Subtitle File',
        type: 'file',
        required: true,
        helpText: 'The subtitle file (.srt/.vtt) to auto-fix.',
      },
      {
        key: 'video',
        label: 'Video File (optional)',
        type: 'file',
        required: false,
        helpText: 'Optional source video — when provided, fixes are scene-aware (matches the web app\'s Auto Fix behavior with an attached video).',
      },
    ],
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'filename', label: 'Filename', type: 'string' },
      { key: 'srt_url', label: 'Subtitles (SRT) URL', type: 'string' },
      { key: 'vtt_url', label: 'Subtitles (VTT) URL', type: 'string' },
      { key: 'download_url', label: 'Download URL', type: 'string' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    ],
    sample,
  },
};
