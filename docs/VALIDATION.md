# v1.0.0 validation and known limits

Release date: 2026-10-21. This release preserves the existing repaired interface and serial implementation. Packaging, version metadata, and public documentation were prepared separately from the private hosting history.

## Automated checks

All **18 Node tests** pass with `node --test tests/*.test.js`:

- Known CRC vectors and exact read frame.
- Packet splits, concatenated reads, malformed frames, CRC/trailer rejection, and resynchronization.
- Date validity, leap years, year limits, and UTC rollover.
- Extended settings and the real 11-byte legacy capture, without invented metadata.
- Identification before writes, read-only retry, matching acknowledgements, and malformed identification rejection.
- Auto baud fallback, port permission reuse, cleanup after failure, and unplug handling.
- Browser support, secure-origin, embedding-policy, and chooser-error diagnostics.

Release preparation also checks Python syntax, Mac ZIP contents and launcher mode, source/package checksums, and equality of the six browser source files with the current working version. Unit tests use serial mocks; they do not exercise browser permissions or physical mechanics.

## Observed hardware behavior

| Check | Result |
| --- | --- |
| Mac USB/serial enumeration | CH340 `1a86:7523` detected |
| Read at 57,600 on the tested unit | No reply |
| Read at 9,600, DTR/RTS asserted | Valid settings reply, 11-byte payload |
| Alarm write acknowledgement | Existing `[hour=0, minute=0, sound=1, volume=1]` reapplied unchanged; matching command-12 ACK |
| Alarm read-back | Same four alarm values |
| Physical time/chime/offset changes | Not performed |
| Newer 57,600 hardware | Not physically tested |
| Firmware update | Not implemented or performed |
| Complete browser permission → physical write | Requires user interaction; not claimed as verified in automation |

The cable was changed during diagnosis, but the original cable was not tested at the successful 9,600 baud rate. The evidence establishes a baud/layout mismatch; it does not prove the original cable was faulty.

## Browser checks

The existing release interface was visually checked in Edge at desktop and 390-pixel phone widths. Demo connect/disconnect, simulated writes, time drafts, activity log, and permission-cancellation messaging were checked. No relevant browser errors or horizontal overflow were observed. The screenshot in the README shows simulated settings, not a USB session. Mobile display support does not establish mobile hardware access.

## Remaining limitations

- Physical verification covers one legacy unit and the unchanged-value alarm round trip, not all settings, firmware revisions, or operating systems.
- Firmware identity and the trailing byte are not reported/mapped on legacy hardware.
- A single returned timestamp cannot establish both MAN and UTC; chime read-back is unavailable, and offset read-back requires the supported 31-byte layout.
- The existing offset field says degrees, but the raw byte's physical meaning has not been verified.
- MAN/UTC writes are sequential, not atomic. A failed second command cannot undo an acknowledged first command.
- USB permission and compatibility depend on the desktop browser and Mac driver exposure. Static hosting alone cannot provide remote clock access.
- The supplied manual describes wider alarm ranges than the seller Chrome App. v1.0.0 preserves the app's 0–7 sound / 0–8 volume controls.

The release is the project's official v1.0.0 baseline; this label does not imply Boeing/manufacturer endorsement or removal of these limits.
