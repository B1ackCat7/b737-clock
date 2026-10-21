import test from 'node:test';
import assert from 'node:assert/strict';
import { ClockConnection } from '../dist/serial.js';
import { frame, settings } from '../dist/protocol.js';
function fakeSerial({ answer = true, malformed = false, dropFirst = false, noise = false, legacy = false } = {}) {
  const writes = [], signals = [], rates = []; let controller, closed = false, rate;
  const port = {
    async open(options) { rate = options.baudRate; rates.push(rate); this.readable = new ReadableStream({ start(c) { controller = c; } }); this.writable = new WritableStream({ write(data) {
      writes.push(Array.from(data));
      if (noise) controller.enqueue(new Uint8Array([0, 1, 2]));
      if (answer && (!legacy || rate === 9600) && !(dropFirst && writes.length === 1)) setTimeout(() => {
        const command = data[4]; const reply = command === 1 ? legacy ? Uint8Array.from(Buffer.from('5aaa0b1402380a1611192c00000101ff58e5a555', 'hex')) : frame(2, malformed ? [1] : [56,10,13,12,0,0,6,0,2,4,0,0,249,180,0,1,0,8]) : frame(command + 1);
        try { controller.enqueue(reply.slice(0, 4)); controller.enqueue(reply.slice(4)); } catch {}
      }, 1);
    } }); },
    async setSignals(value) { signals.push(value); },
    async close() { closed = true; }, getInfo() { return { usbVendorId: 0x1a86, usbProductId: 0x7523 }; }
  };
  return { serial: { async requestPort() { return port; } }, writes, signals, rates, port, unplug() { controller.close(); }, get closed() { return closed; } };
}
test('identify before writes, match acknowledgement, read again and close', async () => {
  const fake = fakeSerial(); const values = [];
  const client = new ClockConnection({ onSettings: p => values.push(settings(p)), onLog() {}, onClosed() {} }, fake.serial);
  await assert.rejects(client.write(11, [6,0,2,4]));
  await client.connect(); assert.equal(client.ready, true); assert.equal(values[0].firmware, '1.0.8');
  assert.deepEqual(fake.signals, [{ requestToSend: true }]);
  await client.write(11, [6,0,2,4]); await client.readSettings();
  assert.deepEqual(fake.writes.map(p => p[4]), [1,11,1]);
  await client.disconnect(); assert.equal(fake.closed, true); assert.equal(client.ready, false);
});
test('a lost initial read is retried once; configuration writes are never auto-retried', async () => {
  const fake = fakeSerial({ dropFirst: true });
  const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {}, settleMs: 0, readTimeoutMs: 15 }, fake.serial);
  await client.connect(); assert.deepEqual(fake.writes.map(p => p[4]), [1,1]);
  await client.write(11, [6,0,2,4]); assert.deepEqual(fake.writes.map(p => p[4]), [1,1,11]); await client.disconnect();
});
test('no received bytes is distinguished from an invalid reply and closes the port', async () => {
  for (const noise of [false, true]) {
    const fake = fakeSerial({ answer: false, noise });
    const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {}, settleMs: 0, readTimeoutMs: 10 }, fake.serial);
    await assert.rejects(client.connect({ baudRate: 57600 }), noise ? /returned 6 bytes.*no valid/ : /18 request bytes.*0 bytes/);
    assert.equal(fake.closed, true); assert.equal(client.ready, false); assert.equal(client.pending, null);
  }
});
test('reuse only one previously granted exact clock adapter; all-ports still uses a chooser', async () => {
  const fake = fakeSerial(); let choosers = 0;
  fake.serial.getPorts = async () => [fake.port]; fake.serial.requestPort = async options => { choosers++; assert.deepEqual(options, {}); return fake.port; };
  const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {}, settleMs: 0 }, fake.serial);
  await client.connect(); assert.equal(choosers, 0); await client.disconnect();
  const second = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {}, settleMs: 0 }, fake.serial);
  await second.connect({ showAllPorts: true }); assert.equal(choosers, 1); await second.disconnect();
});
test('failed writer acquisition rejects the operation and clears its pending timer', async () => {
  const fake = fakeSerial(); const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {}, settleMs: 0 }, fake.serial);
  await client.connect(); const writer = fake.port.writable.getWriter();
  await assert.rejects(client.write(11, [6,0,2,4]), /locked/); assert.equal(client.pending, null);
  writer.releaseLock(); await client.disconnect();
});
test('malformed clock identification never enables writes', async () => {
  const fake = fakeSerial({ malformed: true });
  const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {} }, fake.serial);
  await assert.rejects(client.connect(), /unsupported settings/); assert.equal(client.ready, false); assert.equal(fake.closed, true);
});
test('auto detection reopens at 9600 and accepts the exact physical clock capture', async () => {
  const fake = fakeSerial({ legacy: true }); const values = [];
  const client = new ClockConnection({ onSettings: p => values.push(settings(p)), onLog() {}, onClosed() {}, settleMs: 0, readTimeoutMs: 10 }, fake.serial);
  const info = await client.connect(); assert.equal(info.baudRate, 9600); assert.equal(client.ready, true);
  assert.deepEqual(fake.rates, [57600,9600]); assert.equal(values[0].profile, 'legacy');
  assert.deepEqual(fake.signals[1], { dataTerminalReady: true, requestToSend: true });
  await client.write(11, [0,0,1,1]); await client.disconnect();
});
test('wrong acknowledgement cannot mark a write successful; timeout closes cleanly', async () => {
  const fake = fakeSerial(); const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed() {} }, fake.serial);
  await client.connect(); const response = client.request(11, [6,0,2,4], 16, 20);
  await assert.rejects(client.write(13, [1,0,0,0]), /Wait/);
  await assert.rejects(response, /No clock acknowledgement/); await client.disconnect(); assert.equal(fake.closed, true);
});
test('unplug rejects a pending write and disables the session', async () => {
  const fake = fakeSerial(); let closed;
  const whenClosed = new Promise(resolve => { closed = resolve; });
  const client = new ClockConnection({ onSettings: settings, onLog() {}, onClosed: closed }, fake.serial);
  await client.connect(); const response = client.request(11, [6,0,2,4], 16); fake.unplug();
  await assert.rejects(response, /disconnected/); await whenClosed; assert.equal(client.ready, false);
});
