import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import ProductFormDialog from './ProductFormDialog';
import { notify } from '../../components/shared/NotificationProvider';

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

  const handleDelete = (product: ProductWithNames) => {
    if (confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(product.id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#111827]">Products</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#E8F1EA] text-[#1F6B3B] text-xs font-semibold">
            {products?.length ?? 0}
          </span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, category, brand, barcode, or location…"
        className="w-full max-w-md mb-4 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
      />

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Brand</th>
                <th className="px-4 py-2.5 font-medium">Stock</th>
                <th className="px-4 py-2.5 font-medium">Retail Price</th>
                <th className="px-4 py-2.5 font-medium">Cost Price</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((product) => {
                const lowStock =
                  product.reorderLevel !== null && product.stockOnHand <= product.reorderLevel;
                const variants = variantSummary(product);
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[#111827]">{product.name}</div>
                      {variants && <div className="text-xs text-[#6B7280]">{variants}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{product.categoryName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{product.brandName ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`flex items-center gap-1 ${
                          lowStock ? 'text-rose-600 font-medium' : 'text-[#111827]'
                        }`}
                      >
                        {lowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                        {product.stockOnHand} {product.baseUnit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#111827]">{formatPKR(product.retailPrice)}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{formatPKR(product.costPrice)}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{product.rackLocation ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="text-[#6B7280] hover:text-[#111827]"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-[#6B7280] hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">
                    {search ? 'No products match your search.' : 'No products yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormDialog
        open={dialogOpen}
        product={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
