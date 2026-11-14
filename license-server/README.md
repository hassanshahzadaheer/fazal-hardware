# Fazal licence server + owner dashboard

Separate from the desktop app. Holds the **private signing key** and admin credentials — neither ever
appears in the repo or the installer.

```
npm install
npm run keygen -- ~/.fazal-license-key      # once. Private key = server only. Public key = app build.
cp .env.example .env  # fill in (or export) the values; then:
export KEY_HASH_PEPPER=... LICENSE_SIGNING_KEY_FILE=~/.fazal-license-key/license-signing-private.pem
npm run create-admin -- owner               # password + TOTP secret (add to an authenticator app)
SECURE_COOKIES=false npm start              # local dev: http://localhost:8787/admin
npm test                                    # 28 tests incl. real desktop-client ⇄ server flows
```

**Device API** (`/api/v1/activate|validate|deactivate`): returns an Ed25519-signed *lease* binding the licence, device,
status, expiry, offline-grace days and the request nonce. Suspend/revoke/expired are also signed leases, so they can't be
forged or hidden by a network attacker. Unsigned errors never change the app's state.

**Dashboard** (`/admin`): password + TOTP login (replay-protected, lockout after 5 failures), HttpOnly/SameSite=Strict
(`__Host-`/Secure in production) session cookie, CSRF tokens + Origin/Fetch-Metadata checks, strict CSP, audit log.
Issue personal keys (shown **once**; only an HMAC hash is stored), set expiry / device limit / offline grace / recheck
interval, suspend / revoke / reactivate, remove devices, issue a replacement key.
Set `ADMIN_ENABLED=false` on a public instance and run a second private instance (same DB volume) for admin if you want it unreachable from the internet — or put `/admin` behind an IP allow-list / VPN / Cloudflare Access.

**Deploy**: `Dockerfile` (volume at `/data`, TLS terminated by the host). Back-ups: daily `VACUUM INTO` snapshots in
`/data/backups` (14 kept) — also copy them **off the machine**. Back up `LICENSE_SIGNING_KEY` and `KEY_HASH_PEPPER` separately and safely:
losing the signing key means re-shipping a new app build; losing the pepper invalidates all issued keys.
Node ≥ 22 recommended.
