**B737 Clock Control v1.1.0** adds one-click online time sync while retaining Mac-time drafts, manual entry, and existing clock settings.

### New in v1.1.0

- **Sync from internet** fetches public UTC from TimeAPI.io over HTTPS and writes MAN and UTC in one action after connection. MAN uses your Mac's configured time zone.
- Estimate network delay and advance UTC immediately before its write, including time spent waiting for MAN acknowledgement.
- Reject failed, slow, malformed, cached, or stale responses without silently falling back to the Mac clock. Identify partial write failures and never automatically retry configuration writes.
- Updated operating instructions, Mac package, and ten additional automated tests.

### Mac quick start

Download **737-clock-mac-v1.1.0.zip**, extract it, and open **Start Clock Portal.command**. Python 3 and desktop Chrome or Edge are required. Connect the powered-on clock with a USB data cable, choose **9,600 baud · legacy** for the tested older unit (or Auto), and click **Connect clock**. Once connected, click **Sync from internet** and verify MAN and UTC with the physical TIME/DATE button. Try demo fetches real online time but sends no USB writes.

- [Online time-sync guide](https://github.com/B1ackCat7/b737-clock/blob/v1.1.0/docs/ONLINE_TIME_SYNC.md)
- [Full clock operating guide](https://github.com/B1ackCat7/b737-clock/blob/v1.1.0/docs/USER_GUIDE.md)
- [Validation and limits](https://github.com/B1ackCat7/b737-clock/blob/v1.1.0/docs/VALIDATION.md)

### Validation

All **28 automated tests pass**. Browser checks confirmed live time fetching and simulated writes locally and on the hosted site. The project owner tested the update, reported it working, and approved this release. Independent timing-accuracy measurements were not recorded; physical chime/calibration effects and newer hardware remain unverified.

This uses a public HTTPS time service, not direct NTP or NIST time.gov. Firmware flashing is not included. SHA256SUMS.txt covers the attached Mac ZIP. GitHub's generated Source code archives contain the source; the named Mac ZIP includes the launcher, browser files, and guides. This independent project is not affiliated with Boeing or the replica manufacturer.
