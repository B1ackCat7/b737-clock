# v1.1.0 validation and known limits

Release date: 2026-10-24. v1.1.0 adds one-click online MAN/UTC sync while preserving the existing serial protocol, Mac/manual time controls, and other settings. The release retains the seven browser files from the tested update without further runtime changes.

## Automated checks

All **28 Node tests** pass with `node --test tests/*.test.js`: the original 18 protocol/serial/support tests plus ten online-time tests.

- Known CRC vectors, exact read frames, split/combined packets, malformed frame rejection, and resynchronization.
- Date validity, leap years, year limits, UTC rollover, supported settings layouts, and the captured legacy reply.
- Identification before writes, read-only retry, matching acknowledgements, baud fallback, permissions, cleanup, and unplug handling.
- Public UTC field validation, request cache/credential policy, network/HTTP/timeout rejection, and half-round-trip compensation.
- Independent MAN/UTC dates, DST changes, expired samples, sequential command timing, and partial failures without write retry.

Release preparation verifies Python syntax, documentation links, Mac ZIP integrity and launcher permissions, reproducible packaging, and equality of packaged browser files with the tested code. Unit tests use mocks; they do not establish browser permissions or physical timing accuracy.

## Hardware and user acceptance

| Check | Result |
| --- | --- |
| Legacy USB adapter | CH340 `1a86:7523` detected |
| Instrumented read at 9,600, DTR/RTS asserted | Valid settings reply, 11-byte payload |
| Instrumented read at 57,600 on that unit | No reply |
| Instrumented alarm round trip | Existing `[hour=0, minute=0, sound=1, volume=1]` reapplied unchanged; command-12 ACK and matching read-back |
| Online-sync acceptance | Project owner tested the update, reported it working, and approved release on 2026-10-24 |
| Independent physical timing-accuracy measurement | Not recorded |
| Physical chime/calibration effects | Not verified |
| Newer 57,600 hardware | Not physically tested |
| Firmware update | Not implemented or performed |
| Fully automated browser permission → physical write | Not claimed; browser chooser requires user interaction |

The acceptance report supports releasing the tested update. It does not establish compatibility with every firmware revision or a subsecond accuracy guarantee. The original cable was not tested at the successful baud rate; the earlier evidence establishes a baud/layout mismatch, not a proven cable fault.

## Browser checks

Edge demo tests fetched real public UTC locally and on the private ChatGPT site, populated MAN/UTC, and logged simulated writes with no relevant console errors. Mac-time and manual entry were also exercised. Desktop and 390-pixel mobile layouts were checked without horizontal overflow. The README screenshot shows the online-sync demo, not a USB session. Mobile layout support does not establish mobile hardware access.

## Remaining limitations

- HTTP time sync estimates network delay; asymmetric traffic, server processing, USB latency, and whole-second fields affect precision. See [online-sync timing](ONLINE_TIME_SYNC.md#time-source-and-timing).
- MAN and UTC are separate writes. A failed second command cannot undo an acknowledged first command; uncertain writes are not automatically retried.
- Legacy firmware identity and the trailing byte are not mapped. A single reported timestamp cannot establish both MAN and UTC; chime read-back is unavailable and offset read-back requires the supported 31-byte layout.
- The raw offset byte's physical scale/direction remains unverified, despite the existing field's degrees label.
- The app retains sound IDs 0–7 and volume 0–8 from the seller Chrome App; the printed manual's wider ranges are not verified over USB.
- USB access depends on desktop browser support, permissions, and Mac driver exposure. Static hosting does not provide remote access to another computer's clock.

This is an independent consumer-replica utility. Release numbering does not imply Boeing/manufacturer endorsement.
