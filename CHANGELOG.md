# Changelog

## v1.0.0 — 2026-10-21

First official public project release, preserving the current browser interface and serial behavior.

- Browser-local USB controls for MAN/UTC, alarm, chime, and raw hand offset.
- Automatic 57,600/9,600-baud detection and explicit speed selection.
- Legacy 11-byte and extended 18-/31-byte settings support with strict CRC validation.
- Read-only retry, matching write acknowledgements, and cleanup after uncertain writes.
- Demo mode, session log export, local Mac launcher, and reproducible ZIP packaging.
- Clock operating guide based on supplied replica manuals, with source references and the official Boeing FCOM access route.

Physical validation covers settings reads and an unchanged-value alarm write/ACK/read-back on one 9,600-baud legacy clock. Time, chime, offset effects, newer hardware, and the full browser permission-to-write path remain unverified. Firmware flashing is excluded. See [validation](docs/VALIDATION.md).
