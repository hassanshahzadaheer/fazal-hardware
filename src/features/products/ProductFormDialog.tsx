import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PRODUCT_CATEGORIES } from '../../../shared/constants';
import { ProductWithNames } from '../../../shared/types';
import { notify } from '../../components/shared/NotificationProvider';
import { Modal, Field, Input, SearchableSelect, Button } from '../../components/ui';

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

    // Fields removed from the form (min/wholesale price, units, variant, rack) are neither sent on
    // update — so existing values survive — nor required on create (baseUnit defaults to 'piece').
    const editable = {
      productCode: form.productCode.trim() || null,
      name: form.name,
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

        {/* Field order follows the client's reference screen. DOM order == tab order, and Enter
            advances like Tab (see handleEnterAsTab); Enter on the last field submits. */}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Product</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Field label="Product Code">
              <Input
                ref={firstFieldRef}
                value={form.productCode}
                onChange={(e) => set('productCode', e.target.value)}
                placeholder="e.g. UV-NOVA-7946"
              />
            </Field>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <Field label="Product Name" required>
              <Input required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. PVC Pipe 4 inch"
              />
            </Field>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Field label="Company">
              <SearchableSelect
                value={form.brandId}
                onChange={(v) => set('brandId', v)}
                options={companyOptions}
                placeholder="Select company"
              />
            </Field>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <Field label="Category">
              <SearchableSelect
                value={form.categoryId}
                onChange={(v) => set('categoryId', v)}
                options={categoryOptions}
                placeholder="Select category"
              />
            </Field>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <Field label="Color/Mode">
              <Input
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                placeholder="e.g. White"
              />
            </Field>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
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
          <div className="col-span-12 sm:col-span-6">
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
          <div className="col-span-12 sm:col-span-6">
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
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Dimensions & Stock</h3>
          <div className="grid grid-cols-12 gap-x-4 gap-y-3.5">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
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
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
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
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
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
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
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
