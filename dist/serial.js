import { BAUD_RATE, COMMAND, PacketParser, frame } from './protocol.js?v=20261024';
export class ClockConnection {
  constructor({ onSettings, onLog, onClosed, onProgress = () => {}, settleMs = 300, readTimeoutMs = 1500 }, serial = globalThis.navigator?.serial) {
    this.serial = serial; this.onSettings = onSettings; this.onLog = onLog; this.onClosed = onClosed;
    this.port = null; this.reader = null; this.pending = null; this.closing = false; this.ready = false;
    this.onProgress = onProgress; this.settleMs = settleMs; this.readTimeoutMs = readTimeoutMs;
    this.receivedBytes = 0; this.invalidPackets = 0; this.sentBytes = 0;
  }
  async connect({ showAllPorts = false, baudRate = 'auto' } = {}) {
    if (!this.serial) throw new Error('Open this page in desktop Chrome on HTTPS or localhost.');
    this.onProgress('Choosing device', 'Select the clock’s USB Serial port.');
    // A previously permitted, unambiguous CH340 port can be reopened without
    // another chooser. The browser still owns and enforces its device grant.
    const granted = this.serial.getPorts ? await this.serial.getPorts() : [];
    const clocks = granted.filter(p => { const i = p.getInfo(); return i.usbVendorId === 0x1a86 && i.usbProductId === 0x7523; });
    this.port = !showAllPorts && clocks.length === 1 ? clocks[0] : await this.serial.requestPort(showAllPorts ? {} : { filters: [{ usbVendorId: 0x1a86, usbProductId: 0x7523 }] });
    const chosenPort = this.port;
    const rates = baudRate === 'auto' ? [BAUD_RATE, 9600] : [Number(baudRate)];
    if (rates.some(rate => ![BAUD_RATE, 9600].includes(rate))) throw new Error('Select Auto, 57,600, or 9,600 baud.');
    for (let rateIndex = 0; rateIndex < rates.length; rateIndex++) {
      this.port = chosenPort;
      const rate = rates[rateIndex]; this.baudRate = rate;
      let opened = false;
      try {
      this.onProgress('Opening USB port', `${rate.toLocaleString()} baud · 8 data bits · no parity · 1 stop bit`);
      await this.port.open({ baudRate: rate, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', bufferSize: 1024 });
      opened = true;
      this.closing = false;
      this.receivedBytes = 0; this.invalidPackets = 0; this.sentBytes = 0;
      this.parser = new PacketParser(packet => this.received(packet), message => { this.invalidPackets++; this.onLog(message, 'error'); });
      this.readTask = this.readLoop();
      // Windows CSerialPort::InitPort at 0x0041c908 explicitly enables RTS.
      // It inherits DTR, so do not invent a DTR reset pulse here.
      if (this.port.setSignals) {
        try {
          // The physical 9600-baud reply was captured with DTR and RTS asserted.
          const signals = rate === 9600 ? { dataTerminalReady: true, requestToSend: true } : { requestToSend: true };
          await this.port.setSignals(signals); this.onLog(rate === 9600 ? 'Legacy profile: DTR and RTS enabled.' : 'Windows-compatible RTS enabled; DTR left unchanged.');
        }
        catch (error) { this.onLog(`Adapter could not set RTS: ${error.message}. Trying the settings read.`, 'error'); }
      }
      if (this.settleMs) await new Promise(resolve => setTimeout(resolve, this.settleMs));
      this.onLog('USB port opened. Reading clock identification; no settings will be changed.');
      // Only the read command is retried. A missing write acknowledgement is
      // never permission to repeat a configuration command.
      for (let attempt = 1; attempt <= 2; attempt++) {
        this.onProgress('Reading clock', `${rate.toLocaleString()} baud · settings read ${attempt} of 2`);
        try { await this.request(COMMAND.READ, [], COMMAND.SETTINGS, this.readTimeoutMs); break; }
        catch (error) { if (error.code !== 'READ_TIMEOUT' || attempt === 2) throw error; this.onLog('No settings reply yet. Retrying the read command once.'); }
      }
      this.ready = true;
      this.onLog(`Clock identified at ${rate.toLocaleString()} baud: ${this.sentBytes} bytes sent, ${this.receivedBytes} bytes received.`);
      return { ...this.port.getInfo(), baudRate: rate };
    } catch (error) {
      if (!opened && error.name === 'NetworkError') error = new Error('The selected USB port could not open. Close other clock/serial tabs and apps, reconnect the USB cable, and try again.');
      const retryRate = error.code === 'READ_TIMEOUT' && rateIndex < rates.length - 1;
      await this.disconnect();
      if (retryRate) { this.onLog(`No identification at ${rate.toLocaleString()} baud. Trying the older 9,600-baud profile.`); continue; }
      throw error;
    }
    }
  }
  received(packet) {
    // Only one outstanding request; matching command acknowledgements are required.
    const pending = this.pending;
    if (packet.command === COMMAND.SETTINGS) {
      try { this.onSettings(packet.payload); }
      catch (error) { this.rejectPending(error); return; }
    }
    if (pending && packet.command === pending.expected) {
      clearTimeout(pending.timer); this.pending = null;
      pending.resolve(packet.payload);
    }
  }
  async readLoop() {
    try {
      this.reader = this.port.readable.getReader();
      while (!this.closing) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) { this.receivedBytes += value.length; this.onLog(`Received ${value.length} USB bytes.`); this.parser.push(value); }
      }
    } catch (error) { if (!this.closing) this.onLog(`Serial read failed: ${error.message}`, 'error'); }
    finally {
      this.reader?.releaseLock(); this.reader = null;
      if (!this.closing) { this.rejectPending(new Error('Clock disconnected.')); void this.disconnect(); }
    }
  }
  rejectPending(error) {
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
  }
  async request(command, payload, expected, timeout = 4000) {
    if (!this.port?.writable) throw new Error('Connect a clock first.');
    if (this.pending) throw new Error('Wait for the current clock operation to finish.');
    const packet = frame(command, payload);
    const response = new Promise((resolve, reject) => {
      this.pending = { expected, resolve, reject, timer: setTimeout(() => {
        this.pending = null;
        const message = command !== COMMAND.READ ? 'No clock acknowledgement. The write may have reached the device; check the clock before retrying.' : this.receivedBytes === 0 ? `The USB port opened and ${this.sentBytes} request bytes were sent, but the clock returned 0 bytes. Confirm the front display is lit and the rear power switch is ON; then check the cable/port and close other serial software. USB adapter detection alone does not confirm the clock is responding.` : `The clock returned ${this.receivedBytes} bytes, but no valid settings reply (${this.invalidPackets} rejected packets). Download the activity log for diagnosis.`;
        const error = new Error(message); error.code = command === COMMAND.READ ? 'READ_TIMEOUT' : 'WRITE_TIMEOUT'; reject(error);
      }, timeout) };
    });
    // Attach a handler before waiting on USB write, to avoid unhandled timeout rejections.
    response.catch(() => {});
    let writer;
    try { writer = this.port.writable.getWriter(); await writer.write(packet); this.sentBytes += packet.length; this.onLog(`Sent command ${command} (${packet.length} bytes).`); }
    catch (error) { this.rejectPending(error); }
    finally { writer?.releaseLock(); }
    return response;
  }
  async readSettings() { return this.request(COMMAND.READ, [], COMMAND.SETTINGS); }
  async write(command, payload) {
    if (!this.ready) throw new Error('A valid clock response is required before writing.');
    return this.request(command, payload, command + 1);
  }
  async disconnect() {
    if (this.closing) return;
    this.closing = true; this.ready = false;
    this.rejectPending(new Error('Connection closed.'));
    try { await this.reader?.cancel(); await this.readTask; await this.port?.close(); }
    catch (error) { this.onLog(`Closing port: ${error.message}`, 'error'); }
    finally { this.port = null; this.closing = false; this.onClosed(); }
  }
}
