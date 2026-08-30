'use strict';

const { submitSingleFileJob } = require('../lib/api');

// POST /api/v1/video-compressions — single "file" field, same pipeline as
// the web app's Compress Video (docs/API_PRIVATE_BETA.md).
const perform = (z, bundle) => submitSingleFileJob(z, bundle, '/video-compressions', { fileLabel: 'Video File' });

const sample = {
  id: '12350',
  status: 'completed',
  operation: 'video_compression',
  filename: 'f6a7b8c9-my-video_compressed.mp4',
  duration_seconds: 612,
  txt_url: null,
  srt_url: null,
  vtt_url: null,
  download_url: 'https://api.videotext.io/api/download/f6a7b8c9-my-video_compressed.mp4?jobToken=sample-token',
  original_size_bytes: 104857600,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:53:00.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'videoCompression',
  noun: 'Compressed Video',
  display: {
    label: 'Compress Video',
    description: 'Compress a video file using VideoText.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'file',
        label: 'Video File',
        type: 'file',
        required: true,
        helpText: 'The video file to compress.',
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
      { key: 'download_url', label: 'Compressed Video URL', type: 'string' },
      // Note: compressed output size is not persisted by the VideoText Job
      // table today (only the original upload size is) — see
      // docs/API_PRIVATE_BETA.md "Known limitations". Not invented here.
      { key: 'original_size_bytes', label: 'Original Size (bytes)', type: 'number' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
      { key: 'failure_reason', label: 'Failure Reason', type: 'string' },
    ],
    sample,
  },
};
