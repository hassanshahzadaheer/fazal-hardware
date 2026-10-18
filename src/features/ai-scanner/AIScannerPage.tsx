import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Trash2, Upload, Loader2, Check } from 'lucide-react';
import { ProductWithNames, Supplier, ExtractedInvoice } from '../../../shared/types';
import { findBestMatch } from '../../../shared/lib/productMatch';
import { Button, Input, Select, Field, Tooltip } from '../../components/ui';

type Step = 'upload' | 'processing' | 'review';

interface ReviewItem {
  description: string;
  productId: number | null;
  quantity: number;
  rate: number;
}

// Gemini returns one single response — there's no real per-stage progress to
// report — so these stages are a perceived-progress UI: each message is
// paired with a progress-bar ceiling it advances toward and holds at, so the
// bar never looks stalled even on a slow network, and the final stage only
// completes once the actual response lands (§25.3 — the one feature that
// needs the internet, so it should visibly show it's working, not hang).
const PROCESSING_STAGES = [
  { label: 'Uploading invoice', ceiling: 30 },
  { label: 'AI is reading the invoice text', ceiling: 70 },
  { label: 'Matching items to your products', ceiling: 92 },
];

export default function AIScannerPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [processingMsgIndex, setProcessingMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await window.api.products.list();
      return res.ok ? (res.data as ProductWithNames[]) : [];
    },
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await window.api.suppliers.list();
      return res.ok ? (res.data as Supplier[]) : [];
    },
  });

  const handleChooseFile = async () => {
    setError(null);
    const picked = await window.api.aiScanner.selectFile();
    if (!picked.ok || !picked.data) return;

    setStep('processing');
    setProcessingMsgIndex(0);
    setProgress(0);
    const msgTimer = setInterval(() => {
      setProcessingMsgIndex((i) => Math.min(i + 1, PROCESSING_STAGES.length - 1));
    }, 1400);
    const progressTimer = setInterval(() => {
      setProcessingMsgIndex((i) => {
        const ceiling = PROCESSING_STAGES[i].ceiling;
        setProgress((p) => (p < ceiling ? p + 1 : p));
        return i;
      });
    }, 60);

    const res = await window.api.aiScanner.scan(picked.data);
    clearInterval(msgTimer);
    clearInterval(progressTimer);

    if (!res.ok) {
      setError(res.error.message);
      setStep('upload');
      return;
    }

    setProgress(100);

    const extracted = res.data as ExtractedInvoice;
    const catalog = products ?? [];
    const reviewItems: ReviewItem[] = extracted.lineItems.map((li) => {
      const match = findBestMatch(li.description, catalog);
      return {
        description: li.description,
        productId: match?.id ?? null,
        quantity: li.quantity,
        rate: li.rate,
      };
    });

    setItems(reviewItems);
    setInvoiceDate(extracted.invoiceDate);
    // Brief pause so the 100% fill is actually visible before the view swaps.
    await new Promise((resolve) => setTimeout(resolve, 350));
    setStep('review');
  };

  const updateItem = (index: number, patch: Partial<ReviewItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const matchedCount = items.filter((it) => it.productId !== null).length;
  const unmatchedCount = items.length - matchedCount;
  const grandTotal = items.reduce((sum, it) => sum + it.quantity * it.rate, 0);

  const handleSave = async () => {
    setError(null);
    const matched = items.filter((it) => it.productId !== null);
    if (matched.length === 0) {
      setError('Match at least one item to a product before saving.');
      return;
    }
    setSubmitting(true);
    const supplier = suppliers?.find((s) => s.id === Number(supplierId));
    const payload = {
      supplierId: supplierId ? Number(supplierId) : null,
      supplierName: supplier?.name ?? null,
      items: matched.map((it) => {
        const product = products?.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          productName: product?.name ?? it.description,
          quantity: it.quantity,
          unit: product?.purchaseUnit ?? product?.baseUnit ?? 'piece',
          unitPrice: it.rate,
          lineTotal: it.quantity * it.rate,
        };
      }),
      subtotal: matched.reduce((sum, it) => sum + it.quantity * it.rate, 0),
      freightAmount: 0,
      total: matched.reduce((sum, it) => sum + it.quantity * it.rate, 0),
      paidAmount: 0,
      paymentMode: 'credit', // §18.4: scanned invoices save as credit, paid=0
    };
    const res = await window.api.purchases.create(payload);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setTimeout(() => navigate('/purchases'), 1500);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight">AI Invoice Scanner</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Photograph a supplier invoice and let AI turn it into a draft purchase.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="text-sm bg-accent-soft text-accent border border-accent-soft-border rounded-md px-4 py-3">
            Photograph any supplier invoice — printed or handwritten — and AI will read the items and enter them
            as a purchase for you to review.
          </div>
          <button
            onClick={handleChooseFile}
            className="w-full border-2 border-dashed border-border rounded-lg py-12 flex flex-col items-center gap-2 text-ink-muted hover:border-accent hover:text-accent transition-colors"
          >
            <Upload className="w-8 h-8" />
            <span className="font-medium">Choose File</span>
            <span className="text-xs">JPG, PNG, or PDF</span>
          </button>
          <div className="grid grid-cols-3 gap-3 text-xs text-ink-muted">
            <div className="bg-surface border border-border rounded-md p-3 text-center">Any quality works</div>
            <div className="bg-surface border border-border rounded-md p-3 text-center">Handwritten OK</div>
            <div className="bg-surface border border-border rounded-md p-3 text-center">Fast & automatic</div>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-8">
          <div className="flex items-center gap-3">
            {PROCESSING_STAGES.map((stage, i) => {
              const done = i < processingMsgIndex || progress === 100;
              const active = i === processingMsgIndex && progress < 100;
              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      done
                        ? 'bg-success text-white'
                        : active
                        ? 'bg-accent-soft text-accent'
                        : 'bg-surface-sunken text-ink-faint'
                    }`}
                  >
                    {done ? (
                      <Check className="w-4 h-4" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-semibold">{i + 1}</span>
                    )}
                  </div>
                  {i < PROCESSING_STAGES.length - 1 && (
                    <div className={`w-10 h-[2px] rounded-full ${done ? 'bg-success' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full max-w-sm">
            <p className="text-[13px] font-medium text-ink text-center mb-2">
              {PROCESSING_STAGES[processingMsgIndex].label}…
            </p>
            <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-150 ease-standard"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[12px] text-ink-faint text-center mt-2">
              This usually takes a few seconds — hang tight, the AI is still working.
            </p>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="text-sm bg-success-soft text-success border border-success/20 rounded-md px-4 py-3">
            Invoice scanned successfully! {matchedCount} matched, {unmatchedCount} need review.
            <button onClick={() => setStep('upload')} className="ml-2 underline font-medium">
              Scan Again
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Invoice Date" hint={!invoiceDate ? "AI couldn't find a date on this invoice" : undefined}>
              <Input value={invoiceDate ?? ''} placeholder="Not detected" readOnly disabled />
            </Field>
          </div>

          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                  <tr>
                    <th className="px-3 py-2.5 w-8"></th>
                    <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide">What AI Read</th>
                    <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide">Match to Your Product</th>
                    <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide w-20">Qty</th>
                    <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide w-24">Rate</th>
                    <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide w-24">Total</th>
                    <th className="px-3 py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, i) => (
                    <tr key={i} className="hover:bg-surface-sunken/60 transition-colors">
                      <td className="px-3 py-2">
                        <Tooltip content={it.productId ? 'Matched to your catalog' : 'No confident match — pick one manually'}>
                          {it.productId ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          )}
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2 text-ink-muted">{it.description}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={it.productId ?? ''}
                          onChange={(e) => updateItem(i, { productId: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="">Unmatched — select a product</option>
                          {(products ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={it.rate}
                          onChange={(e) => updateItem(i, { rate: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2 text-ink font-medium tabular-nums">
                        PKR {(it.quantity * it.rate).toLocaleString('en-PK')}
                      </td>
                      <td className="px-3 py-2">
                        <Tooltip content="Remove this line item">
                          <button
                            onClick={() => removeItem(i)}
                            aria-label="Remove item"
                            className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between bg-surface border border-border rounded-md p-4">
            <div className="text-sm text-ink-muted">
              {matchedCount} matched · {unmatchedCount} unmatched · Grand total: PKR{' '}
              {grandTotal.toLocaleString('en-PK')}
            </div>
            <Button variant="primary" onClick={handleSave} loading={submitting}>
              Save to Purchases
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
