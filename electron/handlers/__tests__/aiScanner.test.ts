import { describe, it, expect, vi, afterEach } from 'vitest';
import { scanInvoice } from '../aiScanner';

describe('aiScanner handler (Task 10.1) — offline degradation + API wiring', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns an OFFLINE error with no API key configured, instead of attempting a network call', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await scanInvoice('/tmp/does-not-matter.jpg');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('OFFLINE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('parses a successful Gemini response into the expected shape', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const mockInvoice = {
      supplier_name: 'Agha Steel',
      invoice_date: '2026-10-18',
      notes: null,
      line_items: [{ description: 'Cement Bag', quantity: 50, unit: 'bag', rate: 1200, amount: 60000 }],
      total: 60000,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockInvoice) }] } }],
        }),
      })
    );

    // Reading a real small file avoids mocking fs for this test; any tiny
    // existing file works since content is just base64-encoded, not parsed.
    const result = await scanInvoice(__filename);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.supplierName).toBe('Agha Steel');
      expect(result.data.lineItems).toHaveLength(1);
      expect(result.data.total).toBe(60000);
    }
  });

  it('returns an API_ERROR when Gemini responds with a non-ok status', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const result = await scanInvoice(__filename);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('API_ERROR');
  });

  it('returns a NETWORK_ERROR if fetch itself throws (offline mid-scan)', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await scanInvoice(__filename);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_ERROR');
  });

  it('returns a PARSE_ERROR when the model response has no usable text', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) })
    );

    const result = await scanInvoice(__filename);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PARSE_ERROR');
  });
});
