'use strict';

const { submitDualFileJob } = require('../lib/api');

// POST /api/v1/subtitle-burns — dual-file: "video" AND "subtitles" both
// required (the only production entry point for burn-subtitles). See
// server/src/services/dualFileIntake.ts runBurnSubtitlesIntake and
// docs/API_PRIVATE_BETA.md.
const perform = (z, bundle) =>
  submitDualFileJob(z, bundle, '/subtitle-burns', [
    { name: 'video', value: bundle.inputData.video, label: 'Video File', required: true },
    { name: 'subtitles', value: bundle.inputData.subtitles, label: 'Subtitle File', required: true },
  ]);

const sample = {
  id: '12349',
  status: 'completed',
  operation: 'subtitle_burn',
  filename: 'e5f6a7b8-my-video_burned.mp4',
  duration_seconds: 612,
  txt_url: null,
  srt_url: null,
  vtt_url: null,
  download_url: 'https://api.videotext.io/api/download/e5f6a7b8-my-video_burned.mp4?jobToken=sample-token',
  original_size_bytes: 104857600,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:55:14.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'subtitleBurn',
  noun: 'Burned Video',
  display: {
    label: 'Burn Subtitles Into Video',
    description: 'Permanently burn subtitles into a video.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'video',
        label: 'Video File',
        type: 'file',
        required: true,
        helpText: 'The video to burn subtitles into.',
      },
      {
        key: 'subtitles',
        label: 'Subtitle File',
        type: 'file',
        required: true,
        helpText: 'The subtitle file (.srt/.vtt) to burn in as open captions.',
      },
    ],
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'operation', label: 'Operation', type: 'string' },
      { key: 'filename', label: 'Filename', type: 'string' },
      { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
      { key: 'txt_url', label: 'Transcript (TXT) URL', type: 'string' },
      { key: 'srt_url', label: 'Subtitles (SRT) URL', type: 'string' },
      { key: 'vtt_url', label: 'Subtitles (VTT) URL', type: 'string' },
      { key: 'download_url', label: 'Video Download URL', type: 'string' },
      { key: 'original_size_bytes', label: 'Original Size (bytes)', type: 'number' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
      { key: 'failure_reason', label: 'Failure Reason', type: 'string' },
    ],
    sample,
  },
};
