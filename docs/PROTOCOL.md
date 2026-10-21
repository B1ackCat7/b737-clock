# Serial protocol: v1.0.0 interoperability notes

These observations describe the supplied Aviation 1 replica and seller software, not a Boeing aircraft interface. See [sources](REFERENCES.md#r5-interoperability-investigation) and [validation](VALIDATION.md).

## Transport

The tested clock uses a CH340 adapter (`1a86:7523`) and responds at **9,600 baud**, 8 data bits, no parity, 1 stop bit, no hardware flow control, with DTR and RTS asserted. The newer seller software/firmware uses **57,600 baud**, 8N1; the Windows implementation asserts RTS and inherits DTR. This app mirrors those two profiles.

Auto mode tries 57,600 first, then closes and reopens the same chosen port at 9,600 if no valid identification arrives. Read requests can be retried once; writes are never automatically retried. CRC-valid supported settings are required before the app marks a connection ready.

## Framing

```text
5A AA length_hi length_lo command [payload] crc_hi crc_lo A5 55
```

Outgoing length is total frame size: payload size + 9. CRC-16/CCITT-FALSE uses polynomial `0x1021`, initial value `0xFFFF`, no reflection, and final XOR zero, covering the two length bytes, command, and payload. The read request is:

```text
5A AA 00 09 01 66 25 A5 55
```

Some incoming packets use byte 2 for payload length and byte 3 for total frame size. The parser accepts this exact relation (`byte2 + 9 == byte3`) while still requiring the expected trailer and valid CRC. Serial reads may split or combine frames; the parser buffers and resynchronizes.

| Request command | Payload | Expected reply |
| --- | --- | --- |
| 1 | Empty | 2: settings |
| 9 | year−1970, month, day, hour, minute, second | 10 |
| 3 | Same six fields for UTC | 4 |
| 11 | Alarm hour, minute, sound ID, volume | 12 |
| 13 | Chime 0/1, 0, 0, 0 | 14 |
| 15 | Unsigned offset byte, 0, 0, 0 | 16 |

Command 9 is MAN/local time. Years fit a one-byte offset from 1970, giving 1970–2225. Offset signedness beyond the observed unsigned encoding and its physical units are not established. A matching acknowledgement is necessary for success. A timed-out write closes the session because it may have reached the clock; reconnect and inspect before retrying.

## Settings payload layouts

Only lengths **11, 18, and 31** are accepted.

| Payload offsets (zero based) | Meaning | Layout |
| --- | --- | --- |
| 0–5 | year−1970, month, day, hour, minute, second | All |
| 6–9 | Alarm hour, minute, sound ID, volume | All |
| 10 | Unknown legacy trailing byte | 11 only |
| 10–13 | Firmware byte count, unsigned big-endian | 18/31 |
| 15–17 | Firmware version components | 18/31 |
| 30 | Hand offset | 31 only |

Other positions remain unspecified. Chime state is not decoded. The returned timestamp's time basis is unconfirmed across firmware versions: the extension treated it as local while the Windows guide illustrated UTC. The app does not infer both clocks from a single returned timestamp.

The legacy 11-byte reply has no firmware version or size. Its unknown final byte must not be interpreted as calibration or firmware data.

## Physical legacy fixture

A captured settings reply used by the tests is:

```text
5A AA 0B 14 02 38 0A 16 11 19 2C 00 00 01 01 FF 58 E5 A5 55
```

It has an 11-byte payload, valid CRC, and alarm values `[0, 0, 1, 1]`. Reapplying those same alarm values produced acknowledgement:

```text
5A AA 00 09 0C B7 88 A5 55
```

A subsequent read reported the same alarm values. No physical time, chime, offset, or firmware changes were sent in this validation. Support for extended layouts follows software inspection and tests, not a physical newer-clock test.
