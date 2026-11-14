import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Pencil, Trash2, PackageSearch } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import ProductFormPanel from './ProductFormPanel';
import { notify } from '../../components/shared/NotificationProvider';
import { EmptyState, Tooltip, confirmDialog, PageHeader, Toolbar, Badge, Pagination } from '../../components/ui';
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
  const [editing, setEditing] = useState<ProductWithNames | null>(null);
  const [prefill, setPrefill] = useState<{ key: number; product: ProductWithNames } | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | StockStatus>('all');
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
    const newestFirst = [...products]
      .sort((a, b) => b.id - a.id)
      .filter((p) => stockFilter === 'all' || stockStatus(p) === stockFilter);
    if (!q) return newestFirst;
    return newestFirst.filter((p) =>
      [p.productCode, p.name, p.categoryName, p.brandName, p.barcode, p.rackLocation]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [products, search, stockFilter]);

  const counts = useMemo(() => {
    const c = { all: products?.length ?? 0, ok: 0, low: 0, out: 0 };
    products?.forEach((p) => { c[stockStatus(p)] += 1; });
    return c;
  }, [products]);

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

  const openDuplicate = (product: ProductWithNames) => {
    setEditing(null);
    setPrefill({ key: Date.now(), product });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (product: ProductWithNames) => {
    setPrefill(null);
    setEditing(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaved = () => {
    setEditing(null);
    setPrefill(null);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDelete = async (product: ProductWithNames) => {
    const confirmed = await confirmDialog({
      title: 'Delete product?',
      description: `"${product.name}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      if (editing?.id === product.id) setEditing(null);
      deleteMutation.mutate(product.id);
    }
  };

  return (
    <div className="px-8 pb-8 max-w-[1400px]">
      <PageHeader
        title="Products"
        count={products?.length ?? 0}
        subtitle="Catalog, pricing, and stock levels for every item you sell."
      />

      <ProductFormPanel product={editing} prefill={prefill} onCancelEdit={() => setEditing(null)} onSaved={handleSaved} />

      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search products…"
          filters={
            <div className="flex items-center gap-1 p-1 rounded-full bg-surface-sunken border border-border">
              {([
                ['all', 'All'],
                ['ok', 'In stock'],
                ['low', 'Low'],
                ['out', 'Out'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setStockFilter(key); setPage(1); }}
                  className={`h-8 px-3.5 rounded-full text-[13px] transition-colors ${
                    stockFilter === key ? 'bg-surface text-ink font-medium shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {label} <span className="text-ink-faint tabular-nums">{counts[key]}</span>
                </button>
              ))}
            </div>
          }
        />
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={search ? 'No products match your search' : 'No products yet'}
            description={search ? 'Try a different name, brand, or barcode.' : 'Use the form above to add your first product.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto px-3">
              <table className="w-full text-sm">
                <thead className="text-left text-ink-muted">
                  <tr className="bg-surface-sunken">
                    <th className="px-5 py-3 font-medium text-[12.5px]">Product</th>
                    <th className="px-5 py-3 font-medium text-[12.5px]">Category / Brand</th>
                    <th className="px-5 py-3 font-medium text-[12.5px]">Stock</th>
                    <th className="px-5 py-3 font-medium text-[12.5px]">Retail / Cost</th>
                    <th className="px-5 py-3 font-medium text-[12.5px]">Location</th>
                    <th className="px-5 py-3 font-medium text-[12.5px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {paged.map((product) => {
                    const status = stockStatus(product);
                    const variants = variantSummary(product);
                    const tone = AVATAR_TONES[product.id % AVATAR_TONES.length];
                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          editing?.id === product.id ? 'bg-accent-soft/50' : 'hover:bg-surface-sunken/60'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${tone}`}
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
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {product.categoryName && <Badge tone="neutral">{product.categoryName}</Badge>}
                            {product.brandName && <Badge tone="accent">{product.brandName}</Badge>}
                            {!product.categoryName && !product.brandName && <span className="text-ink-faint">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STOCK_DOT[status]}`} />
                            <span className={status === 'ok' ? 'text-ink' : status === 'low' ? 'text-warning font-medium' : 'text-danger font-medium'}>
                              {product.stockOnHand} {product.baseUnit}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-ink font-medium tabular-nums">{formatPKR(product.retailPrice)}</div>
                          <div className="text-xs text-ink-muted tabular-nums">{formatPKR(product.costPrice)}</div>
                        </td>
                        <td className="px-5 py-3.5 text-ink-muted">{product.rackLocation ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip content="Edit product details">
                              <button
                                onClick={() => openEdit(product)}
                                aria-label={`Edit ${product.name}`}
                                className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-full p-2 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Duplicate as a new product">
                              <button
                                onClick={() => openDuplicate(product)}
                                aria-label={`Duplicate ${product.name}`}
                                className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-full p-2 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Delete this product permanently">
                              <button
                                onClick={() => handleDelete(product)}
                                aria-label={`Delete ${product.name}`}
                                className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-full p-2 transition-colors"
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
    </div>
  );
}
