import { Result } from '../../shared/types';
import { deleteSecret, getSecret, hasSecret, isSecureStorageAvailable, setSecret } from './secureStore';

export interface GeminiStatus {
  configured: boolean;
  /** Last 4 characters only, so the owner can recognise which key is saved. */
  hint: string | null;
  secureStorageAvailable: boolean;
}

// Dev convenience only: a developer's repo-root .env (loaded in main.ts when not
// packaged) can still supply a key. Packaged builds never read the environment.
export function getGeminiKey(allowEnvFallback: boolean = false): string | null {
  const stored = getSecret('gemini-api-key');
  if (stored) return stored;
  if (allowEnvFallback && process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  return null;
}

export function getGeminiStatus(): GeminiStatus {
  const key = getSecret('gemini-api-key');
  return {
    configured: hasSecret('gemini-api-key') && key !== null,
    hint: key ? key.slice(-4) : null,
    secureStorageAvailable: isSecureStorageAvailable(),
  };
}

export function saveGeminiKey(raw: unknown): Result<GeminiStatus> {
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (key.length < 20 || /\s/.test(key)) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'That does not look like a Gemini API key.' } };
  }
  try {
    setSecret('gemini-api-key', key);
  } catch (err: any) {
    return { ok: false, error: { code: 'SECURE_STORAGE_UNAVAILABLE', message: err.message } };
  }
  return { ok: true, data: getGeminiStatus() };
}

export function clearGeminiKey(): Result<GeminiStatus> {
  deleteSecret('gemini-api-key');
  return { ok: true, data: getGeminiStatus() };
}

// Cheap authenticated call (list models) to verify the key. The key goes in a
// header, never the URL, so it can't end up in logs or proxies' URL records.
export async function testGeminiKey(candidate?: string): Promise<Result<null>> {
  const key = candidate?.trim() || getGeminiKey();
  if (!key) {
    return { ok: false, error: { code: 'NOT_CONFIGURED', message: 'No Gemini API key is saved.' } };
  }
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      headers: { 'x-goog-api-key': key },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, data: null };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { ok: false, error: { code: 'INVALID_KEY', message: 'Google rejected this API key.' } };
    }
    return { ok: false, error: { code: 'API_ERROR', message: `Google returned status ${res.status}.` } };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Could not reach Google. Check the internet connection.' } };
  }
}
