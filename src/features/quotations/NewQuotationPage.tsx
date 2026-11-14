import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Search } from 'lucide-react';
import { ProductWithNames, Customer, LineItem, Settings } from '../../../shared/types';
import { calcLineTotal } from '../sales/lineTotal';
import { Field, Input, SearchableSelect, Button, Tooltip } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

interface Line extends LineItem {
  _key: string;
}

// Auto-retrieved read-only details shown under a selected product (company, code, size, dimensions).
function productDetails(p: ProductWithNames | undefined): string {
  if (!p) return '';
  return [
    p.brandName,
    p.productCode,
    p.categoryName,
    p.color,
    p.packingSize,
    p.length && p.width ? `${p.length}×${p.width}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
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
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const pendingFocusKey = useRef<string | null>(null);

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
    return products
      .filter((p) =>
        [p.name, p.productCode, p.brandName, p.barcode].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [products, search]);

  const productById = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  // After a product is picked, jump straight to its Quantity box (keyboard flow).
  useEffect(() => {
    const key = pendingFocusKey.current;
    if (!key) return;
    const el = rootRef.current?.querySelector<HTMLInputElement>(`[data-line="${key}"][data-field="qty"]`);
    if (el) {
      pendingFocusKey.current = null;
      el.focus();
      el.select();
    }
  }, [lines]);

  const addProduct = (product: ProductWithNames) => {
    const existing = lines.find((l) => l.productId === product.id);
    if (existing) {
      updateLine(existing._key, { quantity: existing.quantity + 1 });
      pendingFocusKey.current = existing._key;
      setSearch('');
      setHighlight(0);
      return;
    }
    const unitPrice = product.retailPrice ?? 0;
    const key = `${product.id}-${Date.now()}`;
    const newLine: Line = {
      _key: key,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unit: product.baseUnit,
      // Dimensions stored on the product are pre-filled — no re-entry.
      length: product.length,
      width: product.width,
      unitPrice,
      discountPercent: 0,
      lineTotal: calcLineTotal(1, product.length, product.width, unitPrice, 0),
    };
    if (product.length && product.width) setDimensional(true);
    pendingFocusKey.current = key;
    setLines((prev) => [...prev, newLine]);
    setSearch('');
    setHighlight(0);
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

  const focusFirstPanelField = () =>
    rootRef.current?.querySelector<HTMLElement>('[data-nav="panel"]')?.focus();

  // Product search: arrows move, Enter picks the highlighted product; Enter on an empty box means
  // "done adding" and moves on to the customer/details panel.
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && searchResults.length) {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp' && searchResults.length) {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (searchResults.length) addProduct(searchResults[Math.min(highlight, searchResults.length - 1)]);
      else if (!search.trim()) focusFirstPanelField();
    } else if (e.key === 'Escape' && search) {
      e.stopPropagation();
      setSearch('');
    }
  };

  // Enter-as-Tab for the rest of the screen: Quantity -> (L, W) -> Price -> Disc% within a line, then
  // back to product search for the next product; panel fields run in order and end on Save.
  const handleEnterNav = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const target = e.target as HTMLElement;
    const nav = target.dataset.nav;
    if (nav === 'line') {
      e.preventDefault();
      const row = target.closest('tr');
      const inputs = Array.from(row?.querySelectorAll<HTMLElement>('[data-nav="line"]') ?? []);
      const next = inputs[inputs.indexOf(target) + 1];
      if (next) next.focus();
      else searchRef.current?.focus();
    } else if (nav === 'panel') {
      e.preventDefault();
      const fields = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-nav="panel"]') ?? []);
      const next = fields[fields.indexOf(target) + 1];
      if (next) next.focus();
      else saveRef.current?.focus();
    }
  };

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
          <td>${l.productName}${productDetails(productById.get(l.productId)) ? `<br/><small style="color:#6B7280">${productDetails(productById.get(l.productId))}</small>` : ''}</td>
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
    <div ref={rootRef} onKeyDown={handleEnterNav} className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              ref={searchRef}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by name, code or company… (Enter to add)"
              autoFocus
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-md max-h-64 overflow-y-auto">
                {searchResults.map((p, i) => (
                  <li
                    key={p.id}
                    onClick={() => addProduct(p)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`px-3 py-2 flex items-center justify-between text-sm cursor-pointer ${
                      i === highlight ? 'bg-surface-sunken' : ''
                    }`}
                  >
                    <div>
                      <div className="text-ink">{p.name}</div>
                      <div className="text-xs text-ink-muted">
                        {[p.productCode, p.brandName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="text-ink font-medium">{formatPKR(p.retailPrice ?? 0)}</span>
                  </li>
                ))}
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
                    <td className="px-3 py-1.5">
                      <div className="text-ink">{l.productName}</div>
                      {productDetails(productById.get(l.productId)) && (
                        <div className="text-xs text-ink-muted">{productDetails(productById.get(l.productId))}</div>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={l.quantity}
                        data-nav="line"
                        data-line={l._key}
                        data-field="qty"
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
                            data-nav="line"
                            onChange={(e) => updateLine(l._key, { length: e.target.value ? Number(e.target.value) : null })}
                            className="w-14 px-1.5"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            value={l.width ?? ''}
                            data-nav="line"
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
                        data-nav="line"
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
                        data-nav="line"
                        onChange={(e) => updateLine(l._key, { discountPercent: Number(e.target.value) })}
                        className="w-16 px-2"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-ink font-medium">{formatPKR(l.lineTotal)}</td>
                    <td className="px-1 py-1.5">
                      <Tooltip content="Remove this item from the quotation">
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
          <h2 className="font-semibold text-ink">3. Customer & Details</h2>
          <Field label="Customer (optional)">
            <SearchableSelect
              data-nav="panel"
              value={customerId}
              onChange={(v) => {
                setCustomerId(v);
                const c = customers?.find((x) => x.id === Number(v));
                setCustomerPhone(c?.phone ?? '');
              }}
              options={(customers ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder="Walk-in customer"
            />
          </Field>
          <Field label="Customer Phone">
            <Input
              data-nav="panel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 0300-1234567"
            />
          </Field>
          <Field label="Remarks">
            <Input
              data-nav="panel"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Deliver by Friday, customer requested"
            />
          </Field>
          <Field label="Valid Until">
            <Input data-nav="panel" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>

        <div className="bg-surface-sunken border border-border rounded-md p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink font-semibold">{formatPKR(subtotal)}</span>
          </div>
          <Field label="Discount (PKR)">
            <Input
              data-nav="panel"
              type="number"
              min="0"
              placeholder="e.g. 500 or leave blank"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
          </Field>
          <Field label="Freight (PKR)">
            <Input
              data-nav="panel"
              type="number"
              min="0"
              placeholder="e.g. 1500"
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
            <Button ref={saveRef} type="button" variant="primary" loading={submitting} onClick={handleSave} className="flex-1">
              Save Quotation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
