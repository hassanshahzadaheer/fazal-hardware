import * as fs from 'fs';
import * as path from 'path';
import { Result, ExtractedInvoice } from '../../shared/types';

// §18.3: never leave the API key reachable from the renderer (§25.6) — this
// whole module only runs in the main process, called via IPC.
const PROMPT = `You are an expert at reading supplier invoices for a Pakistani building materials and hardware shop.
Extract ALL items — even if handwritten, tilted, or low quality.
Extract: supplier name, invoice date, ALL line items (description, quantity, unit, rate, amount), total.
Numbers may be in Urdu/Hindi numerals — convert to Arabic.
Return clean JSON only, matching exactly this shape:
{"supplier_name": string|null, "invoice_date": string|null, "notes": string|null, "line_items": [{"description": string, "quantity": number, "unit": string, "rate": number, "amount": number}], "total": number|null}`;

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.pdf') return 'application/pdf';
  return 'image/jpeg';
}

// Graceful degradation per §25.3: the rest of the app works fully offline;
// this is the one feature that genuinely needs the internet, so it fails
// with a clear OFFLINE error up front rather than hanging on a fetch.
export async function scanInvoice(filePath: string): Promise<Result<ExtractedInvoice>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: 'OFFLINE',
        message:
          'AI Scanner needs an internet connection and a configured Gemini API key (set GEMINI_API_KEY) — unavailable right now.',
      },
    };
  }

  let base64: string;
  try {
    base64 = fs.readFileSync(filePath).toString('base64');
  } catch (err: any) {
    return { ok: false, error: { code: 'FILE_ERROR', message: err.message ?? 'Could not read the selected file' } };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: PROMPT }, { inline_data: { mime_type: guessMimeType(filePath), data: base64 } }],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      return { ok: false, error: { code: 'API_ERROR', message: `Gemini API error: ${response.status}` } };
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: { code: 'PARSE_ERROR', message: 'The AI did not return readable invoice data' } };
    }

    const parsed = JSON.parse(text);
    const extracted: ExtractedInvoice = {
      supplierName: parsed.supplier_name ?? null,
      invoiceDate: parsed.invoice_date ?? null,
      notes: parsed.notes ?? null,
      lineItems: Array.isArray(parsed.line_items) ? parsed.line_items : [],
      total: parsed.total ?? null,
    };
    return { ok: true, data: extracted };
  } catch (err: any) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: err.message ?? 'Failed to reach the AI scanning service' } };
  }
}
