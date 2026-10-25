import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMAND } from '../dist/protocol.js';
import { TIME_SOURCE, parseUtcResponse, fetchOnlineTime, onlineFields, writeOnlineTime, MAX_SAMPLE_AGE_MS } from '../dist/online-time.js';
const data = { year: 2026, month: 10, day: 25, hour: 0, minute: 0, seconds: 0, milliSeconds: 0, timeZone: 'UTC' };
const epoch = Date.UTC(2026, 9, 25);
const sample = { epochAtReceiptMs: epoch, receivedAtMs: 100, roundTripMs: 100, source: TIME_SOURCE.name };
function response(body = data, extra = {}) { return { ok: true, headers: { get: () => null }, async json() { return body; }, ...extra }; }

test('service UTC fields are parsed independently of the Mac clock and local zone', () => {
  assert.equal(parseUtcResponse(data), epoch);
  for (const bad of [{ ...data, timeZone: 'America/Toronto' }, { ...data, day: 32 }, { ...data, year: 1969 }, { ...data, hour: 24 }, { ...data, milliSeconds: 1000 }, { ...data, seconds: null }]) assert.throws(() => parseUtcResponse(bad));
});
test('fresh HTTPS request omits credentials, bypasses cache, and compensates half the measured delay', async () => {
  let count = 0;
  const result = await fetchOnlineTime({ now: () => [100,300][count++], nonce: () => 'test-nonce', fetchImpl: async (url, options) => {
    assert.equal(url, TIME_SOURCE.url + '&request=test-nonce');
    assert.equal(options.cache, 'no-store'); assert.equal(options.credentials, 'omit');
    assert.equal(options.mode, 'cors'); assert.equal(options.referrerPolicy, 'no-referrer');
    return response();
  } });
  assert.equal(result.epochAtReceiptMs, epoch + 100); assert.equal(result.receivedAtMs, 300); assert.equal(result.roundTripMs, 200);
});
test('network, HTTP, cached, invalid, and slow time responses reject before returning a writable sample', async () => {
  for (const fetchImpl of [async () => { throw new TypeError('Failed to fetch'); }, async () => response(data, { ok:false,status:429 }), async () => response(data, { headers:{ get: () => '12' } }), async () => response({ ...data,timeZone:'wrong' })]) {
    await assert.rejects(fetchOnlineTime({ fetchImpl, now: () => 100, nonce: () => 'test' }), /No clock settings were sent/);
  }
  let count = 0;
  await assert.rejects(fetchOnlineTime({ fetchImpl: async () => response(), now: () => [0,2001][count++], nonce: () => 'test' }), /too slow/);
});
test('the request timeout aborts the fetch and does not substitute the Mac clock', async () => {
  await assert.rejects(fetchOnlineTime({ timeoutMs: 10, nonce: () => 'test', fetchImpl: (url, { signal }) => new Promise((resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); }) }), /timed out.*No clock settings/);
});
test('MAN and UTC have independent dates across midnight and use the selected zone', () => {
  const fields = onlineFields(sample, 'America/Toronto', 100);
  assert.deepEqual(fields.man.payload, [56,10,24,20,0,0]); assert.deepEqual(fields.utc.payload, [56,10,25,0,0,0]);
  const dstBefore = { ...sample, epochAtReceiptMs: Date.UTC(2026,10,1,5,59,59) };
  const dstAfter = { ...sample, epochAtReceiptMs: Date.UTC(2026,10,1,6,0,0) };
  assert.equal(onlineFields(dstBefore, 'America/Toronto',100).man.time,'01:59:59');
  assert.equal(onlineFields(dstAfter, 'America/Toronto',100).man.time,'01:00:00');
});
test('stale or invalid monotonic samples and invalid time zones cannot produce payloads', () => {
  for (const now of [99,101+MAX_SAMPLE_AGE_MS,NaN]) assert.throws(() => onlineFields(sample,'UTC',now));
  assert.throws(() => onlineFields(sample,'not-a-zone',100));
});
test('one-click sync validates both clocks, writes in sequence, and advances UTC after MAN acknowledgement', async () => {
  const writes = []; let now = 100;
  const result = await writeOnlineTime(sample,{ timeZone:'America/Toronto',now:()=>now,write:async(command,payload)=>{ writes.push({command,payload}); now += 1500; } });
  assert.deepEqual(writes,[{ command:COMMAND.MAN,payload:[56,10,24,20,0,0] },{ command:COMMAND.UTC,payload:[56,10,25,0,0,1] }]);
  assert.equal(result.man.time,'20:00:00'); assert.equal(result.utc.time,'00:00:01');
});
test('a failed MAN write is not retried and never sends UTC', async () => {
  const writes=[];
  await assert.rejects(writeOnlineTime(sample,{ timeZone:'UTC',now:()=>100,write:async command=>{writes.push(command); throw new Error('uncertain write');} }),/uncertain write/);
  assert.deepEqual(writes,[COMMAND.MAN]);
});
test('a failed or expired second command reports the acknowledged MAN change and is not retried', async () => {
  const writes=[];
  await assert.rejects(writeOnlineTime(sample,{timeZone:'UTC',now:()=>100,write:async command=>{writes.push(command);if(command===COMMAND.UTC)throw new Error('timeout');}}),/MAN time was acknowledged, but UTC sync failed/);
  assert.deepEqual(writes,[COMMAND.MAN,COMMAND.UTC]);
  let now=100; const expired=[];
  await assert.rejects(writeOnlineTime(sample,{timeZone:'UTC',now:()=>now,write:async command=>{expired.push(command);now+=MAX_SAMPLE_AGE_MS+1;}}),/MAN time was acknowledged.*sample expired/);
  assert.deepEqual(expired,[COMMAND.MAN]);
});
test('invalid local year/date is rejected before either clock write',async()=>{
  let writes=0;
  await assert.rejects(writeOnlineTime({...sample,epochAtReceiptMs:Date.UTC(1970,0,1)},{timeZone:'America/Toronto',now:()=>100,write:async()=>{writes++;}}),/1970/);
  assert.equal(writes,0);
});
