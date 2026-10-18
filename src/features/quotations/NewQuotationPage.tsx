import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Search } from 'lucide-react';
import { ProductWithNames, Customer, LineItem, Settings } from '../../../shared/types';
import { calcLineTotal } from '../sales/lineTotal';
import { Field, Input, Select, Button } from '../../components/ui';

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

  // Print output is a standalone print-safe HTML document rendered in a new
  // window — it intentionally uses fixed hex colors (not design tokens) since
  // it's meant to look identical on paper regardless of the app's theme.
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
        <div className="bg-surface border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink">1. Add Products</h2>
            <button
              onClick={() => setDimensional((v) => !v)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                dimensional
                  ? 'bg-accent text-white border-accent'
                  : 'text-ink-muted border-border hover:bg-surface-sunken'
              }`}
            >
              Dimensional (L×W)
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              autoFocus
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-md max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="px-3 py-2 flex items-center justify-between text-sm hover:bg-surface-sunken cursor-pointer"
                  >
                    <span className="text-ink">{p.name}</span>
                    <span className="text-ink font-medium">{formatPKR(p.retailPrice ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <h2 className="font-semibold text-ink px-5 pt-4 pb-2">2. Review Items</h2>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
              <tr>
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide">Product</th>
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide w-20">Qty</th>
                {dimensional && (
                  <>
                    <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide w-20">L</th>
                    <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide w-20">W</th>
                  </>
                )}
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide w-28">Price</th>
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide w-20">Disc%</th>
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide w-28">Total</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l._key} className="hover:bg-surface-sunken/60 transition-colors">
                  <td className="px-4 py-2 text-ink">{l.productName}</td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => updateLine(l._key, { quantity: Number(e.target.value) })}
                      className="w-20"
                    />
                  </td>
                  {dimensional && (
                    <>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={l.length ?? ''}
                          onChange={(e) => updateLine(l._key, { length: e.target.value ? Number(e.target.value) : null })}
                          className="w-20"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={l.width ?? ''}
                          onChange={(e) => updateLine(l._key, { width: e.target.value ? Number(e.target.value) : null })}
                          className="w-20"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })}
                      className="w-28"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={l.discountPercent ?? 0}
                      onChange={(e) => updateLine(l._key, { discountPercent: Number(e.target.value) })}
                      className="w-20"
                    />
                  </td>
                  <td className="px-4 py-2 text-ink font-medium">{formatPKR(l.lineTotal)}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeLine(l._key)}
                      aria-label={`Remove ${l.productName}`}
                      className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={dimensional ? 8 : 6} className="px-4 py-8 text-center text-ink-muted">
                    Search and add products above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-md p-5 space-y-4">
          <h2 className="font-semibold text-ink">3. Customer & Details</h2>
          <Field label="Customer (optional)">
            <Select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers?.find((x) => x.id === Number(e.target.value));
                setCustomerPhone(c?.phone ?? '');
              }}
            >
              <option value="">—</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Customer Phone">
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </Field>
          <Field label="Remarks">
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Field>
          <Field label="Valid Until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>

        <div className="bg-surface-sunken border border-border rounded-md p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink font-semibold">{formatPKR(subtotal)}</span>
          </div>
          <Field label="Discount (PKR)">
            <Input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
          </Field>
          <Field label="Freight (PKR)">
            <Input
              type="number"
              min="0"
              value={freightAmount}
              onChange={(e) => setFreightAmount(e.target.value)}
            />
          </Field>
          <div className="flex justify-between text-lg font-semibold text-ink pt-2 border-t border-border">
            <span>Net Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handlePrint} className="flex-1">
              Print
            </Button>
            <Button type="button" variant="primary" loading={submitting} onClick={handleSave} className="flex-1">
              Save Quotation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
