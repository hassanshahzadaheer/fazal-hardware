import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ProductWithNames, Customer, LineItem, Settings } from '../../../shared/types';
import { calcLineTotal } from '../sales/lineTotal';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

interface Line extends LineItem {
  _key: string;
}

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function NewQuotationPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dimensional, setDimensional] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [remarks, setRemarks] = useState('');
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [discountAmount, setDiscountAmount] = useState('0');
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
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await window.api.customers.list();
      return res.ok ? (res.data as Customer[]) : [];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await window.api.settings.get();
      return res.ok ? (res.data as Settings) : null;
    },
  });

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !products) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [products, search]);

  const addProduct = (product: ProductWithNames) => {
    const existing = lines.find((l) => l.productId === product.id);
    if (existing) {
      updateLine(existing._key, { quantity: existing.quantity + 1 });
      setSearch('');
      return;
    }
    const unitPrice = product.retailPrice ?? 0;
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

  const buildPayload = () => ({
    customerId: customerId ? Number(customerId) : null,
    customerName: selectedCustomer?.name ?? null,
    customerPhone: customerPhone || null,
    remarks: remarks || null,
    items: lines.map(({ _key, ...item }) => item),
    subtotal,
    discountAmount: Number(discountAmount || 0),
    freightAmount: Number(freightAmount || 0),
    total,
    validUntil,
  });

  const handleSave = async () => {
    setError(null);
    if (lines.length === 0) {
      setError('Add at least one product.');
      return;
    }
    setSubmitting(true);
    const res = await window.api.quotations.create(buildPayload());
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    navigate('/quotations');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rowsHtml = lines
      .map(
        (l) => `<tr>
          <td>${l.productName}</td>
          <td>${l.quantity} ${l.unit}${l.length && l.width ? ` (${l.length}×${l.width})` : ''}</td>
          <td>${formatPKR(l.unitPrice)}</td>
          <td>${formatPKR(l.lineTotal)}</td>
        </tr>`
      )
      .join('');
    win.document.write(`
      <html><head><title>Quotation</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 32px; color: #111827; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
        th { background: #F7F8FA; }
        .totals { margin-top: 16px; max-width: 300px; margin-left: auto; }
        .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
        .btn { margin-top: 24px; padding: 10px 16px; background: #1F6B3B; color: white; border: none; border-radius: 8px; cursor: pointer; }
      </style></head>
      <body>
        <h1>${settings?.companyName ?? 'Fazal Hardware'}</h1>
        <h2>QUOTATION</h2>
        <div>${selectedCustomer?.name ?? ''} ${customerPhone ? '— ' + customerPhone : ''}</div>
        <div>Valid Until: ${validUntil}</div>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        <div class="totals">
          <div><span>Subtotal</span><span>${formatPKR(subtotal)}</span></div>
          <div><span>Discount</span><span>-${formatPKR(Number(discountAmount || 0))}</span></div>
          <div><span>Freight</span><span>${formatPKR(Number(freightAmount || 0))}</span></div>
          <div style="font-weight:700;"><span>NET TOTAL</span><span>${formatPKR(total)}</span></div>
        </div>
        <p style="margin-top:16px; font-size:12px; color:#6B7280;">Prices valid until ${validUntil}</p>
        <button class="btn" onclick="window.print()">Print / Save PDF</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              placeholder="Search products…"
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
                    <span>{p.name}</span>
                    <span className="font-medium">{formatPKR(p.retailPrice ?? 0)}</span>
                  </li>
                ))}
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
          <h2 className="font-semibold text-[#111827]">3. Customer & Details</h2>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Customer (optional)</label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers?.find((x) => x.id === Number(e.target.value));
                setCustomerPhone(c?.phone ?? '');
              }}
              className={inputCls}
            >
              <option value="">—</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Customer Phone</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span className="text-[#111827]">{formatPKR(subtotal)}</span>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Discount (PKR)</label>
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Freight (PKR)</label>
            <input
              type="number"
              min="0"
              value={freightAmount}
              onChange={(e) => setFreightAmount(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex justify-between font-semibold text-[#111827] pt-2 border-t border-[#E5E7EB]">
            <span>Net Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-[#111827] text-sm font-semibold hover:bg-gray-50"
            >
              Print
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D] disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Quotation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
const cellCls =
  'w-full px-2 py-1 border border-[#E5E7EB] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
