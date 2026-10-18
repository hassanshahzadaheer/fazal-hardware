import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { ProductWithNames, Supplier, PurchaseLineItem } from '../../../shared/types';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Field, Input, Select, Tooltip } from '../../components/ui';

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
      notify(res.error.message, 'error');
      return;
    }
    notify(`Purchase recorded — ${formatPKR(total)}`, 'success');
    navigate('/purchases');
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-surface border border-border rounded-md p-5">
          <h2 className="font-semibold text-ink mb-3">1. Add Products You Received</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or barcode…"
              autoFocus
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="px-3 py-2 flex items-center justify-between text-sm hover:bg-surface-sunken cursor-pointer"
                  >
                    <div>
                      <div className="text-ink">{p.name}</div>
                      <div className="text-xs text-ink-muted">
                        {p.stockOnHand} {p.baseUnit} in stock
                      </div>
                    </div>
                    <span className="text-ink font-medium">{formatPKR(p.costPrice ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <h2 className="font-semibold text-ink px-5 pt-4 pb-2">2. Review Quantities & Prices</h2>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide">Product</th>
                <th className="px-2 py-2.5 font-medium text-[12px] uppercase tracking-wide w-16">Qty</th>
                <th className="px-2 py-2.5 font-medium text-[12px] uppercase tracking-wide w-20">Rate</th>
                <th className="px-3 py-2.5 font-medium text-[12px] uppercase tracking-wide w-24">Total</th>
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l._key} className="hover:bg-surface-sunken/60 transition-colors">
                  <td className="px-3 py-2 text-ink">
                    {l.productName} <span className="text-xs text-ink-muted">({l.unit})</span>
                  </td>
                  <td className="px-1 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => updateLine(l._key, { quantity: Number(e.target.value) })}
                      className="w-16"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })}
                      className="w-20"
                    />
                  </td>
                  <td className="px-3 py-2 text-ink font-medium tabular-nums whitespace-nowrap">{formatPKR(l.lineTotal)}</td>
                  <td className="px-1 py-1.5">
                    <Tooltip content="Remove this item from the purchase">
                      <button
                        onClick={() => removeLine(l._key)}
                        aria-label={`Remove ${l.productName}`}
                        className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
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
          <h2 className="font-semibold text-ink">3. Supplier & Payment</h2>

          <Field label="Supplier (optional)">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Payment Method">
            <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
              <option value="partial">Partial</option>
            </Select>
          </Field>

          {paymentMode === 'partial' && (
            <Field label="Amount Paid Now">
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

        <div className="bg-surface border border-border rounded-md p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink">{formatPKR(subtotal)}</span>
          </div>
          <Field label="Freight / Carriage (PKR)">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 1500"
              value={freightAmount}
              onChange={(e) => setFreightAmount(e.target.value)}
            />
          </Field>
          <div className="flex justify-between font-semibold text-ink pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          {paymentMode === 'credit' && (
            <div className="text-xs bg-warning-soft text-warning border border-warning/20 rounded-md px-3 py-2">
              {formatPKR(total)} will be added to the supplier's payable.
            </div>
          )}

          {error && (
            <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">{error}</div>
          )}

          <Button variant="primary" onClick={handleSubmit} loading={submitting} className="w-full">
            Record Purchase & Update Stock
          </Button>
        </div>
      </div>
    </div>
  );
}
