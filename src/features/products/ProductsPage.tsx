import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, AlertTriangle, PackageSearch } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import ProductFormDialog from './ProductFormDialog';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, EmptyState, Tooltip, confirmDialog, PageHeader, Toolbar } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number | null): string {
  if (amount === null) return '—';
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function variantSummary(product: ProductWithNames): string | null {
  if (!product.variantAttributes) return null;
  const values = Object.values(product.variantAttributes);
  return values.length > 0 ? values.join(' · ') : null;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithNames | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await window.api.products.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as ProductWithNames[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await window.api.products.delete(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      notify('Product deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.categoryName, p.brandName, p.barcode, p.rackLocation]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [products, search]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductWithNames) => {
    setEditing(product);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDelete = async (product: ProductWithNames) => {
    const confirmed = await confirmDialog({
      title: 'Delete product?',
      description: `"${product.name}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) deleteMutation.mutate(product.id);
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Products"
        count={products?.length ?? 0}
        subtitle="Catalog, pricing, and stock levels for every item you sell."
      />

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, category, brand, barcode, or location…"
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          }
        />
        {isLoading ? (
          <TableSkeleton cols={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={search ? 'No products match your search' : 'No products yet'}
            description={search ? 'Try a different name, brand, or barcode.' : 'Add your first product to start tracking stock and pricing.'}
            action={!search && <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Product</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Product</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Category</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Brand</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Retail Price</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Cost Price</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Location</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((product) => {
                  const lowStock =
                    product.reorderLevel !== null && product.stockOnHand <= product.reorderLevel;
                  const variants = variantSummary(product);
                  return (
                    <tr key={product.id} className="hover:bg-surface-sunken/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{product.name}</div>
                        {variants && <div className="text-xs text-ink-muted">{variants}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{product.categoryName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{product.brandName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {lowStock ? (
                          <span className="inline-flex items-center gap-1 text-danger font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {product.stockOnHand} {product.baseUnit}
                          </span>
                        ) : (
                          <span className="text-ink">
                            {product.stockOnHand} {product.baseUnit}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink tabular-nums">{formatPKR(product.retailPrice)}</td>
                      <td className="px-4 py-2.5 text-ink-muted tabular-nums">{formatPKR(product.costPrice)}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{product.rackLocation ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip content="Edit product details">
                            <button
                              onClick={() => openEdit(product)}
                              aria-label={`Edit ${product.name}`}
                              className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Delete this product permanently">
                            <button
                              onClick={() => handleDelete(product)}
                              aria-label={`Delete ${product.name}`}
                              className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormDialog
        open={dialogOpen}
        product={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
