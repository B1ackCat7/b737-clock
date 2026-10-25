B737 CLOCK CONTROL - OFFICIAL PROJECT RELEASE v1.1.0

1. Unzip the download fully, then open Start Clock Portal.command.
2. Python 3 must be available as python3. Leave Terminal open.
   Chrome or Edge opens http://127.0.0.1:7370.
3. Use a USB data cable, turn rear POWER ON, and check the display is lit.
4. For a legacy clock select 9,600 baud; otherwise choose Auto.
5. Click Connect clock and select the clock's USB Serial device.
   Writes become available only after a valid clock response.
6. Review each setting before clicking its Write button.

If macOS blocks the command file, review these files, open Terminal in
this extracted folder, and run:
  python3 launcher.py
Do not open dist/index.html directly. Safari does not expose Web Serial.
Stop with Control-C in Terminal. No firmware updating is included.

The local server serves files only. USB stays in your browser. No clock
settings are sent automatically. Try demo performs no USB writes.

See docs/USER_GUIDE.md for physical clock operation, alarms, and setup.
See docs/VALIDATION.md for tested hardware and remaining limitations.
Official project release (independent of Boeing and the manufacturer):
https://github.com/B1ackCat7/b737-clock/releases/tag/v1.1.0

ONLINE TIME SYNC
Connect first, then click Sync from internet to write MAN and UTC using
public HTTPS time from TimeAPI.io. MAN uses the Mac time zone. Try demo
fetches real time but sends no USB writes. See docs/ONLINE_TIME_SYNC.md.
The online-sync update was tested and approved by the project owner.
