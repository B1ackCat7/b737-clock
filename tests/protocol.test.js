import test from 'node:test';
import assert from 'node:assert/strict';
import { crc16, frame, PacketParser, datePayload, settings, integer } from '../dist/protocol.js';
const hex = bytes => Buffer.from(bytes).toString('hex');
test('CCITT-FALSE known check vector and vendor read packet', () => {
  assert.equal(crc16(new TextEncoder().encode('123456789')), 0x29b1);
  assert.equal(hex(frame(1)), '5aaa0009016625a555');
});
test('all split points, byte-at-a-time and concatenated packets', () => {
  const packet = frame(11, [6, 30, 2, 4]);
  for (let split = 0; split <= packet.length; split++) {
    const result = []; const parser = new PacketParser(p => result.push(p));
    parser.push(packet.slice(0, split)); parser.push(packet.slice(split));
    assert.deepEqual(result, [{ command: 11, payload: new Uint8Array([6, 30, 2, 4]) }]);
  }
  const result = []; const parser = new PacketParser(p => result.push(p));
  for (const byte of packet) parser.push([byte]);
  parser.push(new Uint8Array([...frame(4), ...frame(10)]));
  assert.deepEqual(result.map(p => p.command), [11, 4, 10]);
});
test('reject corruption and recover through noise, invalid length and trailer', () => {
  const bad = frame(2, Array(18).fill(0)); bad[8] ^= 1;
  const trailer = frame(4); trailer[8] ^= 1;
  const result = [], errors = []; const parser = new PacketParser(p => result.push(p), e => errors.push(e));
  parser.push(new Uint8Array([0xff, 0x5a, 0, 0x5a, 0xaa, 0xff, 0xff, 0, ...bad, ...trailer, ...frame(16)]));
  assert.deepEqual(result.map(p => p.command), [16]); assert.equal(errors.length, 3);
});
test('real calendar validation, byte bounds and independent UTC date rollover', () => {
  assert.deepEqual(datePayload('2026-10-13', '23:59:58'), [56, 10, 13, 23, 59, 58]);
  assert.deepEqual(datePayload('2026-10-14', '03:59:58'), [56, 10, 14, 3, 59, 58]);
  assert.deepEqual(datePayload('2028-02-29', '00:00'), [58, 2, 29, 0, 0, 0]);
  for (const [date, time] of [['2026-02-29', '12:00'], ['2026-10-13', '24:00'], ['1969-12-31', '23:00'], ['2226-01-01', '00:00'], ['', '00:00']]) assert.throws(() => datePayload(date, time));
  for (const n of ['', '-1', '3.5', '9', 'NaN']) assert.throws(() => integer(n, 0, 8, 'Volume'));
  assert.throws(() => frame(11, [256])); assert.throws(() => frame(11, [-1]));
});
test('settings preserve unsigned firmware size and unverified device ranges', () => {
  const p = new Uint8Array([56, 10, 13, 12, 45, 30, 6, 10, 10, 31, 0x80, 0, 0, 1, 0, 1, 0, 8]);
  const value = settings(p); assert.equal(value.firmware, '1.0.8'); assert.equal(value.firmwareBytes, 2147483649);
  assert.equal(value.volume, 31); assert.equal(value.sound, 10); assert.equal(value.time, '12:45:30');
  assert.deepEqual(settings(Array.from(p)), value);
  assert.throws(() => settings(p.slice(0, 17)));
  p[1] = 99; assert.throws(() => settings(p));
});
test('DZZ 1.8 header variant is accepted only with valid CRC, and offset is decoded', () => {
  const payload = [56,10,13,12,0,0,6,0,2,4,0,0,249,180,0,1,0,8,...Array(12).fill(0),5];
  const packet = frame(2, payload); packet[2] = payload.length;
  const crc = crc16(packet.subarray(2, packet.length - 4)); packet[packet.length - 4] = crc >> 8; packet[packet.length - 3] = crc & 255;
  const result = []; const parser = new PacketParser(p => result.push(p));
  for (const b of packet) parser.push([b]);
  assert.equal(result.length, 1); assert.equal(settings(result[0].payload).offset, 5);
  packet[10] ^= 1; parser.push(packet); assert.equal(result.length, 1);
});
test('physical legacy capture: 9600 baud, 11-byte payload, no invented firmware metadata', () => {
  const results = []; const parser = new PacketParser(p => results.push(p));
  parser.push(Uint8Array.from(Buffer.from('5aaa0b1402380a1611192c00000101ff58e5a555', 'hex')));
  assert.equal(results.length, 1); assert.equal(results[0].command, 2);
  const value = settings(results[0].payload); assert.equal(value.profile, 'legacy');
  assert.equal(value.date, '2026-10-22'); assert.equal(value.time, '17:25:44');
  assert.equal(value.sound, 1); assert.equal(value.volume, 1);
  assert.equal(value.firmware, null); assert.equal(value.firmwareBytes, null); assert.equal(value.offset, null);
});
