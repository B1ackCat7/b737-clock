# Online time sync · v1.1.0

The existing Mac/manual time controls remain available. **Sync from internet** adds a one-click, one-time sync of both MAN and UTC after connecting the clock. The feature is included in the GitHub v1.1.0 release and Mac download, and is available on the existing private ChatGPT site.

## Use online sync

1. Open the updated ChatGPT site in desktop Chrome/Edge, or run **Start Clock Portal.command** in this local folder. For a direct source preview, run `python3 -m http.server 7370 --bind 127.0.0.1 --directory dist` and open `http://127.0.0.1:7370`.
2. For a test without changing hardware, select **Try demo**, then **Sync from internet**. This fetches real online time while simulating both USB writes.
3. For a real sync, exit demo, connect the powered-on clock (the tested legacy model uses **9,600 baud**), and wait for **Connected**.
4. Click **Sync from internet** once. It fetches UTC, then sends MAN and UTC, waiting for each acknowledgement. Check the success notice and activity log.
5. Use **TIME/DATE** on the physical clock to verify both MAN and UTC time and date. The USB read-back has only one timestamp whose time basis is unconfirmed.

MAN uses the **Mac's configured time zone**, including the daylight-saving offset at the fetched instant. Correct a wrong Mac time-zone setting before syncing. The service provides the instant; the Mac wall-clock time is not used as the online time source. This function changes the replica, not the Mac's system clock.

**Use Mac time** still prepares system-clock drafts, followed by **Write time to clock**. Editing a field creates manual drafts. After an online sync, pressing Write time again obtains a fresh online sample rather than resending the previous timestamp.

## Time source and timing

Source: [TimeAPI.io](https://timeapi.io/), using its [documented API](https://timeapi.io/swagger/) at `https://timeapi.io/api/time/current/zone?timeZone=UTC`.

Ordinary browser JavaScript cannot contact UDP NTP servers directly. This function uses the service's HTTPS UTC endpoint, **not NIST time.gov or a direct NTP connection**. No API key, backend proxy, or serial helper is required. The endpoint was observed returning UTC with browser-compatible CORS headers, and a live fetch succeeded from Edge on localhost.

Each click makes one fresh, uncached request with a five-second timeout. The app estimates return-path delay as half the measured round trip, then advances the result using `performance.now()` immediately before each write. It rejects round trips over two seconds and samples older than fifteen seconds. MAN's acknowledgement can take time, so the UTC timestamp is recalculated before its own command.

This is an HTTP-based estimate, **not a calibrated NTP implementation or a subsecond accuracy guarantee**. Network asymmetry, server processing, USB latency, whole-second protocol fields, and the clock's implementation limit precision. The source and measured round trip are shown in the session log. There is no automatic periodic polling or background resynchronization.

## Errors and privacy

If the public time request fails, is malformed, is cached, or is too slow, no time command is sent and the connection remains available. The app does not silently substitute the Mac clock. Use **Use Mac time** explicitly if that is your preferred alternative.

MAN and UTC are separate protocol commands. If MAN is acknowledged and UTC fails, MAN may already have changed; the error identifies that partial result. An uncertain USB write disconnects the session, and writes are never automatically retried. Reconnect and inspect both physical displays before retrying.

The request contacts TimeAPI.io only when online sync is requested. As with any public HTTPS service, it sees the client's network IP and request metadata. No clock settings, USB IDs, serial numbers, local time-zone name, or logs are included in the request. The requested server zone is always UTC.

## Validation

- 28 automated tests pass: the original 18 checks plus ten online-time tests for validated UTC, cache/credential policy, latency compensation, HTTP/network/timeout rejection, stale samples, local/UTC date boundaries, DST, command ordering, and partial failure without retry.
- Edge browser demo fetched live online UTC, populated MAN/UTC, and logged simulated writes. This confirms browser CORS and rendered integration, not a physical clock write.
- The project owner tested the online-sync update, reported it working, and approved the v1.1.0 release on 2026-10-24. This is a user acceptance result; independent timing-accuracy measurements were not recorded. The earlier settings read and unchanged-value alarm round trip remain the instrumented hardware evidence for the legacy unit.
