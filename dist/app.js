import { COMMAND, datePayload, integer, settings } from './protocol.js?v=20261021';
import { ClockConnection } from './serial.js?v=20261021';
import { browserSupport, connectionError } from './support.js?v=20261021';
const $ = id => document.getElementById(id);
let connection = null, demo = false, connected = false, busy = false, macTime = true;
let usbWriteAttempted = false;
const entries = [];
const support = browserSupport();
const pad = n => String(n).padStart(2, '0');
function log(message, level = 'info') {
  const entry = { time: new Date().toISOString(), mode: demo ? 'demo' : 'usb', level, message };
  entries.push(entry); if (entries.length > 200) entries.shift();
  const item = document.createElement('li'); item.className = level;
  item.textContent = `${new Date(entry.time).toLocaleTimeString()} ${demo ? '[DEMO] ' : ''}${message}`;
  $('log').prepend(item); if ($('log').children.length > 200) $('log').lastChild.remove(); $('log-count').textContent = entries.length;
}
function notice(message, level = 'info') { $('notice').textContent = message; $('notice').className = `notice ${level}`; $('notice').hidden = false; }
function updateControls() {
  document.querySelectorAll('.write').forEach(button => { button.disabled = busy || (!demo && !connected); });
  $('read').disabled = busy || (!demo && !connected);
  $('connect').disabled = busy || !support.ready; $('demo').disabled = busy || connected;
  $('all-ports').disabled = busy || connected;
  $('baud-rate').disabled = busy || connected;
  $('connect').textContent = connected ? 'Disconnect' : 'Connect clock';
  $('demo').textContent = demo ? 'Exit demo' : 'Try demo';
}
function status(title, description, kind = '') { $('connection-status').textContent = title; $('connection-message').textContent = description; $('status-dot').className = `status-dot ${kind}`; }
function resetDevice() {
  $('chime').value = ''; $('offset').value = '';
  $('serial-rate').textContent = 'Auto detection';
  connected = false; $('firmware').textContent = '--'; $('device-time').textContent = '--'; $('preview-time').textContent = '--:--'; $('second-hand').style.transform = '';
  $('preview-description').textContent = 'Connect to read your clock.'; status('Disconnected', 'Plug in your clock to get started.'); updateControls();
}
function macDraft() {
  const now = new Date();
  $('man-date').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  $('man-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  $('utc-date').value = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  $('utc-time').value = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  macTime = true;
  $('time-source').textContent = `Draft from your Mac (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Not written yet.`;
}
function applySettings(payload) {
  try {
    const value = settings(payload);
    $('firmware').textContent = demo ? 'Demo only' : value.firmware || 'Not reported (legacy)';
    $('device-time').textContent = `${value.date} ${value.time}`;
    $('preview-time').textContent = value.time.slice(0, 5);
    $('second-hand').style.transformOrigin = '160px 160px';
    $('second-hand').style.transform = `rotate(${Number(value.time.slice(-2)) * 6}deg)`;
    $('preview-description').textContent = demo ? 'Simulated settings. No USB connection.' : 'Last reported timestamp. Time basis unconfirmed.';
    $('alarm-time').value = value.alarmHour <= 23 && value.alarmMinute <= 59 ? `${pad(value.alarmHour)}:${pad(value.alarmMinute)}` : '';
    // Firmware/manual ranges beyond the extension are surfaced, never silently clamped.
    $('sound').querySelector('[data-unknown]')?.remove();
    if (value.sound > 7) {
      const option = new Option(`Device sound ${value.sound} (unverified)`, String(value.sound)); option.dataset.unknown = 'true'; $('sound').append(option);
    }
    $('sound').value = String(value.sound);
    if (value.offset !== null) $('offset').value = String(value.offset);
    if (value.volume <= 8) { $('volume').value = value.volume; $('volume-value').textContent = `${value.volume} / 8`; }
    else { $('volume-value').textContent = `${value.volume} on device`; }
    $('alarm-note').textContent = value.sound > 7 || value.volume > 8 ? `Clock returned sound ${value.sound}, volume ${value.volume}. Choose supported sound 0–7 and volume 0–8 explicitly before writing.` : 'Alarm sounds play on the clock. Its rear alarm switch must be ON.';
    $('volume').dataset.unverified = value.volume > 8 ? 'true' : 'false';
    log(`${demo ? 'Simulated' : 'Device'} settings read (${value.profile}): ${value.firmware ? `firmware ${value.firmware}, ${value.firmwareBytes.toLocaleString()} firmware bytes` : 'firmware metadata not reported'}. Time drafts were not overwritten.`);
  } catch (error) { notice(error.message, 'error'); log(error.message, 'error'); throw error; }
}
function demoPayload() {
  const now = new Date();
  return [now.getFullYear() - 1970, now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), 6, 0, 2, 4, 0xff];
}
async function operation(action) {
  if (busy) return;
  busy = true; usbWriteAttempted = false; updateControls();
  try { await action(); }
  catch (error) {
    const message = connectionError(error);
    notice(message, 'error'); log(message, 'error');
    if (!connected && !demo) resetDevice();
    // After any uncertain write, close the session so late acknowledgements cannot be mistaken for a retry.
    if (connection && !demo && usbWriteAttempted) { await connection.disconnect(); connection = null; }
  } finally { busy = false; updateControls(); }
}
async function write(command, payload, label) {
  if (demo) { log(`Simulated ${label.toLowerCase()} write. No bytes sent to USB.`); return; }
  usbWriteAttempted = true;
  await connection.write(command, payload);
  log(`${label} acknowledged by the clock.`);
}
$('connect').addEventListener('click', () => operation(async () => {
  if (connected) { await connection.disconnect(); connection = null; notice('Clock disconnected.'); return; }
  demo = false; resetDevice(); status('Connecting', 'Select your clock in the browser chooser.');
  connection = new ClockConnection({ onSettings: applySettings, onLog: log, onClosed: resetDevice, onProgress: (title, description) => status(title, description) });
  const info = await connection.connect({ showAllPorts: $('all-ports').checked, baudRate: $('baud-rate').value }); connected = true;
  $('serial-rate').textContent = `${info.baudRate.toLocaleString()} baud`;
  status('Connected', `Clock identified at ${info.baudRate.toLocaleString()} baud.`, 'connected');
  notice('Clock connected. Review each section, then write the settings you want to change.');
}));
$('demo').addEventListener('click', () => {
  demo = !demo;
  if (demo) { status('Demo mode', 'Simulated clock · no USB writes', 'demo'); applySettings(demoPayload()); $('serial-rate').textContent = '9,600 baud (demo)'; notice('Demo mode: legacy-clock controls. Nothing will be sent to your clock.', 'demo'); }
  else { resetDevice(); notice('Demo ended. Connect your clock for live settings.'); }
  updateControls();
});
$('mac-time').addEventListener('click', () => { macDraft(); notice('MAN and UTC drafts use your Mac’s clock. Choose Write time to send them.'); });
for (const id of ['man-date', 'man-time', 'utc-date', 'utc-time']) $(id).addEventListener('input', () => { macTime = false; $('time-source').textContent = 'Manual draft. MAN and UTC are independent.'; });
$('volume').addEventListener('input', () => { $('volume').dataset.unverified = 'false'; $('volume-value').textContent = `${$('volume').value} / 8`; });
$('read').addEventListener('click', () => operation(async () => {
  if (demo) applySettings(demoPayload()); else await connection.readSettings();
  notice(demo ? 'Simulated settings read. No USB access.' : 'Clock settings refreshed. Time drafts and hourly chime were not overwritten.', demo ? 'demo' : 'info');
}));
function form(id, action) { $(id).addEventListener('submit', event => { event.preventDefault(); if (!demo && !connected) return; void operation(action); }); }
form('time-form', async () => {
  if (macTime) macDraft();
  // Validate both before sending either: USB writes are independent, not atomic.
  const man = datePayload($('man-date').value, $('man-time').value), utc = datePayload($('utc-date').value, $('utc-time').value);
  await write(COMMAND.MAN, man, 'MAN time');
  await write(COMMAND.UTC, utc, 'UTC time');
  notice(demo ? 'Demo: MAN and UTC writes simulated.' : 'Both MAN and UTC time writes acknowledged by the clock.', demo ? 'demo' : 'info');
  $('time-source').textContent = demo ? 'Simulated write. Your clock was not changed.' : 'Both time writes acknowledged. Verify on the clock.';
});
form('alarm-form', async () => {
  if ($('volume').dataset.unverified === 'true') throw new Error('Choose a volume from 0–8 explicitly before writing.');
  const match = /^(\d{2}):(\d{2})$/.exec($('alarm-time').value);
  if (!match) throw new Error('Choose a valid alarm time.');
  const payload = [integer(match[1], 0, 23, 'Alarm hour'), integer(match[2], 0, 59, 'Alarm minute'), integer($('sound').value, 0, 7, 'Sound'), integer($('volume').value, 0, 8, 'Volume')];
  await write(COMMAND.ALARM, payload, 'Alarm'); notice(demo ? 'Demo: alarm write simulated.' : 'Alarm settings acknowledged by the clock.', demo ? 'demo' : 'info');
});
form('chime-form', async () => { const value = integer($('chime').value, 0, 1, 'Hourly chime'); await write(COMMAND.CHIME, [value, 0, 0, 0], 'Hourly chime'); notice(demo ? 'Demo: chime write simulated.' : 'Hourly chime write acknowledged by the clock.', demo ? 'demo' : 'info'); });
form('offset-form', async () => { const value = integer($('offset').value, 0, 255, 'Offset'); await write(COMMAND.OFFSET, [value, 0, 0, 0], 'Hand offset'); notice(demo ? 'Demo: offset write simulated.' : 'Hand offset write acknowledged by the clock.', demo ? 'demo' : 'info'); });
$('download-log').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = '737-clock-session-log.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
for (let tick = 0; tick < 60; tick++) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); const angle = tick * Math.PI / 30;
  const outer = 116, inner = tick % 5 === 0 ? 103 : 109;
  line.setAttribute('x1', 160 + Math.sin(angle) * inner); line.setAttribute('y1', 160 - Math.cos(angle) * inner);
  line.setAttribute('x2', 160 + Math.sin(angle) * outer); line.setAttribute('y2', 160 - Math.cos(angle) * outer);
  line.setAttribute('stroke', '#e0dfcd'); line.setAttribute('stroke-width', tick % 5 === 0 ? 3 : 1.7); $('ticks').append(line);
}
macDraft(); updateControls();
$('browser-support').textContent = support.message;
if (['127.0.0.1', 'localhost'].includes(location.hostname)) $('local-download').hidden = true;
if (!support.ready) notice(`${support.message} Demo mode is still available.`, 'error');
// Disconnecting from the OS closes the read stream; readLoop cleans up and disables writes.
