import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Search } from 'lucide-react';
import { ProductWithNames, Customer, LineItem, Quotation } from '../../../shared/types';
import { calcLineTotal } from './lineTotal';
import { notify } from '../../components/shared/NotificationProvider';
import { Field, Input, Select, Button, Tooltip, Banner } from '../../components/ui';

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
        <div className="lg:col-span-3 text-sm bg-accent-soft text-accent border border-accent-soft-border rounded-md px-4 py-2.5">
          Converting quotation <strong>{fromQuotation.quotationNumber}</strong> — completing this sale will mark
          it as converted.
        </div>
      )}
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
              placeholder="Search by name, barcode, or rack location…"
              autoFocus
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-md max-h-64 overflow-y-auto">
                {searchResults.map((p) => {
                  const price = priceTier === 'wholesale' ? p.wholesalePrice ?? p.retailPrice : p.retailPrice;
                  const low = p.reorderLevel !== null && p.stockOnHand <= p.reorderLevel;
                  return (
                    <li
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="px-3 py-2 flex items-center justify-between text-sm hover:bg-surface-sunken cursor-pointer"
                    >
                      <div>
                        <div className="text-ink">{p.name}</div>
                        <div className={`text-xs ${low ? 'text-danger' : 'text-ink-muted'}`}>
                          {p.stockOnHand} {p.baseUnit} in stock
                        </div>
                      </div>
                      <span className="text-ink font-medium">{formatPKR(price ?? 0)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <h2 className="font-semibold text-ink px-5 pt-4 pb-2">2. Review Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Product</th>
                  <th className="px-1.5 py-2 font-medium text-[12px] uppercase tracking-wide w-16">Qty</th>
                  {dimensional && (
                    <>
                      <th className="px-1.5 py-2 font-medium text-[12px] uppercase tracking-wide w-14">L</th>
                      <th className="px-1.5 py-2 font-medium text-[12px] uppercase tracking-wide w-14">W</th>
                    </>
                  )}
                  <th className="px-1.5 py-2 font-medium text-[12px] uppercase tracking-wide w-20">Price</th>
                  <th className="px-1.5 py-2 font-medium text-[12px] uppercase tracking-wide w-16">
                    <Tooltip content="Discount applied to this line only, before the order-level discount below">
                      <span>Disc%</span>
                    </Tooltip>
                  </th>
                  <th className="px-2 py-2 font-medium text-[12px] uppercase tracking-wide w-20">Total</th>
                  <th className="px-1 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l) => (
                  <tr key={l._key} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-3 py-1.5 text-ink">{l.productName}</td>
                    <td className="px-1.5 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={l.quantity}
                        onChange={(e) => updateLine(l._key, { quantity: Number(e.target.value) })}
                        className="w-16 px-2"
                      />
                    </td>
                    {dimensional && (
                      <>
                        <td className="px-1.5 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            value={l.length ?? ''}
                            onChange={(e) => updateLine(l._key, { length: e.target.value ? Number(e.target.value) : null })}
                            className="w-14 px-1.5"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            value={l.width ?? ''}
                            onChange={(e) => updateLine(l._key, { width: e.target.value ? Number(e.target.value) : null })}
                            className="w-14 px-1.5"
                          />
                        </td>
                      </>
                    )}
                    <td className="px-1.5 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={l.unitPrice}
                        onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })}
                        className="w-20 px-2"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={l.discountPercent ?? 0}
                        onChange={(e) => updateLine(l._key, { discountPercent: Number(e.target.value) })}
                        className="w-16 px-2"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-ink font-medium">{formatPKR(l.lineTotal)}</td>
                    <td className="px-1 py-1.5">
                      <Tooltip content="Remove this item from the sale">
                        <button
                          onClick={() => removeLine(l._key)}
                          aria-label={`Remove ${l.productName}`}
                          className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
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
      </div>

      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-md p-5 space-y-4">
          <h2 className="font-semibold text-ink">3. Customer & Payment</h2>

          <Field label="Customer (optional)">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Price Type" hint="Wholesale price applies only to items added after switching">
            <Select value={priceTier} onChange={(e) => setPriceTier(e.target.value as PriceTier)}>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
            </Select>
          </Field>

          <Field label="Payment Method">
            <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
              <option value="cash">Cash — Paid now in cash</option>
              <option value="card">Card — Paid by debit/credit card</option>
              <option value="credit">Credit — Customer will pay later</option>
              <option value="partial">Partial — Paid some, rest on credit</option>
            </Select>
          </Field>

          {(paymentMode === 'credit' || paymentMode === 'partial') && !customerId && (
            <Banner tone="warning">
              Select a customer above so this unpaid balance can be tracked against their account — a walk-in sale
              has no one to collect the udhaar from later.
            </Banner>
          )}

          {paymentMode === 'partial' && (
            <Field label="How much did they pay now?">
              <Input
                type="number"
                min="0"
                placeholder="e.g. 5000"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </Field>
          )}
        </div>

        <div className="bg-surface-sunken border border-border rounded-md p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink font-semibold">{formatPKR(subtotal)}</span>
          </div>
          <Field label="Extra Discount (PKR)">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 500 or leave blank"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
          </Field>
          <Field label="Freight / Carriage (PKR)">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 1500"
              value={freightAmount}
              onChange={(e) => setFreightAmount(e.target.value)}
            />
          </Field>
          <div className="flex justify-between text-lg font-semibold text-ink pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          {paymentMode === 'credit' && (
            <div className="text-xs bg-warning-soft text-warning border border-warning/20 rounded-md px-3 py-2">
              {formatPKR(total)} will be added to the customer's udhaar.
            </div>
          )}
          {paymentMode === 'partial' && Number(paidAmount) > 0 && (
            <div className="text-xs bg-warning-soft text-warning border border-warning/20 rounded-md px-3 py-2">
              {formatPKR(Math.max(0, total - Number(paidAmount)))} remains on udhaar.
            </div>
          )}

          {error && (
            <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            loading={submitting}
            onClick={handleSubmit}
            className="w-full"
          >
            Complete Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
