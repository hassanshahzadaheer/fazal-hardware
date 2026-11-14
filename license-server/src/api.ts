import { FastifyInstance } from 'fastify';
import { LicenseStore } from './licenses';
import { isKeyFormat, normalizeKey } from './crypto';
import { RateLimiter } from './rateLimit';

// Public device-facing API. Every success reply carries a SIGNED lease; every
// failure is a small unsigned {code,message} that the desktop app never trusts
// to change its state.
export function registerApi(app: FastifyInstance, store: LicenseStore): void {
  const perIp = new RateLimiter(60, 60_000);
  const failuresPerIp = new RateLimiter(10, 10 * 60_000); // wrong-key guesses

  async function handle(action: 'activate' | 'validate' | 'deactivate', req: any, reply: any) {
    const ip: string = req.ip;
    if (!perIp.allow(ip)) return reply.code(429).send({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' });

    const b = req.body ?? {};
    const key = typeof b.key === 'string' ? normalizeKey(b.key) : '';
    const deviceId = typeof b.deviceId === 'string' ? b.deviceId : '';
    const nonce = typeof b.nonce === 'string' ? b.nonce : '';
    if (!isKeyFormat(key) || !/^[a-f0-9]{16,128}$/i.test(deviceId) || !/^[a-f0-9]{16,64}$/i.test(nonce)) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'Malformed request.' });
    }

    const license = store.findByKey(key);
    if (!license) {
      // Only wrong-key guesses count against the stricter budget.
      if (!failuresPerIp.allow(ip)) return reply.code(429).send({ code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' });
      return reply.code(404).send({ code: 'INVALID_KEY', message: 'That activation key was not recognised. Check it and try again.' });
    }

    if (action === 'deactivate') {
      store.deactivate(license, deviceId);
      return reply.send({ ok: true });
    }

    const result = store.checkIn(action, license, {
      deviceId,
      deviceName: typeof b.deviceName === 'string' ? b.deviceName.slice(0, 100) : undefined,
      appVersion: typeof b.appVersion === 'string' ? b.appVersion.slice(0, 32) : undefined,
      ip,
      nonce,
    });
    if ('error' in result) return reply.code(result.error.status).send({ code: result.error.code, message: result.error.message });
    return reply.send({ ok: true, lease: result.lease });
  }

  for (const action of ['activate', 'validate', 'deactivate'] as const) {
    app.post(`/api/v1/${action}`, (req, reply) => handle(action, req, reply));
  }
  app.get('/healthz', async () => ({ ok: true }));
}
