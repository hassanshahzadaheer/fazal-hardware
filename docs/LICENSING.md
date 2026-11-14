# Licensing — how it works & what it can't do

**Flow.** Customer enters their personal key in the first-run wizard (internet required once) → server records the
device (hashed machine id), returns a signed lease → app stores the lease (file) and key (OS secure storage). The app
verifies the lease locally with the embedded **public** key, so the POS never needs the internet. In the background it
re-validates every `recheckHours` (default 6) and on launch.

**Offline grace (default 7 days, per-licence in the dashboard).** Each successful check restarts the window. If a
computer can't reach the server for longer than the window, it becomes read-only until it reconnects.

**Limits you must understand / tell customers**
- A suspension/revocation/expiry change **cannot reach an offline computer**. It takes effect at that computer's next successful check, or when its grace window ends — whichever comes first. Immediate cut-off is impossible by design (offline-first); shorten the grace days if you need tighter control.
- Clock rollback is detected (high-water mark; rollback > 1 h while offline → restricted until an online check re-anchors the clock). It's a deterrent, not DRM: a determined reverse-engineer of an Electron app can bypass client checks.
- Device identity = hash of the OS machine GUID. Reinstalling Windows changes it → free the old seat in the dashboard (Remove).

**Restricted mode never destroys data.** When suspended/revoked/expired/grace-expired: all records stay readable; create/update/
delete/restore IPC calls are refused in the main process (not just hidden in the UI); **Backup and CSV export always work**; login still works. Reactivation restores everything instantly on next check.

**Existing (pre-1.1) installs** have no licence → on first launch of 1.1+ they see the activation screen (with a "Back up my data" button). Their data and settings are untouched; setup is auto-marked complete so shop details aren't re-asked.

**Dev:** `FAZAL_DEV_LICENSE_BYPASS=1` in `.env` skips activation in `npm run dev` only (ignored in packaged builds).
