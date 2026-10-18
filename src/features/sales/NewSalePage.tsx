import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ProductWithNames, Customer, LineItem, Quotation } from '../../../shared/types';
import { calcLineTotal } from './lineTotal';
import { notify } from '../../components/shared/NotificationProvider';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

type PaymentMode = 'cash' | 'card' | 'credit' | 'partial';
type PriceTier = 'retail' | 'wholesale';

interface Line extends LineItem {
  _key: string;
}

function linesFromQuotation(quotation: Quotation): Line[] {
  return quotation.items.map((item, i) => ({ ...item, _key: `qt-${quotation.id}-${i}` }));
}

export default function NewSalePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromQuotation = (location.state as { fromQuotation?: Quotation } | null)?.fromQuotation ?? null;

  const [search, setSearch] = useState('');
  const [dimensional, setDimensional] = useState(false);
  const [lines, setLines] = useState<Line[]>(fromQuotation ? linesFromQuotation(fromQuotation) : []);
  const [customerId, setCustomerId] = useState(fromQuotation?.customerId?.toString() ?? '');
  const [priceTier, setPriceTier] = useState<PriceTier>('retail');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState(fromQuotation ? String(fromQuotation.discountAmount) : '0');
  const [freightAmount, setFreightAmount] = useState(fromQuotation ? String(fromQuotation.freightAmount) : '0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await window.api.products.list();
      return res.ok ? (res.data as ProductWithNames[]) : [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await window.api.customers.list();
      return res.ok ? (res.data as Customer[]) : [];
    },
  });

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !products) return [];
    return products
      .filter((p) => [p.name, p.barcode, p.rackLocation].filter(Boolean).some((f) => f!.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [products, search]);

  const addProduct = (product: ProductWithNames) => {
    const existing = lines.find((l) => l.productId === product.id);
    if (existing) {
      updateLine(existing._key, { quantity: existing.quantity + 1 });
      setSearch('');
      return;
    }
    const unitPrice = (priceTier === 'wholesale' ? product.wholesalePrice ?? product.retailPrice : product.retailPrice) ?? 0;
    const newLine: Line = {
      _key: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unit: product.baseUnit,
      length: null,
      width: null,
      unitPrice,
      discountPercent: 0,
      lineTotal: calcLineTotal(1, null, null, unitPrice, 0),
    };
    setLines((prev) => [...prev, newLine]);
    setSearch('');
  };

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        const next = { ...l, ...patch };
        next.lineTotal = calcLineTotal(next.quantity, next.length, next.width, next.unitPrice, next.discountPercent ?? 0);
        return next;
      })
    );
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l._key !== key));

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.lineTotal, 0), [lines]);
  const total = useMemo(
    () => subtotal - Number(discountAmount || 0) + Number(freightAmount || 0),
    [subtotal, discountAmount, freightAmount]
  );

  const selectedCustomer = customers?.find((c) => c.id === Number(customerId));

  const handleSubmit = async () => {
    setError(null);
    if (lines.length === 0) {
      setError('Add at least one product.');
      return;
    }
    if (paymentMode === 'partial' && (!paidAmount || Number(paidAmount) <= 0)) {
      setError('Enter how much the customer paid now.');
      return;
    }

    setSubmitting(true);
    const payload = {
      customerId: customerId ? Number(customerId) : null,
      customerName: selectedCustomer?.name ?? null,
      items: lines.map(({ _key, ...item }) => item),
      subtotal,
      discountAmount: Number(discountAmount || 0),
      freightAmount: Number(freightAmount || 0),
      total,
      paidAmount: paymentMode === 'partial' ? Number(paidAmount) : 0,
      paymentMode,
      priceTier,
      quotationId: fromQuotation?.id ?? null,
    };

    const res = await window.api.sales.create(payload);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify(`Sale completed — ${formatPKR(total)}`, 'success');
    navigate('/sales');
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {fromQuotation && (
        <div className="lg:col-span-3 text-sm bg-blue-50 text-blue-800 border border-blue-200 rounded-lg px-4 py-2.5">
          Converting quotation <strong>{fromQuotation.quotationNumber}</strong> — completing this sale will mark
          it as converted.
        </div>
      )}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#111827]">1. Add Products</h2>
            <button
              onClick={() => setDimensional((v) => !v)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                dimensional ? 'bg-[#1F6B3B] text-white border-[#1F6B3B]' : 'text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              Dimensional (L×W)
            </button>
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, barcode, or rack location…"
              autoFocus
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((p) => {
                  const price = priceTier === 'wholesale' ? p.wholesalePrice ?? p.retailPrice : p.retailPrice;
                  const low = p.reorderLevel !== null && p.stockOnHand <= p.reorderLevel;
                  return (
                    <li
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="px-3 py-2 flex items-center justify-between text-sm hover:bg-[#F7F8FA] cursor-pointer"
                    >
                      <div>
                        <div className="text-[#111827]">{p.name}</div>
                        <div className={`text-xs ${low ? 'text-rose-600' : 'text-[#6B7280]'}`}>
                          {p.stockOnHand} {p.baseUnit} in stock
                        </div>
                      </div>
                      <span className="text-[#111827] font-medium">{formatPKR(price ?? 0)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <h2 className="font-semibold text-[#111827] px-5 pt-4 pb-2">2. Review Items</h2>
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium w-20">Qty</th>
                {dimensional && (
                  <>
                    <th className="px-4 py-2 font-medium w-20">L</th>
                    <th className="px-4 py-2 font-medium w-20">W</th>
                  </>
                )}
                <th className="px-4 py-2 font-medium w-28">Price</th>
                <th className="px-4 py-2 font-medium w-20">Disc%</th>
                <th className="px-4 py-2 font-medium w-28">Total</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {lines.map((l) => (
                <tr key={l._key}>
                  <td className="px-4 py-2 text-[#111827]">{l.productName}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => updateLine(l._key, { quantity: Number(e.target.value) })}
                      className={cellCls}
                    />
                  </td>
                  {dimensional && (
                    <>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          value={l.length ?? ''}
                          onChange={(e) => updateLine(l._key, { length: e.target.value ? Number(e.target.value) : null })}
                          className={cellCls}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          value={l.width ?? ''}
                          onChange={(e) => updateLine(l._key, { width: e.target.value ? Number(e.target.value) : null })}
                          className={cellCls}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })}
                      className={cellCls}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={l.discountPercent ?? 0}
                      onChange={(e) => updateLine(l._key, { discountPercent: Number(e.target.value) })}
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
                  <td colSpan={dimensional ? 8 : 6} className="px-4 py-8 text-center text-[#6B7280]">
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
          <h2 className="font-semibold text-[#111827]">3. Customer & Payment</h2>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Customer (optional)</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
              <option value="">Walk-in</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Price Type</label>
            <select
              value={priceTier}
              onChange={(e) => setPriceTier(e.target.value as PriceTier)}
              className={inputCls}
            >
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className={inputCls}
            >
              <option value="cash">Cash — Paid now in cash</option>
              <option value="card">Card — Paid by debit/credit card</option>
              <option value="credit">Credit — Customer will pay later</option>
              <option value="partial">Partial — Paid some, rest on credit</option>
            </select>
          </div>

          {paymentMode === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">How much did they pay now?</label>
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
            <label className="block text-xs text-[#6B7280] mb-1">Extra Discount (PKR)</label>
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className={inputCls}
            />
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
              {formatPKR(total)} will be added to the customer's udhaar.
            </div>
          )}
          {paymentMode === 'partial' && Number(paidAmount) > 0 && (
            <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
              {formatPKR(Math.max(0, total - Number(paidAmount)))} remains on udhaar.
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[#1F6B3B] text-white font-semibold text-sm hover:bg-[#17522D] disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Complete Sale'}
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
