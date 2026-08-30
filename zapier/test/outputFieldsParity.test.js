'use strict';

const App = require('../index');

// Zapier's Publishing validator compares the static `sample`, the declared
// `outputFields`, and a live perform() result for every trigger/create and
// flags any disagreement (see zapier/README.md and the Zapier publishing
// checklist). A field present in `sample` but missing from `outputFields`
// (or vice versa) is a real, catchable-without-live-data defect — this test
// enforces that invariant statically for every trigger and create so it
// can never silently regress again.
const operations = [
  ...Object.entries(App.triggers).map(([key, def]) => ['trigger', key, def.operation]),
  ...Object.entries(App.creates).map(([key, def]) => ['create', key, def.operation]),
];

describe('sample / outputFields parity', () => {
  it.each(operations)('%s "%s" — every sample key is declared in outputFields', (_kind, _key, operation) => {
    const declaredKeys = new Set(operation.outputFields.map((f) => f.key));
    const sampleKeys = Object.keys(operation.sample);

    const undeclared = sampleKeys.filter((k) => !declaredKeys.has(k));
    expect(undeclared).toEqual([]);
  });

  it.each(operations)('%s "%s" — outputFields has no duplicate keys', (_kind, _key, operation) => {
    const keys = operation.outputFields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
