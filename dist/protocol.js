// Ported from the seller's Chrome App v1.0.2, webpack modules 2 and 16.
export const BAUD_RATE = 57600;
export const COMMAND = Object.freeze({ READ: 1, SETTINGS: 2, UTC: 3, MAN: 9, ALARM: 11, CHIME: 13, OFFSET: 15 });
export function crc16(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
export function frame(command, payload = []) {
  if (!Number.isInteger(command) || command < 0 || command > 255) throw new Error('Invalid command.');
  if (payload.length > 128 || Array.from(payload).some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error('Invalid payload.');
  const packet = new Uint8Array(payload.length + 9);
  packet.set([0x5a, 0xaa, 0, packet.length, command]);
  packet.set(payload, 5);
  const crc = crc16(packet.subarray(2, packet.length - 4));
  packet.set([crc >> 8, crc & 255, 0xa5, 0x55], packet.length - 4);
  return packet;
}
// USB reads can split a packet at any byte or contain several packets.
export class PacketParser {
  constructor(onPacket, onInvalid = () => {}) { this.buffer = new Uint8Array(); this.onPacket = onPacket; this.onInvalid = onInvalid; }
  push(chunk) {
    const joined = new Uint8Array(this.buffer.length + chunk.length);
    joined.set(this.buffer); joined.set(chunk, this.buffer.length); this.buffer = joined;
    while (this.buffer.length >= 2) {
      if (this.buffer[0] !== 0x5a || this.buffer[1] !== 0xaa) { this.buffer = this.buffer.slice(1); continue; }
      if (this.buffer.length < 5) return;
      // DZZ_V1_8.bin TX routine at 0x08011a54 stores payload length in byte 2
      // rather than the length high byte. Windows ignores that byte; accept
      // only this exact variant and still require the full CRC and trailer.
      const variant = this.buffer[2] > 0 && this.buffer[2] + 9 === this.buffer[3];
      const length = variant ? this.buffer[3] : (this.buffer[2] << 8) | this.buffer[3];
      if (length < 9 || length > 137) { this.onInvalid('Invalid packet length'); this.buffer = this.buffer.slice(1); continue; }
      if (this.buffer.length < length) return;
      const packet = this.buffer.slice(0, length);
      const expected = (packet[length - 4] << 8) | packet[length - 3];
      if (packet[length - 2] !== 0xa5 || packet[length - 1] !== 0x55 || crc16(packet.subarray(2, length - 4)) !== expected) {
        this.onInvalid('Packet checksum or trailer rejected'); this.buffer = this.buffer.slice(1); continue;
      }
      this.buffer = this.buffer.slice(length);
      this.onPacket({ command: packet[4], payload: packet.slice(5, length - 4) });
    }
  }
}
export function datePayload(date, time) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!m || !t) throw new Error('Enter a complete date and time.');
  const [year, month, day] = m.slice(1).map(Number), [hour, minute, second] = [Number(t[1]), Number(t[2]), Number(t[3] || 0)];
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (year < 1970 || year > 2225 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error('Invalid date/time. Supported years: 1970–2225.');
  return [year - 1970, month, day, hour, minute, second];
}
export function integer(value, min, max, label) {
  const number = Number(value);
  if (String(value).trim() === '' || !Number.isInteger(number) || number < min || number > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  return number;
}
export function settings(payload) {
  if (![11, 18, 31].includes(payload.length)) throw new Error(`Clock returned an unsupported settings packet (${payload.length} bytes).`);
  const p = Uint8Array.from(payload);
  const date = `${1970 + p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
  const time = [p[3], p[4], p[5]].map(n => String(n).padStart(2, '0')).join(':');
  datePayload(date, time);
  return { date, time, alarmHour: p[6], alarmMinute: p[7], sound: p[8], volume: p[9], firmwareBytes: p.length >= 18 ? new DataView(p.buffer, p.byteOffset + 10, 4).getUint32(0) : null, firmware: p.length >= 18 ? `${p[15]}.${p[16]}.${p[17]}` : null, offset: p.length === 31 ? p[30] : null, profile: p.length === 11 ? 'legacy' : 'extended' };
}
