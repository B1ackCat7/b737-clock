# B737 Clock Control: setup and clock operation

This guide covers the **Aviation 1 consumer replica** and the browser control tool. The physical instructions paraphrase the supplied `737clock_manual.pdf`, whose printed panels are P1–P6, and `737clock_upgrade.pdf`. See [references and Boeing FCOM access](REFERENCES.md). Replica-specific alarms, audio, USB settings, and mode switches are not aircraft functions.

The seller warns that the replica contains real cockpit warning sounds: **do not bring it into a cockpit or switch it on aboard an aircraft.** It is not certified for aircraft use. [R1, P1/P6]

## Open the tool on a Mac

You need the replica clock, a working USB **data** cable, a Mac that exposes its USB serial adapter, and desktop Google Chrome or Microsoft Edge with Web Serial enabled. The tested adapter identifies as CH340 (`1a86:7523`). An adapter appearing in macOS does not by itself prove that the clock is answering.

### Downloaded Mac package

1. Download **737-clock-mac-v1.1.0.zip** from the [v1.1.0 release](https://github.com/B1ackCat7/b737-clock/releases/tag/v1.1.0).
2. Extract it, keeping all files together in **737 Clock Control**.
3. Open **Start Clock Portal.command**. This needs Python 3 available as `python3`. If it is absent, install Python 3 from [python.org](https://www.python.org/downloads/macos/) and retry.
4. Leave its Terminal window open. The launcher opens Chrome, or Edge if Chrome is absent, at **http://127.0.0.1:7370**. If neither is installed, open that address in a supported desktop browser yourself.
5. Stop the local server with **Control-C** in Terminal when finished.

If macOS will not open the command file, review the source first, then use Terminal:

```sh
cd "/path/to/737 Clock Control"
python3 launcher.py
```

Replace the example path with the extracted folder's actual location. You can drag the folder into Terminal after typing `cd ` to insert its path. Do not open `dist/index.html` directly. Python serves files on this Mac only; it does not communicate with the serial device. The package is a browser app with a launcher, not a signed native Mac application.

### A hosted copy

Open a trusted HTTPS deployment of this tool directly in Chrome or Edge. A hosted copy requires no Python. The clock must be connected to **the computer running that browser**. Website hosting does not provide unattended or remote device control. A preview embedded in another app may block USB permissions; open the site's full URL as a top-level browser page. [R4]

## Connect to the clock

1. Plug the USB data cable into the clock and the Mac. Turn the clock's rear **POWER** switch **ON** and confirm a lit front display. The vendor's Windows guide also requires data connection and power before connecting its software. [R1, P2–P3; R2, steps 1–2]
2. Close other serial or clock applications and other browser tabs using the clock.
3. Choose **9,600 baud · legacy** for the tested older clock. If the hardware version is unknown, choose **Auto (new + legacy)**, which tries 57,600 and then 9,600. Select **57,600 baud · newer** only for a compatible newer unit.
4. Click **Connect clock**. Choose the clock's **USB Serial / USB-SERIAL CH340** entry in the browser chooser and allow access. If no suitable entry appears, try **Show all serial ports** and choose the clock carefully.
5. Wait for **Connected** and the detected baud rate. The app first requires a settings response with a valid checksum. Until then, writes remain disabled.

A previously granted, unambiguous matching clock port can be reused without a second chooser. **Disconnect** closes the serial connection. It does not power off the clock.

The read-back includes a single timestamp. Its MAN/UTC basis is not established for every firmware version, so the tool labels it as a reported clock response and does not replace your MAN/UTC drafts with it. The dial preview illustrates that response; it is not a live reproduction of the physical display or CHR/ET state.

## Change settings in the browser

**Online time sync:** Connect, then click [Sync from internet](ONLINE_TIME_SYNC.md) once to fetch public UTC and write both MAN and UTC. It uses TimeAPI.io over HTTPS and your Mac time zone for MAN. This feature is included in the v1.1.0 Mac download and the updated ChatGPT site.

Connecting and reading do not write settings. Each Write action sends only the named section; **Write time to clock** sends MAN followed by UTC as two separate commands. Start with **Try demo** if you want to learn the controls without USB writes, then exit demo to connect a real clock.

### MAN and UTC time/date

1. Check the Mac's date, time, and time zone first.
2. Click **Use Mac time** to prepare MAN from the Mac's local time and UTC from its UTC time. In this mode the app refreshes both timestamps immediately before sending.
3. Alternatively, edit either date/time yourself. This switches both fields to manual drafts; MAN and UTC can be entered independently. Date fields support years 1970–2225, reflecting the protocol's one-byte year offset.
4. Click **Write time to clock**. Check the result and the activity log. MAN may already have changed if the following UTC write fails.
5. Inspect both MAN and UTC on the physical clock using **TIME/DATE**. A single USB timestamp read cannot confirm both.

The replica does not receive the aircraft's GPS time source. Its manual says UTC correction uses the computer/data cable; the Windows guide provides separate local-time and UTC actions. Use Mac time uses your computer’s clock. Sync from internet offers explicit online sync through TimeAPI.io; neither option continuously synchronizes the clock. [R1, P6 note 4; R2, step 4]

### Alarm

Set the time, select a sound and volume, and click **Write alarm**. The rear **ALARM** switch must be **ON** for the replica's normal alarm mode. Sound **0** is muted/alarm off. Verify the alarm on the clock. [R1, P3–P4]

v1.1.0 exposes sound IDs **0–7** and volume **0–8**, following the supplied seller Chrome App. The printed replica manual lists sounds **0–10** and volume **1–31**. Those wider ranges are not verified over USB and are not offered for new writes. A larger value read from a device is identified as unverified rather than silently treated as a supported setting; select a supported sound and explicitly adjust volume before writing. Sound names in the interface follow the seller app and may differ between firmware revisions.

### Hourly chime

Select **On** or **Off** explicitly, then click **Write chime**. The current chime state is not reported over the implemented read-back. The rear ALARM switch must be ON for chimes in the replica's clock mode. [R1, P3–P5]

### Hand calibration

The field accepts an integer **0–255**, representing the raw offset byte used by the seller software. Although the existing interface labels this in degrees, the physical scale, direction, and effect are not independently verified. Record your original calibration and use this only if you understand your clock's adjustment. Offset read-back exists only for the supported 31-byte settings layout; the legacy 11-byte response does not report it. This is separate from starting or resetting CHR.

### Confirming a change and handling errors

The app waits for the acknowledgement corresponding to each command. Acknowledgement means the device accepted that protocol exchange; observe the physical clock to confirm the intended effect. Use **Read clock settings** to check fields the unit reports, such as alarm settings. Missing firmware information on a legacy unit is expected.

If a write times out, it may already have reached the device. The app disconnects and does **not** retry the write automatically. Check the clock, reconnect, and read its settings before deciding whether to send again. Only read requests are retried automatically. The **Activity log** records acknowledgements and errors for the current session and can be downloaded as JSON. Review a log before posting it publicly.

## Operate the physical clock

The following is based on the replica's supplied manual, including its historical China Southern 737 FCOM excerpt. It is a guide to this replica, not a verified current Boeing aircraft procedure. The official Boeing reference and access limits are explained in [REFERENCES.md](REFERENCES.md#r3-official-boeing-reference).

### Power and operating modes

| Rear control | Position | Replica behavior |
| --- | --- | --- |
| POWER | ON | Clock display operates; if blank, check power/charge |
| ALARM | ON | Clock mode: normal seconds indication, alarms and hourly chime available |
| ALARM | OFF | Simulation mode: aircraft-like display/CHR behavior; alarm and hourly chime disabled |

The rear USB connector is used for power/data. A charging indicator is provided. The manual recommends external USB power for sustained use with the display and speaker. Do not connect aircraft electrical power to this consumer replica. [R1, P2–P3/P5]

### Front-panel reference

| Button | Purpose |
| --- | --- |
| **TIME/DATE** | Select MAN time/date or UTC time/date |
| **SET** | Edit the displayed MAN time or date, moving to the next field on each press |
| **+ / −** | Adjust the flashing field |
| **CHR** | Start, stop, then reset the chronograph on successive presses |
| **ET** | Start or hold the elapsed-time timer; RUN/HLD identifies its state |
| **RESET** | Reset elapsed time; during a sounding alarm, a long press dismisses that day's alarm |

**TIME/DATE:** In clock mode, the manual describes MAN time → MAN date → UTC time → UTC date, then back to MAN. Its aircraft-style sequence is UTC time → UTC date → MAN time → MAN date. These are the same four pages in a cycle with different starting points; use the MAN/UTC label to identify the page. Dates alternate day/month and year. [R1, P3/P5–P6]

**Set MAN time:** Select MAN time; press SET for the flashing hour and use +/−. Press SET for minutes and adjust. Press SET again to resume running. **Set MAN date:** Select MAN date; use successive SET presses for day, month, year, then return to running, adjusting each with +/−. Avoid pausing more than one minute in setting mode: the manual says the clock reverts to the previous time/date. UTC is set through the computer rather than these MAN controls. [R1, P6]

**CHR:** Successive presses start, stop, and reset the chronograph and its seconds hand. Its lower display takes priority over ET. **ET:** Press to start (RUN), press again to hold (HLD), and use RESET to zero it. ET can continue in the background while CHR occupies the lower display and appears again after CHR resets. ET displays hours/minutes; CHR counts minutes with the seconds hand. The replica manual states a CHR minute limit of 99 and ET up to 99:59. [R1, P3/P5–P6]

### Set hourly chime with rear M1

With POWER and ALARM ON (clock mode):

1. Long-press rear **M1** to enter hourly-signal setup.
2. The upper display shows **HS** and the lower display **ON/OFF**.
3. Use front **+ / −** to choose the state.
4. Long-press M1 again to exit.

A short M1 press toggles the display backlight. The replica also has a front light sensor. [R1, P2/P4]

### Set an alarm with rear M2

With POWER and ALARM ON:

1. Long-press rear **M2** to enter alarm setup.
2. The upper display shows the alarm time. The lower display shows sound ID on the left and volume on the right.
3. Press **CHR** to move through hour, minute, sound, and volume; the selected field flashes. Use **+ / −** to adjust.
4. After setting volume, press **CHR** again to save. Neither display should still be flashing.
5. Long-press M2 to exit setup.

The printed manual specifies sound IDs 0–10 and volume 1–31 for front-panel setup. While the alarm sounds, **TIME/DATE** snoozes it for ten minutes, up to three times; long-press **RESET** to dismiss it until the next day. Sound 0 mutes the alarm, or rear ALARM OFF disables alarm/chime mode. [R1, P4]

### Audio input

A **3.5 mm AUX IN** connection lets the replica act as a speaker. The supplied Bluetooth receiver is a separate accessory that feeds AUX IN; Bluetooth audio is not a wireless route for this browser's clock commands. The manual says that with AUX plugged in, an alarm uses the internal beeper rather than the selected recorded melody. Follow the receiver's own instructions for pairing. [R1, P4]

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| USB access unavailable / Connect disabled | Open directly in desktop Chrome or Edge on HTTPS or localhost; check browser policy. Safari, Firefox, embedded previews, and insecure HTTP hosts do not satisfy this tool's requirements. |
| Device chooser is empty | Power ON, lit display, data cable, USB port/adapter, and **Show all serial ports**. Check macOS System Information → USB for the adapter. Do not install the supplied Windows `.exe` driver on a Mac. |
| Port detected but no clock reply | Try **9,600 baud · legacy**, then Auto for unknown hardware. Close competing serial software, check power and cable, and try a direct port. Port detection is distinct from a valid clock reply. |
| Permission denied / chooser cancelled | Click Connect again and explicitly select/allow the clock; inspect the browser's serial permissions or organizational policy. |
| Port busy / cannot open | Disconnect other sessions, close other serial apps, and retry in one browser tab. |
| Firmware says Not reported | Expected on the tested legacy 11-byte layout; it does not identify a firmware version. |
| Returned bytes but invalid settings | Download the activity log; include baud rate, browser/macOS version, and error when filing an issue. Do not infer compatibility solely from USB IDs. |
| Write timed out | The change may have applied. Check the clock, reconnect and read before retrying. |
| Alarm silent | Rear ALARM ON, sound not 0, suitable volume, correct alarm time, no active snooze; AUX input changes the sound path. |
| Localhost:7370 already occupied | Stop the earlier clock-portal Terminal window with Control-C and relaunch. |

Firmware updating is **not implemented**. The seller's upgrade guide describes a different Windows-only workflow; its firmware binaries and updater are not included in this release. [R2, step 3]

## What has been tested

The tested legacy clock returned valid settings at 9,600 baud. Reapplying its existing alarm values produced the expected acknowledgement and matching read-back. The project owner also tested the online-sync update and reported it working before v1.1.0. This does not establish every firmware’s behavior, independently measure timing accuracy, or verify chime/calibration effects. See [VALIDATION.md](VALIDATION.md) for automated tests and remaining physical checks.
