import { useState, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BASE_UNITS } from '../../../shared/constants';
import { ProductWithNames } from '../../../shared/types';
import { parseVariantText, stringifyVariant } from './variantAttributes';
import { notify } from '../../components/shared/NotificationProvider';
import { Modal, Field, Input, Select, Button } from '../../components/ui';

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
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" variant="primary" loading={submitting}>
            {product ? 'Save Changes' : 'Add Product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1 -mt-1 mb-2 border-b border-border">
          {(['details', 'barcode'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {key === 'details' ? 'Product Details' : 'Barcode Lookup'}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {tab === 'details' && (
          <>
            <Field label="Name" required>
              <Input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. PVC Pipe 4 inch"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">—</option>
                  {(categories ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Brand">
                <Select value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
                  <option value="">—</option>
                  {(brands ?? []).map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Variant Details" hint='e.g. "thickness:18mm, grade:Commercial"'>
              <Input
                value={form.variantText}
                onChange={(e) => set('variantText', e.target.value)}
                placeholder="e.g. thickness:18mm, grade:Commercial"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Selling Unit" required>
                <Select required value={form.baseUnit} onChange={(e) => set('baseUnit', e.target.value)}>
                  <option value="">—</option>
                  {BASE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Purchase Unit">
                <Input
                  value={form.purchaseUnit}
                  onChange={(e) => set('purchaseUnit', e.target.value)}
                  placeholder="e.g. box, bundle, carton"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Items Per Purchase Unit"
                hint="How many selling units make up one purchase unit — e.g. 1 box = 144 pieces, so enter 144."
              >
                <Input
                  type="number"
                  min="0"
                  value={form.purchaseUnitFactor}
                  onChange={(e) => set('purchaseUnitFactor', e.target.value)}
                  placeholder="e.g. 144"
                />
              </Field>
              <Field label="Low Stock Alert Level">
                <Input
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) => set('reorderLevel', e.target.value)}
                  placeholder="e.g. 10"
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Retail Price (PKR)">
                <Input
                  type="number"
                  min="0"
                  value={form.retailPrice}
                  onChange={(e) => set('retailPrice', e.target.value)}
                  placeholder="e.g. 450"
                />
              </Field>
              <Field label="Wholesale Price (PKR)">
                <Input
                  type="number"
                  min="0"
                  value={form.wholesalePrice}
                  onChange={(e) => set('wholesalePrice', e.target.value)}
                  placeholder="e.g. 400"
                />
              </Field>
              <Field label="Cost Price (PKR)">
                <Input
                  type="number"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => set('costPrice', e.target.value)}
                  placeholder="e.g. 350"
                />
              </Field>
            </div>

            <Field label="Shelf/Rack Location">
              <Input
                value={form.rackLocation}
                onChange={(e) => set('rackLocation', e.target.value)}
                placeholder="e.g. Aisle 3, Shelf B"
              />
            </Field>
          </>
        )}

        {tab === 'barcode' && (
          <Field label="Barcode" hint="Manual entry for now — camera scanning lands later.">
            <Input
              value={form.barcode}
              onChange={(e) => set('barcode', e.target.value)}
              placeholder="Scan or type the barcode"
              autoFocus
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
