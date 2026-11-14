import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
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
  productCode: string;
  name: string;
  color: string;
  packingSize: string;
  minSalePrice: string;
  length: string;
  width: string;
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
    productCode: '',
    color: '',
    packingSize: '',
    minSalePrice: '',
    length: '',
    width: '',
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
    productCode: product.productCode ?? '',
    color: product.color ?? '',
    packingSize: product.packingSize ?? '',
    minSalePrice: product.minSalePrice?.toString() ?? '',
    length: product.length?.toString() ?? '',
    width: product.width?.toString() ?? '',
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
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? formFromProduct(product) : emptyForm());
      setError(null);
      // Modal moves focus to its close button on open; hand it to the first field so the form
      // is usable from the keyboard immediately.
      const t = setTimeout(() => firstFieldRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return undefined;
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
    setSubmitting(true);

    const payload = {
      productCode: form.productCode.trim() || null,
      color: form.color.trim() || null,
      packingSize: form.packingSize.trim() || null,
      minSalePrice: numberOrUndefined(form.minSalePrice) ?? null,
      length: numberOrUndefined(form.length) ?? null,
      width: numberOrUndefined(form.width) ?? null,
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
      size="xl"
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
      <form
        id="product-form"
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleEnterAsTab}
        className="space-y-5"
      >
        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Field order follows the client's reference screen. DOM order == tab order, and Enter
            advances like Tab (see handleEnterAsTab); Enter on the last field submits. */}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Product</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Product Code">
              <Input
                ref={firstFieldRef}
                value={form.productCode}
                onChange={(e) => set('productCode', e.target.value)}
                placeholder="e.g. UV-NOVA-7946"
                pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*"
                title="Letters, numbers and dashes only (e.g. UV-NOVA-7946)"
              />
            </Field>
          </div>
          <div className={'col-span-12 lg:col-span-6'}>
            <Field label="Product Name" required>
              <Input
              required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. PVC Pipe 4 inch"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Company">
              <Select value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
                <option value="">Select company</option>
                {(brands ?? []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Category">
              <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Select category</option>
                {(categories ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Color/Mode">
              <Input
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                placeholder="e.g. White"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Packing Size">
              <Input
                value={form.packingSize}
                onChange={(e) => set('packingSize', e.target.value)}
                placeholder="e.g. 1 Ltr, 20 Kg"
              />
            </Field>
          </div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Pricing</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Pur Price (PKR)">
              <Input
                type="number"
                min="0"
                value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)}
                placeholder="e.g. 350"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Sale Price (PKR)">
              <Input
                type="number"
                min="0"
                value={form.retailPrice}
                onChange={(e) => set('retailPrice', e.target.value)}
                placeholder="e.g. 450"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Min Sale Price (PKR)">
              <Input
                type="number"
                min="0"
                value={form.minSalePrice}
                onChange={(e) => set('minSalePrice', e.target.value)}
                placeholder="e.g. 420"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Wholesale Price (PKR)">
              <Input
                type="number"
                min="0"
                value={form.wholesalePrice}
                onChange={(e) => set('wholesalePrice', e.target.value)}
                placeholder="e.g. 400"
              />
            </Field>
          </div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Dimensions & Stock</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Length">
              <Input
                type="number"
                min="0"
                step="any"
                value={form.length}
                onChange={(e) => set('length', e.target.value)}
                placeholder="e.g. 8"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Width">
              <Input
                type="number"
                min="0"
                step="any"
                value={form.width}
                onChange={(e) => set('width', e.target.value)}
                placeholder="e.g. 4"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Reorder Level">
              <Input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => set('reorderLevel', e.target.value)}
                placeholder="e.g. 10"
              />
            </Field>
          </div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Units</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Selling Unit" required>
              <Select required value={form.baseUnit} onChange={(e) => set('baseUnit', e.target.value)}>
                <option value="">Select unit</option>
                {BASE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Purchase Unit">
              <Input
                value={form.purchaseUnit}
                onChange={(e) => set('purchaseUnit', e.target.value)}
                placeholder="e.g. box, bundle"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <Field label="Items Per Purchase Unit">
              <Input
                type="number"
                min="0"
                value={form.purchaseUnitFactor}
                onChange={(e) => set('purchaseUnitFactor', e.target.value)}
                placeholder="e.g. 144"
              title="How many selling units make up one purchase unit — e.g. 1 box = 144 pieces, so enter 144."
              />
            </Field>
          </div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Other</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className={'col-span-12 lg:col-span-6'}>
            <Field label="Variant Details">
              <Input
                value={form.variantText}
                onChange={(e) => set('variantText', e.target.value)}
                placeholder="thickness:18mm, grade:Commercial"
                title="Format: key:value pairs separated by commas"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Shelf/Rack Location">
              <Input
                value={form.rackLocation}
                onChange={(e) => set('rackLocation', e.target.value)}
                placeholder="e.g. Aisle 3, Shelf B"
              />
            </Field>
          </div>
          <div className={'col-span-12 sm:col-span-6 lg:col-span-3'}>
            <Field label="Barcode">
              <Input
                value={form.barcode}
                onChange={(e) => set('barcode', e.target.value)}
                placeholder="Scan or type"
              />
            </Field>
          </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}
