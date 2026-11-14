import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { SaleInvoice, LineItem, ProductWithNames } from '../../../shared/types';
import { calcLineTotal } from './lineTotal';
import { notify } from '../../components/shared/NotificationProvider';
import { Modal, Input, Field, Button, Tooltip, Banner } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

interface Line extends LineItem {
  _key: string;
}

interface Props {
  invoice: SaleInvoice;
  onClose: () => void;
  onSaved: () => void;
}

// Bulk-edit an existing sale: every line's qty / L / W / price / disc% is editable at once, lines can
// be added or deleted, then one Save applies it all (stock + customer balance are reconciled by the
// sales:update handler).
export default function SaleEditDialog({ invoice, onClose, onSaved }: Props) {
  const [lines, setLines] = useState<Line[]>(() =>
    invoice.items.map((item, i) => ({ ...item, _key: `existing-${i}` }))
  );
  const [discountAmount, setDiscountAmount] = useState(String(invoice.discountAmount));
  const [freightAmount, setFreightAmount] = useState(String(invoice.freightAmount));
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await window.api.products.list();
      return res.ok ? (res.data as ProductWithNames[]) : [];
    },
  });

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !products) return [];
    return products
      .filter((p) => [p.name, p.productCode, p.barcode].filter(Boolean).some((f) => f!.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [products, search]);

  const dimensional = lines.some((l) => l.length || l.width);

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        const next = { ...l, ...patch };
        next.lineTotal = calcLineTotal(next.quantity, next.length, next.width, next.unitPrice, next.discountPercent ?? 0);
        return next;
      })
    );

  const addProduct = (p: ProductWithNames) => {
    const unitPrice = p.retailPrice ?? 0;
    setLines((prev) => [
      ...prev,
      {
        _key: `new-${p.id}-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unit: p.baseUnit,
        length: p.length,
        width: p.width,
        unitPrice,
        discountPercent: 0,
        lineTotal: calcLineTotal(1, p.length, p.width, unitPrice, 0),
      },
    ]);
    setSearch('');
  };

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const total = subtotal - Number(discountAmount || 0) + Number(freightAmount || 0);

  const handleSave = async () => {
    setError(null);
    if (lines.length === 0) return setError('A sale needs at least one line — add a product or cancel.');
    if (lines.some((l) => !(l.quantity > 0))) return setError('Every line needs a quantity greater than zero.');
    setSaving(true);
    const res = await window.api.sales.update(invoice.id, {
      items: lines.map(({ _key, ...item }) => item),
      discountAmount: Number(discountAmount || 0),
      freightAmount: Number(freightAmount || 0),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify(`${invoice.invoiceNumber} updated`, 'success');
    onSaved();
  };

  const numCell = 'px-2 w-full min-w-[3.5rem]';

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Edit ${invoice.invoiceNumber}`}
      description={`${invoice.customerName ?? 'Walk-in'} · ${new Date(invoice.createdDate).toLocaleDateString()}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="warning">
          Saving re-adjusts stock and the customer's balance to match the new quantities and totals.
        </Banner>

        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">{error}</div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Add a product — search by name, code or barcode…"
            className="pl-9"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-md shadow-md max-h-56 overflow-y-auto">
              {results.map((p) => (
                <li
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addProduct(p);
                  }}
                  className="px-3 py-2 flex items-center justify-between text-sm hover:bg-surface-sunken cursor-pointer"
                >
                  <span className="text-ink flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-ink-faint" />
                    {p.name}
                    {p.productCode && <span className="text-xs text-ink-muted font-mono">{p.productCode}</span>}
                  </span>
                  <span className="text-ink font-medium">{formatPKR(p.retailPrice ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-ink-muted text-[12px] uppercase tracking-wide border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-1.5 py-2 font-medium w-20">Qty</th>
                {dimensional && (
                  <>
                    <th className="px-1.5 py-2 font-medium w-20">L</th>
                    <th className="px-1.5 py-2 font-medium w-20">W</th>
                  </>
                )}
                <th className="px-1.5 py-2 font-medium w-28">Price</th>
                <th className="px-1.5 py-2 font-medium w-20">Disc%</th>
                <th className="px-2 py-2 font-medium w-28">Total</th>
                <th className="px-1 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l._key}>
                  <td className="px-3 py-1.5 text-ink">
                    {l.productName}
                    <span className="text-xs text-ink-muted"> · {l.unit}</span>
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Input type="number" min="0" value={l.quantity} className={numCell}
                      onChange={(e) => updateLine(l._key, { quantity: Number(e.target.value) })} />
                  </td>
                  {dimensional && (
                    <>
                      <td className="px-1.5 py-1.5">
                        <Input type="number" min="0" value={l.length ?? ''} className={numCell}
                          onChange={(e) => updateLine(l._key, { length: e.target.value ? Number(e.target.value) : null })} />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input type="number" min="0" value={l.width ?? ''} className={numCell}
                          onChange={(e) => updateLine(l._key, { width: e.target.value ? Number(e.target.value) : null })} />
                      </td>
                    </>
                  )}
                  <td className="px-1.5 py-1.5">
                    <Input type="number" min="0" value={l.unitPrice} className={numCell}
                      onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })} />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Input type="number" min="0" max="100" value={l.discountPercent ?? 0} className={numCell}
                      onChange={(e) => updateLine(l._key, { discountPercent: Number(e.target.value) })} />
                  </td>
                  <td className="px-2 py-1.5 text-ink font-medium whitespace-nowrap">{formatPKR(l.lineTotal)}</td>
                  <td className="px-1 py-1.5">
                    <Tooltip content="Delete this line">
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((x) => x._key !== l._key))}
                        aria-label={`Delete ${l.productName}`}
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
                  <td colSpan={dimensional ? 8 : 6} className="px-4 py-6 text-center text-ink-muted">
                    No lines — search above to add a product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Extra Discount (PKR)">
              <Input type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
            </Field>
            <Field label="Freight (PKR)">
              <Input type="number" min="0" value={freightAmount} onChange={(e) => setFreightAmount(e.target.value)} />
            </Field>
          </div>
          <div className="bg-surface-sunken border border-border rounded-md p-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink font-semibold text-base pt-1 border-t border-border">
              <span>New Total</span>
              <span>{formatPKR(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Previously</span>
              <span>{formatPKR(invoice.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
