import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { ChevronDown, PackagePlus, Pencil, RotateCcw, Save, Tag, Wallet, Warehouse, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PRODUCT_CATEGORIES } from '../../../shared/constants';
import { ProductWithNames } from '../../../shared/types';
import { notify } from '../../components/shared/NotificationProvider';
import { Field, Input, SearchableSelect, Button } from '../../components/ui';

interface Props {
  product: ProductWithNames | null; // null = create mode
  prefill?: { key: number; product: ProductWithNames } | null; // "duplicate" — new product seeded from an existing one
  onCancelEdit: () => void;
  onSaved: () => void;
}

interface FormState {
  productCode: string;
  name: string;
  color: string;
  packingSize: string;
  length: string;
  width: string;
  categoryId: string;
  brandId: string;
  barcode: string;
  retailPrice: string;
  costPrice: string;
  reorderLevel: string;
}

function emptyForm(): FormState {
  return {
    productCode: '',
    color: '',
    packingSize: '',
    length: '',
    width: '',
    name: '',
    categoryId: '',
    brandId: '',
    barcode: '',
    retailPrice: '',
    costPrice: '',
    reorderLevel: '',
  };
}

function formFromProduct(product: ProductWithNames): FormState {
  return {
    productCode: product.productCode ?? '',
    color: product.color ?? '',
    packingSize: product.packingSize ?? '',
    length: product.length?.toString() ?? '',
    width: product.width?.toString() ?? '',
    name: product.name,
    categoryId: product.categoryId?.toString() ?? '',
    brandId: product.brandId?.toString() ?? '',
    barcode: product.barcode ?? '',
    retailPrice: product.retailPrice?.toString() ?? '',
    costPrice: product.costPrice?.toString() ?? '',
    reorderLevel: product.reorderLevel?.toString() ?? '',
  };
}

const DEFAULT_BASE_UNIT = 'piece';

type Errors = Partial<Record<keyof FormState, string>>;

const numberOrUndefined = (v: string) => (v.trim() === '' ? undefined : Number(v));

const NUMERIC_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'costPrice', label: 'Purchase price' },
  { key: 'retailPrice', label: 'Sale price' },
  { key: 'length', label: 'Length' },
  { key: 'width', label: 'Width' },
  { key: 'reorderLevel', label: 'Reorder level' },
];

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'Product name is required';
  for (const { key, label } of NUMERIC_FIELDS) {
    const raw = form[key].trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[key] = `${label} must be a number`;
    else if (n < 0) errors[key] = `${label} can't be negative`;
  }
  return errors;
}

function SectionCard({
  icon: Icon,
  title,
  className = '',
  children,
}: {
  icon: typeof Tag;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-border bg-surface-sunken/50 p-4 ${className}`}>
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink mb-3">
        <Icon className="w-4 h-4 text-ink-faint" strokeWidth={1.75} />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function ProductFormPanel({ product, prefill, onCancelEdit, onSaved }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Load the selected product (or a duplicate template) into the form, or reset to blank.
  useEffect(() => {
    setErrors({});
    setError(null);
    if (product) {
      setForm(formFromProduct(product));
    } else if (prefill) {
      // Duplicate: identifiers must be unique, so they start empty.
      setForm({ ...formFromProduct(prefill.product), productCode: '', barcode: '' });
    } else {
      setForm(emptyForm());
      return undefined;
    }
    setCollapsed(false);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [product, prefill]);

  // Ctrl/Cmd+S saves from anywhere on the page.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await window.api.categories.list();
      return res.ok ? res.data : [];
    },
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await window.api.brands.list();
      return res.ok ? res.data : [];
    },
  });

  // Only the three client categories are offered; a product that still points at an older category
  // keeps it as an extra option so editing doesn't silently blank it.
  const categoryOptions = (() => {
    const all = (categories ?? []) as { id: number; name: string }[];
    const fixed = PRODUCT_CATEGORIES.map((n) => all.find((c) => c.name.toLowerCase() === n.toLowerCase())).filter(
      (c): c is { id: number; name: string } => !!c
    );
    const legacy = all.find((c) => c.id === product?.categoryId && !fixed.includes(c));
    return [...fixed, ...(legacy ? [legacy] : [])].map((c) => ({ value: String(c.id), label: c.name }));
  })();
  const companyOptions = ((brands ?? []) as { id: number; name: string }[]).map((b) => ({
    value: String(b.id),
    label: b.name,
  }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const validateField = (key: keyof FormState) => {
    const msg = validate(form)[key];
    if (msg) setErrors((e) => ({ ...e, [key]: msg }));
  };

  // Enter behaves like Tab: move to the next field in DOM order; on the last field, submit.
  const handleEnterAsTab = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;
    e.preventDefault();
    const fields = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea') ?? []
    ).filter((el) => !(el as HTMLInputElement).disabled && (el as HTMLInputElement).type !== 'hidden');
    const idx = fields.indexOf(target);
    if (idx >= 0 && idx < fields.length - 1) fields[idx + 1].focus();
    else formRef.current?.requestSubmit();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // Defer so aria-invalid is on the DOM before we look for the first bad field.
      setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    setSubmitting(true);
    // Fields removed from the form (min/wholesale price, units, variant, rack) are neither sent on
    // update — so existing values survive — nor required on create (baseUnit defaults to 'piece').
    const editable = {
      productCode: form.productCode.trim() || null,
      name: form.name.trim(),
      brandId: form.brandId ? Number(form.brandId) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      color: form.color.trim() || null,
      packingSize: form.packingSize.trim() || null,
      costPrice: numberOrUndefined(form.costPrice) ?? null,
      retailPrice: numberOrUndefined(form.retailPrice) ?? null,
      length: numberOrUndefined(form.length) ?? null,
      width: numberOrUndefined(form.width) ?? null,
      reorderLevel: numberOrUndefined(form.reorderLevel) ?? null,
      barcode: form.barcode.trim() || null,
    };
    const payload = product ? editable : { ...editable, baseUnit: DEFAULT_BASE_UNIT };

    const res = product
      ? await window.api.products.update(product.id, payload)
      : await window.api.products.create(payload);

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify(product ? 'Product updated' : 'Product added', 'success');
    if (!product) {
      // Stay ready for the next entry: blank form, cursor back on the first field.
      setForm(emptyForm());
      setErrors({});
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
    onSaved();
  };

  const handleReset = () => {
    if (product) onCancelEdit();
    setForm(emptyForm());
    setErrors({});
    setError(null);
    firstFieldRef.current?.focus();
  };

  // Live margin so the owner sees profitability while typing prices.
  const cost = numberOrUndefined(form.costPrice);
  const sale = numberOrUndefined(form.retailPrice);
  const hasPrices = cost !== undefined && sale !== undefined && Number.isFinite(cost) && Number.isFinite(sale);
  const profit = hasPrices ? sale! - cost! : 0;
  const marginPct = hasPrices && sale! > 0 ? (profit / sale!) * 100 : null;
  const belowCost = hasPrices && profit < 0;

  const errorCount = Object.values(errors).filter(Boolean).length;
  // Compact control height for the dense form.
  const ctl = '!h-9 !text-[13px]';

  const f = (key: keyof FormState) => ({
    error: !!errors[key],
    'aria-invalid': errors[key] ? (true as const) : undefined,
    onBlur: () => validateField(key),
  });

  return (
    <div
      className={`bg-surface border rounded-xl shadow-card mb-6 overflow-hidden transition-colors ${
        product ? 'border-ink/30' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            product ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-accent'
          }`}
        >
          {product ? <Pencil className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink truncate">
            {product ? `Editing: ${product.name}` : prefill ? 'Add Product · copy' : 'Add Product'}
          </h2>
          <p className="text-xs text-ink-muted truncate">
            {product
              ? 'Update the details, then save. Pick another row to switch.'
              : 'Fill in the details and save — the product appears in the list below.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand form' : 'Collapse form'}
          className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-full p-2 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleEnterAsTab}
        hidden={collapsed}
        noValidate
        className="p-5 space-y-4"
      >
        {(error || errorCount > 0) && (
          <div
            role="alert"
            className="flex items-center gap-2 text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error ?? `Please fix ${errorCount} highlighted ${errorCount === 1 ? 'field' : 'fields'} before saving.`}
          </div>
        )}

        {/* DOM order == tab order == the client's reference screen. Enter advances like Tab;
            Enter on the last field submits. */}
        <div className="grid grid-cols-12 gap-4">
          <SectionCard icon={Tag} title="Product details" className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-6 gap-x-3 gap-y-3">
              <div className="col-span-6 sm:col-span-2">
                <Field label="Product Code">
                  <Input ref={firstFieldRef} className={ctl} value={form.productCode}
                    onChange={(e) => set('productCode', e.target.value)} placeholder="e.g. UV-NOVA-7946" />
                </Field>
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Field label="Product Name" required error={errors.name}>
                  <Input className={ctl} {...f('name')} value={form.name}
                    onChange={(e) => set('name', e.target.value)} placeholder="e.g. PVC Pipe 4 inch" />
                </Field>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Field label="Company">
                  <SearchableSelect className={ctl} value={form.brandId} onChange={(v) => set('brandId', v)}
                    options={companyOptions} placeholder="Select company" />
                </Field>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Field label="Category">
                  <SearchableSelect className={ctl} value={form.categoryId} onChange={(v) => set('categoryId', v)}
                    options={categoryOptions} placeholder="Select category" />
                </Field>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Field label="Color / Mode">
                  <Input className={ctl} value={form.color} onChange={(e) => set('color', e.target.value)}
                    placeholder="e.g. White" />
                </Field>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Field label="Packing Size">
                  <Input className={ctl} value={form.packingSize} onChange={(e) => set('packingSize', e.target.value)}
                    placeholder="e.g. 1 Ltr, 20 Kg" />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Wallet} title="Pricing (PKR)" className="col-span-12 lg:col-span-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              <div className="col-span-1">
                <Field label="Purchase Price" error={errors.costPrice}>
                  <Input type="number" step="any" className={ctl} {...f('costPrice')} value={form.costPrice}
                    onChange={(e) => set('costPrice', e.target.value)} placeholder="350" />
                </Field>
              </div>
              <div className="col-span-1">
                <Field label="Sale Price" error={errors.retailPrice}>
                  <Input type="number" step="any" className={ctl} {...f('retailPrice')} value={form.retailPrice}
                    onChange={(e) => set('retailPrice', e.target.value)} placeholder="450" />
                </Field>
              </div>
            </div>
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${
                !hasPrices
                  ? 'bg-surface text-ink-faint border border-dashed border-border-strong'
                  : belowCost
                    ? 'bg-danger-soft text-danger'
                    : 'bg-success-soft text-success'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              {!hasPrices ? (
                'Enter both prices to see the margin'
              ) : belowCost ? (
                <span>Selling below cost · {profit.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
              ) : (
                <span>
                  Profit {profit.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                  {marginPct !== null && ` · ${marginPct.toFixed(1)}% margin`}
                </span>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Warehouse} title="Dimensions & stock" className="col-span-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3">
              <Field label="Length" error={errors.length}>
                <Input type="number" step="any" className={ctl} {...f('length')} value={form.length}
                  onChange={(e) => set('length', e.target.value)} placeholder="e.g. 8" />
              </Field>
              <Field label="Width" error={errors.width}>
                <Input type="number" step="any" className={ctl} {...f('width')} value={form.width}
                  onChange={(e) => set('width', e.target.value)} placeholder="e.g. 4" />
              </Field>
              <Field label="Reorder Level" error={errors.reorderLevel} hint="Low-stock alert below this">
                <Input type="number" step="any" className={ctl} {...f('reorderLevel')} value={form.reorderLevel}
                  onChange={(e) => set('reorderLevel', e.target.value)} placeholder="e.g. 10" />
              </Field>
              <Field label="Barcode">
                <Input className={ctl} value={form.barcode} onChange={(e) => set('barcode', e.target.value)}
                  placeholder="Scan or type" />
              </Field>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">
            <kbd className="font-mono">Enter</kbd> next field · <kbd className="font-mono">Ctrl+S</kbd> save
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5" />
              {product ? 'Cancel edit' : 'Clear'}
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              <Save className="w-3.5 h-3.5" />
              {product ? 'Save Changes' : 'Save Product'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
