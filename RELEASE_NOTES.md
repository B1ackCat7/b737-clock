First official public release of **B737 Clock Control**, preserving the current working browser interface and serial behavior.

### Mac quick start

Download **737-clock-mac-v1.0.0.zip**, extract it, and open **Start Clock Portal.command**. Python 3 and desktop Chrome or Edge are required. Connect the powered-on clock with a USB data cable, choose **9,600 baud · legacy** for the tested older unit (or Auto), then click **Connect clock** and allow the USB serial device.

- [Clock operating guide](https://github.com/B1ackCat7/b737-clock/blob/v1.0.0/docs/USER_GUIDE.md)
- [Manual sources and official Boeing FCOM access](https://github.com/B1ackCat7/b737-clock/blob/v1.0.0/docs/REFERENCES.md)
- [Validation and known limits](https://github.com/B1ackCat7/b737-clock/blob/v1.0.0/docs/VALIDATION.md)

All **18 automated tests pass**. A legacy clock returned settings at 9,600 baud and acknowledged an unchanged-value alarm write with matching read-back. Time/chime/calibration effects and the full browser-to-hardware permission flow remain unverified. Firmware flashing is not included.

The attached SHA256SUMS.txt covers the Mac ZIP. GitHub's generated Source code archives contain the source; the named Mac ZIP includes the launcher and built browser files. This is an independent replica utility, not an official Boeing product.
