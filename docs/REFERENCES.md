# Manual references and source boundaries

Manual sources reviewed for v1.0.0 on 2026-10-21; online-sync documentation added for v1.1.0 on 2026-10-24. Instructions are original paraphrases for this replica. No manual pages, vendor executables, firmware, or raw disassembly are redistributed.

## R1. Supplied Aviation 1 replica manual

**File supplied with the clock:** `737clock_manual.pdf`, Chinese title *BOEING 737NG 模拟时钟介绍与操作指引*. This is a two-page PDF containing six printed panels, P1–P6:

| Printed panel | Used for |
| --- | --- |
| P1 | Replica identification and cockpit/onboard-use warning |
| P2 | Front buttons, rear switches, USB, AUX IN, M1/M2, sensor |
| P3 | Power, charging, clock mode, display cycle and timer limits |
| P4 | Hourly chime, alarm setup/save, snooze/dismissal, audio |
| P5 | Simulation mode and beginning of the historical FCOM clock excerpt |
| P6 | Time/date selection and MAN setting, ET/CHR relationship, replica UTC caveat |

The user-supplied [product page](http://air1shop.com//737-boeing-1-1-p-213) identifies the source product. It could not be retrieved during release preparation, so operational instructions rely on the supplied files, not a claim about its current contents. Obtain the correct manual revision from the seller for your unit.

## R2. Supplied USB/firmware guide

**File supplied with the clock:** `737clock_upgrade.pdf`, *737 时钟固件升级及对时说明* (737 clock firmware-upgrade and time-setting instructions), two pages.

Steps 1–2 describe the Windows driver, USB data cable, powered-on clock, COM-port selection, and connection. Step 3 describes vendor firmware updating; step 4 describes local/UTC time setting; step 5 permits alarm/chime setting through software or physical buttons. Its Windows-only statement applies to the supplied vendor updater. This independent tool implements browser serial controls and does not reproduce the firmware-update workflow.

## R3. Official Boeing reference

The relevant aircraft reference is the **Boeing 737 NG Flight Crew Operations Manual (FCOM), Flight Instruments, Displays → Clock**. The replica manual P5 points to a historical China Southern 737 FCOM section **10.16.25**, then includes a translated clock-control excerpt on P5–P6. Aircraft configurations and revisions can differ.

**Official access:** [Boeing Licensed Flight Training Manuals](https://services.boeing.com/training-solutions/flight-training/licensed-manuals) identifies the FCOM, includes the 737 NG among supported models, and describes licensed access through MyBoeingFleet. [MyBoeingFleet](https://services.boeing.com/myboeingfleet-portal) is Boeing's official portal for customer technical information. These official public pages establish where to obtain the manuals; they do not themselves publish the clock operating chapter.

A current licensed Boeing FCOM clock chapter was **not accessed or independently verified** for this release. The front-panel instructions in USER_GUIDE.md are attributed to the supplied replica manual and its historical excerpt. They are not presented as a current Boeing-approved procedure. No third-party FCOM mirror is represented as an official Boeing source.

For a licensed copy, consult the clock section for the applicable aircraft configuration. Do not transfer aircraft GPS, electrical, or dispatch procedures to this consumer replica. Its alarms/chime, AUX audio, rear mode switch, and USB protocol are replica-specific.

## R4. Browser and Mac prerequisites

- [Chrome Web Serial documentation](https://developer.chrome.com/docs/capabilities/serial): browser serial access, device chooser, secure contexts, and permission policy.
- [Python for macOS](https://www.python.org/downloads/macos/): Python 3 for the optional localhost launcher.

The website and Mac package contain no external scripts, analytics, or clock-data-upload functionality. The online-sync control explicitly contacts [TimeAPI.io](https://timeapi.io/) using its [public HTTPS API](https://timeapi.io/swagger/); see [online-sync documentation](ONLINE_TIME_SYNC.md) for timing limits and request privacy. Static hosting providers may log ordinary web requests independently of the app.

## R5. Interoperability investigation

Protocol behavior was investigated using the supplied seller Chrome App v1.0.2, static inspection of the Windows application and DZZ 1.8 firmware, and direct read/alarm exchanges with one physical legacy clock. [Reverse Engineer Anything (REA)](https://github.com/morluto/rea) supported the local investigation. The vendor application was not executed and firmware was not flashed.

The published [protocol notes](PROTOCOL.md) describe interface facts needed for interoperability. Hardware test data used in the regression tests includes a timestamp and alarm values, not a device serial number. Private investigation outputs, raw disassembly, vendor packages, and deployment credentials are excluded.

Boeing, 737, Aviation 1, and other product names identify their respective owners' products. This independent project is not affiliated with or endorsed by them. No rights to third-party manuals, software, firmware, trademarks, or sound recordings are granted by this repository.
