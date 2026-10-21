import test from 'node:test';
import assert from 'node:assert/strict';
import { browserSupport, connectionError } from '../dist/support.js';
test('identify insecure origin, unsupported browser, embedding policy, and ready browser separately', () => {
  assert.match(browserSupport({ secure: false }).message, /HTTPS/);
  assert.match(browserSupport({ secure: true, serial: null }).message, /does not expose/);
  assert.match(browserSupport({ secure: true, serial: {}, policy: { allowsFeature: () => false } }).message, /blocks serial/);
  assert.equal(browserSupport({ secure: true, serial: {}, policy: { allowsFeature: () => true } }).ready, true);
});
test('chooser cancellation and permission rejection explain distinct next actions', () => {
  assert.match(connectionError({ name: 'NotFoundError' }), /chooser is empty/);
  assert.match(connectionError({ name: 'SecurityError' }), /denied serial permission/);
  assert.equal(connectionError(new Error('Specific USB error')), 'Specific USB error');
});
