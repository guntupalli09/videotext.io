'use strict';

const transcription = require('./transcription');
const subtitles = require('./subtitles');
const subtitleTranslation = require('./subtitleTranslation');
const subtitleFix = require('./subtitleFix');
const subtitleBurn = require('./subtitleBurn');
const videoCompression = require('./videoCompression');

module.exports = {
  [transcription.key]: transcription,
  [subtitles.key]: subtitles,
  [subtitleTranslation.key]: subtitleTranslation,
  [subtitleFix.key]: subtitleFix,
  [subtitleBurn.key]: subtitleBurn,
  [videoCompression.key]: videoCompression,
};
