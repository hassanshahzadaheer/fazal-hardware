import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import { audit } from './db';
import { generateActivationKey, hashKey } from './crypto';
import { Config } from './config';
import { LeasePayload, signLease } from './lease';

export interface LicenseRow {
  id: string;
  key_hash: string;
  key_hint: string;
  customer_name: string;
  customer_email: string | null;
  notes: string | null;
  status: 'active' | 'suspended' | 'revoked';
  expires_at: string | null;
  max_devices: number;
  offline_grace_days: number;
  recheck_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ActivationRow {
  id: number;
  license_id: string;
  device_id: string;
  device_name: string | null;
  app_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_ip: string | null;
  active: number;
}

export interface LicenseInput {
  customerName: string;
  customerEmail?: string | null;
  notes?: string | null;
  expiresAt?: string | null; // ISO date or null = no expiry
  maxDevices: number;
  offlineGraceDays: number;
  recheckHours: number;
}

export class ValidationError extends Error {}

export function validateInput(raw: Partial<LicenseInput>): LicenseInput {
  const name = (raw.customerName ?? '').trim();
  if (!name || name.length > 200) throw new ValidationError('Customer name is required (max 200 characters).');
  const email = raw.customerEmail?.trim() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ValidationError('Customer email is not valid.');
  let expiresAt: string | null = null;
  if (raw.expiresAt) {
    const t = Date.parse(raw.expiresAt);
    if (Number.isNaN(t)) throw new ValidationError('Expiry date is not valid.');
    expiresAt = new Date(t).toISOString();
  }
  const maxDevices = Number(raw.maxDevices);
  if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 100) throw new ValidationError('Device limit must be 1–100.');
  const grace = Number(raw.offlineGraceDays);
  if (!Number.isInteger(grace) || grace < 0 || grace > 90) throw new ValidationError('Offline grace must be 0–90 days.');
  const recheck = Number(raw.recheckHours);
  if (!Number.isInteger(recheck) || recheck < 1 || recheck > 168) throw new ValidationError('Recheck interval must be 1–168 hours.');
  return {
    customerName: name,
    customerEmail: email,
    notes: raw.notes?.trim().slice(0, 2000) || null,
    expiresAt,
    maxDevices,
    offlineGraceDays: grace,
    recheckHours: recheck,
  };
}

export class LicenseStore {
  constructor(private db: Database.Database, private config: Config) {}

  /** Returns the plaintext key ONCE; only a keyed hash is stored. */
  create(input: LicenseInput, actor: string): { license: LicenseRow; key: string } {
    const key = generateActivationKey();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO licenses (id, key_hash, key_hint, customer_name, customer_email, notes, status, expires_at,
         max_devices, offline_grace_days, recheck_hours, created_at, updated_at)
       VALUES (?,?,?,?,?,?, 'active', ?,?,?,?,?,?)`
    ).run(id, hashKey(key, this.config.keyPepper), key.slice(-4), input.customerName, input.customerEmail ?? null,
      input.notes ?? null, input.expiresAt ?? null, input.maxDevices, input.offlineGraceDays, input.recheckHours, now, now);
    audit(this.db, actor, 'license.create', id, input.customerName);
    return { license: this.get(id)!, key };
  }

  get(id: string): LicenseRow | undefined {
    return this.db.prepare('SELECT * FROM licenses WHERE id = ?').get(id) as LicenseRow | undefined;
  }

  findByKey(key: string): LicenseRow | undefined {
    return this.db.prepare('SELECT * FROM licenses WHERE key_hash = ?').get(hashKey(key, this.config.keyPepper)) as LicenseRow | undefined;
  }

  list(search = '', status = ''): (LicenseRow & { device_count: number })[] {
    const like = `%${search.replace(/[%_]/g, '')}%`;
    return this.db.prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM activations a WHERE a.license_id = l.id AND a.active = 1) AS device_count
       FROM licenses l
       WHERE (l.customer_name LIKE ? OR IFNULL(l.customer_email,'') LIKE ? OR l.key_hint LIKE ?)
         AND (? = '' OR l.status = ?)
       ORDER BY l.created_at DESC LIMIT 500`
    ).all(like, like, like, status, status) as any;
  }

  update(id: string, input: LicenseInput, actor: string): void {
    this.db.prepare(
      `UPDATE licenses SET customer_name=?, customer_email=?, notes=?, expires_at=?, max_devices=?,
         offline_grace_days=?, recheck_hours=?, updated_at=? WHERE id=?`
    ).run(input.customerName, input.customerEmail ?? null, input.notes ?? null, input.expiresAt ?? null,
      input.maxDevices, input.offlineGraceDays, input.recheckHours, new Date().toISOString(), id);
    audit(this.db, actor, 'license.update', id,
      `expires=${input.expiresAt ?? 'never'} devices=${input.maxDevices} grace=${input.offlineGraceDays}d`);
  }

  setStatus(id: string, status: 'active' | 'suspended' | 'revoked', actor: string): void {
    this.db.prepare('UPDATE licenses SET status=?, updated_at=? WHERE id=?').run(status, new Date().toISOString(), id);
    audit(this.db, actor, `license.${status === 'active' ? 'reactivate' : status === 'suspended' ? 'suspend' : 'revoke'}`, id);
  }

  /** Replaces the key (e.g. customer lost it) and releases every device seat. */
  rekey(id: string, actor: string): string {
    const key = generateActivationKey();
    this.db.prepare('UPDATE licenses SET key_hash=?, key_hint=?, updated_at=? WHERE id=?')
      .run(hashKey(key, this.config.keyPepper), key.slice(-4), new Date().toISOString(), id);
    this.db.prepare('UPDATE activations SET active=0 WHERE license_id=?').run(id);
    audit(this.db, actor, 'license.rekey', id);
    return key;
  }

  activations(licenseId?: string): (ActivationRow & { customer_name: string })[] {
    return this.db.prepare(
      `SELECT a.*, l.customer_name FROM activations a JOIN licenses l ON l.id = a.license_id
       ${licenseId ? 'WHERE a.license_id = ?' : ''} ORDER BY a.last_seen_at DESC LIMIT 1000`
    ).all(...(licenseId ? [licenseId] : [])) as any;
  }

  removeDevice(licenseId: string, activationId: number, actor: string): void {
    this.db.prepare('UPDATE activations SET active=0 WHERE id=? AND license_id=?').run(activationId, licenseId);
    audit(this.db, actor, 'device.remove', licenseId, `activation ${activationId}`);
  }

  // ---- device-facing operations -----------------------------------------

  private statusOf(l: LicenseRow, now: Date): LeasePayload['status'] {
    if (l.status !== 'active') return l.status;
    if (l.expires_at && now.getTime() >= Date.parse(l.expires_at)) return 'expired';
    return 'active';
  }

  private leaseFor(l: LicenseRow, deviceId: string, nonce: string, status: LeasePayload['status'], now: Date) {
    return signLease(
      {
        v: 1, licenseId: l.id, customerName: l.customer_name, deviceId, status,
        expiresAt: l.expires_at, issuedAt: now.toISOString(), graceDays: l.offline_grace_days,
        recheckHours: l.recheck_hours, nonce,
      },
      this.config.signingKeyPem
    );
  }

  /**
   * activate = register (or re-confirm) this device; validate = confirm an already-known device.
   * Returns either a signed lease (including restricted ones — those must be signed so a
   * network attacker can't forge a restriction OR hide one) or an unsigned error.
   */
  checkIn(
    mode: 'activate' | 'validate',
    l: LicenseRow,
    dev: { deviceId: string; deviceName?: string; appVersion?: string; ip?: string; nonce: string },
    now: Date = new Date()
  ): { lease: ReturnType<LicenseStore['leaseFor']> } | { error: { status: number; code: string; message: string } } {
    const status = this.statusOf(l, now);
    const existing = this.db.prepare('SELECT * FROM activations WHERE license_id=? AND device_id=?').get(l.id, dev.deviceId) as ActivationRow | undefined;

    if (status !== 'active') {
      if (existing?.active) this.touch(existing.id, dev, now);
      return { lease: this.leaseFor(l, dev.deviceId, dev.nonce, status, now) };
    }

    if (existing && !existing.active) {
      if (mode === 'validate') {
        // The owner removed this device: tell it so (signed), don't silently re-add it.
        return { lease: this.leaseFor(l, dev.deviceId, dev.nonce, 'revoked', now) };
      }
      // Explicit re-activation with the key: re-claim a seat if one is free.
    }

    if (!existing || !existing.active) {
      const used = (this.db.prepare('SELECT COUNT(*) c FROM activations WHERE license_id=? AND active=1').get(l.id) as { c: number }).c;
      if (used >= l.max_devices) {
        return { error: { status: 409, code: 'DEVICE_LIMIT', message: `This licence is already active on ${used} of ${l.max_devices} allowed device(s). Ask your vendor to free a seat.` } };
      }
      if (existing) {
        this.db.prepare('UPDATE activations SET active=1, device_name=?, app_version=?, last_seen_at=?, last_ip=? WHERE id=?')
          .run(dev.deviceName ?? null, dev.appVersion ?? null, now.toISOString(), dev.ip ?? null, existing.id);
      } else {
        this.db.prepare(
          `INSERT INTO activations (license_id, device_id, device_name, app_version, first_seen_at, last_seen_at, last_ip, active)
           VALUES (?,?,?,?,?,?,?,1)`
        ).run(l.id, dev.deviceId, dev.deviceName ?? null, dev.appVersion ?? null, now.toISOString(), now.toISOString(), dev.ip ?? null);
        audit(this.db, 'device', 'device.activate', l.id, `${dev.deviceName ?? ''} ${dev.deviceId.slice(0, 8)}`);
      }
    } else {
      this.touch(existing.id, dev, now);
    }
    return { lease: this.leaseFor(l, dev.deviceId, dev.nonce, 'active', now) };
  }

  private touch(id: number, dev: { deviceName?: string; appVersion?: string; ip?: string }, now: Date) {
    this.db.prepare('UPDATE activations SET last_seen_at=?, app_version=COALESCE(?, app_version), device_name=COALESCE(?, device_name), last_ip=? WHERE id=?')
      .run(now.toISOString(), dev.appVersion ?? null, dev.deviceName ?? null, dev.ip ?? null, id);
  }

  deactivate(l: LicenseRow, deviceId: string): void {
    this.db.prepare('UPDATE activations SET active=0 WHERE license_id=? AND device_id=?').run(l.id, deviceId);
    audit(this.db, 'device', 'device.deactivate', l.id, deviceId.slice(0, 8));
  }
}
