import { useState, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { BASE_UNITS } from '../../../shared/constants';
import { ProductWithNames } from '../../../shared/types';
import { parseVariantText, stringifyVariant } from './variantAttributes';
import { notify } from '../../components/shared/NotificationProvider';

interface Props {
  open: boolean;
  product: ProductWithNames | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  categoryId: string;
  brandId: string;
  variantText: string;
  baseUnit: string;
  purchaseUnit: string;
  purchaseUnitFactor: string;
  barcode: string;
  retailPrice: string;
  wholesalePrice: string;
  costPrice: string;
  reorderLevel: string;
  rackLocation: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    categoryId: '',
    brandId: '',
    variantText: '',
    baseUnit: '',
    purchaseUnit: '',
    purchaseUnitFactor: '',
    barcode: '',
    retailPrice: '',
    wholesalePrice: '',
    costPrice: '',
    reorderLevel: '',
    rackLocation: '',
  };
}

function formFromProduct(product: ProductWithNames): FormState {
  return {
    name: product.name,
    categoryId: product.categoryId?.toString() ?? '',
    brandId: product.brandId?.toString() ?? '',
    variantText: stringifyVariant(product.variantAttributes),
    baseUnit: product.baseUnit,
    purchaseUnit: product.purchaseUnit ?? '',
    purchaseUnitFactor: product.purchaseUnitFactor?.toString() ?? '',
    barcode: product.barcode ?? '',
    retailPrice: product.retailPrice?.toString() ?? '',
    wholesalePrice: product.wholesalePrice?.toString() ?? '',
    costPrice: product.costPrice?.toString() ?? '',
    reorderLevel: product.reorderLevel?.toString() ?? '',
    rackLocation: product.rackLocation ?? '',
  };
}

const numberOrUndefined = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function ProductFormDialog({ open, product, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'details' | 'barcode'>('details');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? formFromProduct(product) : emptyForm());
      setError(null);
      setTab('details');
    }
  }, [open, product]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await window.api.categories.list();
      return res.ok ? res.data : [];
    },
    enabled: open,
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await window.api.brands.list();
      return res.ok ? res.data : [];
    },
    enabled: open,
  });

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      name: form.name,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brandId: form.brandId ? Number(form.brandId) : null,
      variantAttributes: parseVariantText(form.variantText),
      baseUnit: form.baseUnit,
      purchaseUnit: form.purchaseUnit || null,
      purchaseUnitFactor: numberOrUndefined(form.purchaseUnitFactor) ?? null,
      barcode: form.barcode || null,
      retailPrice: numberOrUndefined(form.retailPrice) ?? null,
      wholesalePrice: numberOrUndefined(form.wholesalePrice) ?? null,
      costPrice: numberOrUndefined(form.costPrice) ?? null,
      reorderLevel: numberOrUndefined(form.reorderLevel) ?? null,
      rackLocation: form.rackLocation || null,
    };

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
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-[#E5E7EB]">
          {(['details', 'barcode'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-[#1F6B3B] text-[#1F6B3B]'
                  : 'border-transparent text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {key === 'details' ? 'Product Details' : 'Barcode Lookup'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {tab === 'details' && (
            <>
              <Field label="Name" required>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <select
                    value={form.categoryId}
                    onChange={(e) => set('categoryId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {(categories ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand">
                  <select
                    value={form.brandId}
                    onChange={(e) => set('brandId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {(brands ?? []).map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Variant Details" hint='e.g. "thickness:18mm, grade:Commercial"'>
                <input
                  value={form.variantText}
                  onChange={(e) => set('variantText', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Selling Unit" required>
                  <select
                    required
                    value={form.baseUnit}
                    onChange={(e) => set('baseUnit', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {BASE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Purchase Unit">
                  <input
                    value={form.purchaseUnit}
                    onChange={(e) => set('purchaseUnit', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Items Per Purchase Unit">
                  <input
                    type="number"
                    min="0"
                    value={form.purchaseUnitFactor}
                    onChange={(e) => set('purchaseUnitFactor', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Low Stock Alert Level">
                  <input
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => set('reorderLevel', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Retail Price (PKR)">
                  <input
                    type="number"
                    min="0"
                    value={form.retailPrice}
                    onChange={(e) => set('retailPrice', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Wholesale Price (PKR)">
                  <input
                    type="number"
                    min="0"
                    value={form.wholesalePrice}
                    onChange={(e) => set('wholesalePrice', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Cost Price (PKR)">
                  <input
                    type="number"
                    min="0"
                    value={form.costPrice}
                    onChange={(e) => set('costPrice', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Shelf/Rack Location">
                <input
                  value={form.rackLocation}
                  onChange={(e) => set('rackLocation', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </>
          )}

          {tab === 'barcode' && (
            <Field label="Barcode" hint="Manual entry for now — camera scanning lands later.">
              <input
                value={form.barcode}
                onChange={(e) => set('barcode', e.target.value)}
                className={inputCls}
                autoFocus
              />
            </Field>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D] disabled:opacity-60"
            >
              {submitting ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111827] mb-1">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#6B7280] mt-1">{hint}</p>}
    </div>
  );
}
