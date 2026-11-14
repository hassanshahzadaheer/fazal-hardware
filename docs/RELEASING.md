# Releasing & updating

Repo: `hassanshahzadaheer/fazal-hardware` (public). Installed apps read GitHub Releases from it — no token in the app.
Publishing credentials = the workflow's built-in `GITHUB_TOKEN`; signing secrets = GitHub Actions secrets only.

## One-time setup
1. **Licence server** deployed over HTTPS (see `license-server/README.md`); keypair generated with `npm run keygen`.
2. GitHub → Settings → Secrets and variables → Actions → **Variables**: `LICENSE_SERVER_URL` (real https URL),
   `LICENSE_PUBLIC_KEY_B64` (`base64 < license-public.pem | tr -d '\n'`). The release build **fails** on localhost/example/http URLs or a non-Ed25519 key.
3. **Code signing** (Secrets): `WIN_CSC_LINK` (base64 .pfx or URL), `WIN_CSC_KEY_PASSWORD`. Then add the certificate's
   subject CN as `"win": {"publisherName": ["<CN>"]}` in `package.json` build config so electron-updater verifies each
   downloaded installer's signature. Until a certificate exists the workflow refuses to release unless you set variable
   `ALLOW_UNSIGNED_RELEASE=true` — for pilots only; unsigned builds trigger SmartScreen warnings and are **not production-ready**.
   (Azure Trusted Signing isn't supported by electron-builder 24 — would need an upgrade; ask before changing deps.)

## Cut a release
```
npm version 1.2.0 --no-git-tag-version && git commit -am "Release 1.2.0"
git tag v1.2.0 && git push && git push origin v1.2.0
```
Only the **tag** triggers `release.yml` (tests → build → draft GitHub Release with `.exe`, `latest.yml`, blockmap). Pushes to `main` never release.
Then: download the installer from the draft, install-test it, and click **Publish release** — that is the moment clients can see it.
Rollback: unpublish/delete the release (clients already updated keep running; ship a higher version to fix forward — downgrades are disabled).

## Update behaviour in the app
Settings → Updates: automatic check (launch + 6 h), background download with progress, **Restart and update** button.
Never auto-restarts; refused while the New Sale screen is open; otherwise applies on the next normal quit.
Silent NSIS install, same `appId` (`com.fazal.pos`) and same `userData` (`fazal.db`) — data is never seeded or overwritten, and
`pre-migration-*.db` snapshots (last 10) are written to `<userData>/backups` before any schema change; a failed snapshot aborts the migration.

## One-time upgrade for existing installs
1.0.x has no updater. Run the 1.1.0+ installer once over it (same install folder). Data is preserved. Afterwards updates are in-app.

## Real version-to-version test (needs Windows — not possible from the Mac)
1. Publish pilot releases `v1.1.0` and `v1.1.1` (unsigned pilot allowed only on a test machine/VM).
2. On a clean Windows VM install 1.1.0, activate, add products/sales (and note counts).
3. Open Settings → Updates → Check; confirm download progress, then open New Sale → try Restart (must be refused) → leave → Restart and update.
4. Verify: version shows 1.1.1, all data present, licence still active, `<userData>/backups/pre-migration-*` exists if 1.1.1 had a migration, Gemini key still saved.
5. Offline: disconnect network, confirm POS works; check no crash on update check. Repeat once with a signed build to confirm signature verification.
`userData` = `%APPDATA%\fazal-pos-inventory\`.
