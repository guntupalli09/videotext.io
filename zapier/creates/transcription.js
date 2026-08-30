'use strict';

const { submitSingleFileJob } = require('../lib/api');

// POST /api/v1/transcriptions — single "file" field. Same pipeline as the
// web app's Video-to-Transcript / Voice Recorder (see docs/API_PRIVATE_BETA.md,
// server/src/routes/apiV1.ts `mountSingleFileOperation('/transcriptions', 'video_to_transcript')`).
// No toolType/operation is sent — the endpoint itself is the operation.
const perform = (z, bundle) => submitSingleFileJob(z, bundle, '/transcriptions', { fileLabel: 'Audio or Video File' });

const sample = {
  id: '12345',
  status: 'completed',
  operation: 'video_to_transcript',
  filename: 'a1b2c3d4-my-video_transcript.txt',
  duration_seconds: 612,
  txt_url: 'https://api.videotext.io/api/download/a1b2c3d4-my-video_transcript.txt?jobToken=sample-token',
  srt_url: null,
  vtt_url: null,
  download_url: null,
  original_size_bytes: 104857600,
  created_at: '2026-08-30T05:50:00.000Z',
  completed_at: '2026-08-30T05:52:14.000Z',
  failure_reason: null,
};

module.exports = {
  key: 'transcription',
  noun: 'Transcription',
  display: {
    label: 'Transcribe Audio or Video',
    description: 'Convert an audio or video file into a transcript using VideoText.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'file',
        label: 'Audio or Video File',
        type: 'file',
        required: true,
        helpText: 'The audio or video file to transcribe (from a previous step, e.g. Google Drive or Dropbox).',
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
      { key: 'download_url', label: 'Download URL', type: 'string' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    ],
    sample,
  },
};
