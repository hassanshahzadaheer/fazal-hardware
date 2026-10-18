import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Trash2, Upload } from 'lucide-react';
import { ProductWithNames, Supplier, ExtractedInvoice } from '../../../shared/types';
import { findBestMatch } from '../../../shared/lib/productMatch';

type Step = 'upload' | 'processing' | 'review';

interface ReviewItem {
  description: string;
  productId: number | null;
  quantity: number;
  rate: number;
}

const PROCESSING_MESSAGES = [
  'Uploading invoice…',
  'AI is reading the invoice text…',
  'Matching items to your products…',
];

export default function AIScannerPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [processingMsgIndex, setProcessingMsgIndex] = useState(0);
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
    const msgTimer = setInterval(() => {
      setProcessingMsgIndex((i) => Math.min(i + 1, PROCESSING_MESSAGES.length - 1));
    }, 900);

    const res = await window.api.aiScanner.scan(picked.data);
    clearInterval(msgTimer);

    if (!res.ok) {
      setError(res.error.message);
      setStep('upload');
      return;
    }

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
      <h1 className="text-2xl font-bold text-[#111827] mb-6">AI Invoice Scanner</h1>

      {error && (
        <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="text-sm bg-blue-50 text-blue-800 border border-blue-200 rounded-lg px-4 py-3">
            Photograph any supplier invoice — printed or handwritten — and AI will read the items and enter them
            as a purchase for you to review.
          </div>
          <button
            onClick={handleChooseFile}
            className="w-full border-2 border-dashed border-[#E5E7EB] rounded-xl py-12 flex flex-col items-center gap-2 text-[#6B7280] hover:border-[#1F6B3B] hover:text-[#1F6B3B] transition-colors"
          >
            <Upload className="w-8 h-8" />
            <span className="font-medium">Choose File</span>
            <span className="text-xs">JPG, PNG, or PDF</span>
          </button>
          <div className="grid grid-cols-3 gap-3 text-xs text-[#6B7280]">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-center">Any quality works</div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-center">Handwritten OK</div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-center">Fast & automatic</div>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-[#1F6B3B]/30 border-t-[#1F6B3B] rounded-full animate-spin" />
          <p className="text-sm text-[#6B7280]">{PROCESSING_MESSAGES[processingMsgIndex]}</p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-4 py-3">
            Invoice scanned successfully! {matchedCount} matched, {unmatchedCount} need review.
            <button onClick={() => setStep('upload')} className="ml-2 underline font-medium">
              Scan Again
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
              >
                <option value="">—</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Invoice Date</label>
              <input
                value={invoiceDate ?? ''}
                readOnly
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-[#F7F8FA] text-[#6B7280]"
              />
            </div>
          </div>

          <table className="w-full text-sm bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 font-medium">What AI Read</th>
                <th className="px-3 py-2 font-medium">Match to Your Product</th>
                <th className="px-3 py-2 font-medium w-20">Qty</th>
                <th className="px-3 py-2 font-medium w-24">Rate</th>
                <th className="px-3 py-2 font-medium w-24">Total</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    {it.productId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#6B7280]">{it.description}</td>
                  <td className="px-3 py-2">
                    <select
                      value={it.productId ?? ''}
                      onChange={(e) => updateItem(i, { productId: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-2 py-1 border border-[#E5E7EB] rounded text-sm"
                    >
                      <option value="">— Unmatched —</option>
                      {(products ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-[#E5E7EB] rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={it.rate}
                      onChange={(e) => updateItem(i, { rate: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-[#E5E7EB] rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-[#111827] font-medium">
                    PKR {(it.quantity * it.rate).toLocaleString('en-PK')}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeItem(i)} className="text-[#6B7280] hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-lg p-4">
            <div className="text-sm text-[#6B7280]">
              {matchedCount} matched · {unmatchedCount} unmatched · Grand total: PKR{' '}
              {grandTotal.toLocaleString('en-PK')}
            </div>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D] disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save to Purchases'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
