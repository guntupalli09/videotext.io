'use strict';

const authentication = require('./authentication');
const middleware = require('./middleware');
const creates = require('./creates');
const triggers = require('./triggers');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  beforeRequest: [...middleware.befores],
  afterResponse: [...middleware.afters],

  // Predictable input handling — don't let the platform silently strip/coerce
  // fields (e.g. the raw file URL string a create receives) before perform() sees them.
  flags: { cleanInputData: false },

  triggers,
  searches: {},
  creates,
  resources: {},
};
