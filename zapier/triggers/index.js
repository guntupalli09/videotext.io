'use strict';

const newCompletedTranscription = require('./newCompletedTranscription');

module.exports = {
  [newCompletedTranscription.key]: newCompletedTranscription,
};
