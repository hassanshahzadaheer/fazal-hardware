import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, PackageSearch } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import ProductFormDialog from './ProductFormDialog';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, EmptyState, Tooltip, confirmDialog, PageHeader, Toolbar, Badge, Pagination } from '../../components/ui';
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

// A small rotating palette gives each row a tiny bit of visual identity —
// deterministic per product id, not random, so it doesn't reshuffle on
// every re-render/refetch.
const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
  'bg-danger-soft text-danger',
  'bg-surface-sunken text-ink-muted',
];

type StockStatus = 'out' | 'low' | 'ok';

function stockStatus(product: ProductWithNames): StockStatus {
  if (product.stockOnHand <= 0) return 'out';
  if (product.reorderLevel !== null && product.stockOnHand <= product.reorderLevel) return 'low';
  return 'ok';
}

const STOCK_DOT: Record<StockStatus, string> = {
  out: 'bg-danger',
  low: 'bg-warning',
  ok: 'bg-success',
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithNames | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
    // Newest first, so a just-added product lands at the top of the list.
    const newestFirst = [...products].sort((a, b) => b.id - a.id);
    if (!q) return newestFirst;
    return newestFirst.filter((p) =>
      [p.productCode, p.name, p.categoryName, p.brandName, p.barcode, p.rackLocation]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [products, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

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
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by code, name, category, brand, barcode, or location…"
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          }
        />
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={search ? 'No products match your search' : 'No products yet'}
            description={search ? 'Try a different name, brand, or barcode.' : 'Add your first product to start tracking stock and pricing.'}
            action={!search && <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Product</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Product</th>
                    <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Category / Brand</th>
                    <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Stock</th>
                    <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Retail / Cost</th>
                    <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Location</th>
                    <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((product) => {
                    const status = stockStatus(product);
                    const variants = variantSummary(product);
                    const tone = AVATAR_TONES[product.id % AVATAR_TONES.length];
                    return (
                      <tr key={product.id} className="hover:bg-surface-sunken/60 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-semibold shrink-0 ${tone}`}
                            >
                              {product.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-ink truncate">{product.name}</div>
                              {product.productCode && (
                                <div className="text-xs text-ink-muted font-mono truncate">{product.productCode}</div>
                              )}
                              {variants && <div className="text-xs text-ink-muted truncate">{variants}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {product.categoryName && <Badge tone="neutral">{product.categoryName}</Badge>}
                            {product.brandName && <Badge tone="accent">{product.brandName}</Badge>}
                            {!product.categoryName && !product.brandName && <span className="text-ink-faint">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STOCK_DOT[status]}`} />
                            <span className={status === 'ok' ? 'text-ink' : status === 'low' ? 'text-warning font-medium' : 'text-danger font-medium'}>
                              {product.stockOnHand} {product.baseUnit}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="text-ink font-medium tabular-nums">{formatPKR(product.retailPrice)}</div>
                          <div className="text-xs text-ink-muted tabular-nums">{formatPKR(product.costPrice)}</div>
                        </td>
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
            <Pagination
              page={safePage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
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
