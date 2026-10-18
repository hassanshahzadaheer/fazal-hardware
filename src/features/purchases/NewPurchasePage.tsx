import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ProductWithNames, Supplier, PurchaseLineItem } from '../../../shared/types';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

type PaymentMode = 'cash' | 'card' | 'credit' | 'partial';

interface Line extends PurchaseLineItem {
  _key: string;
}

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [freightAmount, setFreightAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
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

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !products) return [];
    return products.filter((p) => [p.name, p.barcode].filter(Boolean).some((f) => f!.toLowerCase().includes(q))).slice(0, 8);
  }, [products, search]);

  const addProduct = (product: ProductWithNames) => {
    const existing = lines.find((l) => l.productId === product.id);
    const factor = product.purchaseUnitFactor ?? 1;
    if (existing) {
      updateLine(existing._key, { quantity: existing.quantity + factor });
      setSearch('');
      return;
    }
    const unitPrice = product.costPrice ?? 0;
    const newLine: Line = {
      _key: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: factor,
      unit: product.purchaseUnit ?? product.baseUnit,
      unitPrice,
      lineTotal: factor * unitPrice,
    };
    setLines((prev) => [...prev, newLine]);
    setSearch('');
  };

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        const next = { ...l, ...patch };
        next.lineTotal = next.quantity * next.unitPrice;
        return next;
      })
    );
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l._key !== key));

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.lineTotal, 0), [lines]);
  const total = useMemo(() => subtotal + Number(freightAmount || 0), [subtotal, freightAmount]);

  const selectedSupplier = suppliers?.find((s) => s.id === Number(supplierId));

  const handleSubmit = async () => {
    setError(null);
    if (lines.length === 0) {
      setError('Add at least one product.');
      return;
    }
    if (paymentMode === 'partial' && (!paidAmount || Number(paidAmount) <= 0)) {
      setError('Enter the amount paid now.');
      return;
    }

    setSubmitting(true);
    const payload = {
      supplierId: supplierId ? Number(supplierId) : null,
      supplierName: selectedSupplier?.name ?? null,
      items: lines.map(({ _key, ...item }) => item),
      subtotal,
      freightAmount: Number(freightAmount || 0),
      total,
      paidAmount: paymentMode === 'partial' ? Number(paidAmount) : 0,
      paymentMode,
    };

    const res = await window.api.purchases.create(payload);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    navigate('/purchases');
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <h2 className="font-semibold text-[#111827] mb-3">1. Add Products You Received</h2>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or barcode…"
              autoFocus
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="px-3 py-2 flex items-center justify-between text-sm hover:bg-[#F7F8FA] cursor-pointer"
                  >
                    <div>
                      <div className="text-[#111827]">{p.name}</div>
                      <div className="text-xs text-[#6B7280]">
                        {p.stockOnHand} {p.baseUnit} in stock
                      </div>
                    </div>
                    <span className="text-[#111827] font-medium">{formatPKR(p.costPrice ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <h2 className="font-semibold text-[#111827] px-5 pt-4 pb-2">2. Review Quantities & Prices</h2>
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium w-28">Quantity</th>
                <th className="px-4 py-2 font-medium w-28">Rate</th>
                <th className="px-4 py-2 font-medium w-28">Total</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {lines.map((l) => (
                <tr key={l._key}>
                  <td className="px-4 py-2 text-[#111827]">
                    {l.productName} <span className="text-xs text-[#6B7280]">({l.unit})</span>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => updateLine(l._key, { quantity: Number(e.target.value) })}
                      className={cellCls}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })}
                      className={cellCls}
                    />
                  </td>
                  <td className="px-4 py-2 text-[#111827] font-medium">{formatPKR(l.lineTotal)}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => removeLine(l._key)} className="text-[#6B7280] hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">
                    Search and add products above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-[#111827]">3. Supplier & Payment</h2>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Supplier (optional)</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Payment Method</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)} className={inputCls}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          {paymentMode === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Amount Paid Now</label>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={inputCls}
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span className="text-[#111827]">{formatPKR(subtotal)}</span>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Freight / Carriage (PKR)</label>
            <input
              type="number"
              min="0"
              value={freightAmount}
              onChange={(e) => setFreightAmount(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex justify-between font-semibold text-[#111827] pt-2 border-t border-[#E5E7EB]">
            <span>Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          {paymentMode === 'credit' && (
            <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
              {formatPKR(total)} will be added to the supplier's payable.
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[#1F6B3B] text-white font-semibold text-sm hover:bg-[#17522D] disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Record Purchase & Update Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
const cellCls =
  'w-full px-2 py-1 border border-[#E5E7EB] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
