import { COMMAND, datePayload } from './protocol.js?v=20261024';

export const TIME_SOURCE = Object.freeze({ name: 'TimeAPI.io', url: 'https://timeapi.io/api/time/current/zone?timeZone=UTC' });
export const MAX_ROUND_TRIP_MS = 2000;
export const MAX_SAMPLE_AGE_MS = 15000;

// The service explicitly returns UTC fields. Do not let Date.parse assume the
// Mac's local zone, or use the Mac wall clock to correct an online timestamp.
export function parseUtcResponse(data) {
  if (data?.timeZone !== 'UTC') throw new Error('The time service did not return UTC.');
  const fields = [data.year, data.month, data.day, data.hour, data.minute, data.seconds, data.milliSeconds];
  if (fields.some(n => !Number.isInteger(n))) throw new Error('The time service returned incomplete time fields.');
  const [year, month, day, hour, minute, second, millisecond] = fields;
  if (millisecond < 0 || millisecond > 999) throw new Error('Invalid service milliseconds.');
  const pad = n => String(n).padStart(2, '0');
  datePayload(`${year}-${pad(month)}-${pad(day)}`, `${pad(hour)}:${pad(minute)}:${pad(second)}`);
  return Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
}

export async function fetchOnlineTime({ fetchImpl = globalThis.fetch, now = () => performance.now(), timeoutMs = 5000, nonce = () => globalThis.crypto.randomUUID() } = {}) {
  const controller = new AbortController();
  // A nonce and no-store avoid reusing an old response without trusting Date.now.
  const url = `${TIME_SOURCE.url}&request=${encodeURIComponent(nonce())}`;
  const started = now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok) throw new Error(`Time service returned HTTP ${response.status}.`);
    if (Number(response.headers?.get('age') || 0) > 0) throw new Error('The time service returned a cached response.');
    const data = await response.json();
    const receivedAtMs = now();
    const roundTripMs = receivedAtMs - started;
    if (!Number.isFinite(roundTripMs) || roundTripMs < 0 || roundTripMs > MAX_ROUND_TRIP_MS) throw new Error('The time request was too slow for clock sync. Try again on a steadier connection.');
    const epochAtReceiptMs = parseUtcResponse(data) + roundTripMs / 2;
    return Object.freeze({ epochAtReceiptMs, receivedAtMs, roundTripMs, source: TIME_SOURCE.name });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Online time request timed out. No clock settings were sent.');
    throw new Error(`Online time unavailable: ${error.message} No clock settings were sent.`, { cause: error });
  } finally { clearTimeout(timer); }
}

export function onlineFields(sample, timeZone, monotonicNow = performance.now()) {
  const age = monotonicNow - sample.receivedAtMs;
  if (!Number.isFinite(age) || age < 0 || age > MAX_SAMPLE_AGE_MS) throw new Error('Online time sample expired. Fetch fresh time before writing.');
  const instant = new Date(sample.epochAtReceiptMs + age);
  const utc = { date: instant.toISOString().slice(0, 10), time: instant.toISOString().slice(11, 19) };
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const value = type => parts.find(p => p.type === type).value;
  const man = { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}:${value('second')}` };
  // Validate both before sending the first command, including zone/year edges.
  man.payload = datePayload(man.date, man.time); utc.payload = datePayload(utc.date, utc.time);
  return { man, utc };
}

export async function writeOnlineTime(sample, { write, timeZone, now = () => performance.now(), onFields = () => {} }) {
  let manAcknowledged = false;
  try {
    const first = onlineFields(sample, timeZone, now()); onFields(first);
    await write(COMMAND.MAN, first.man.payload, 'MAN time');
    manAcknowledged = true;
    // The MAN acknowledgement may take time: advance from the monotonic clock
    // immediately before UTC instead of reusing a timestamp from the first write.
    const second = onlineFields(sample, timeZone, now());
    const written = { man: first.man, utc: second.utc }; onFields(written);
    await write(COMMAND.UTC, second.utc.payload, 'UTC time');
    return written;
  } catch (error) {
    if (manAcknowledged) throw new Error(`MAN time was acknowledged, but UTC sync failed: ${error.message} Check both times on the clock before retrying.`, { cause: error });
    throw error;
  }
}
