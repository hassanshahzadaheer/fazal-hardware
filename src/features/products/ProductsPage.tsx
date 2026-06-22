import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, Edit2, Trash2, Eye, Download, AlertCircle, Loader,
  X, ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Product } from '../../shared/types';

interface Filter {
  search: string;
  category: number | null;
  supplier: number | null;
  lowStockOnly: boolean;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  productId?: number;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>({
    search: '',
    category: null,
    supplier: null,
    lowStockOnly: false
  });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [editData, setEditData] = useState<any>(null);
  const pageSize = 50;

  // Fetch products
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['products', filter, page],
    queryFn: async () => {
      const result = await window.api.products.list({
        search: filter.search || undefined,
        categoryId: filter.category || undefined,
        supplierId: filter.supplier || undefined,
        onlyLowStock: filter.lowStockOnly || undefined,
        page,
        pageSize
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    }
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['products:categories'],
    queryFn: async () => {
      const result = await window.api.products.categories();
      if (!result.ok) throw new Error(result.error.message);
      return result.data || [];
    }
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['products:suppliers'],
    queryFn: async () => {
      const result = await window.api.products.suppliers();
      if (!result.ok) throw new Error(result.error.message);
      return result.data || [];
    }
  });

  // Fetch colors
  const { data: colorsData } = useQuery({
    queryKey: ['products:colors'],
    queryFn: async () => {
      const result = await window.api.products.colors();
      if (!result.ok) throw new Error(result.error.message);
      return result.data || [];
    }
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (dto: any) => window.api.products.create(dto).then(r => {
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModal({ isOpen: false, mode: 'create' });
      setEditData(null);
    }
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: any) => window.api.products.update(id, dto).then(r => {
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModal({ isOpen: false, mode: 'create' });
      setEditData(null);
    }
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.products.deactivate(id).then(r => {
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Fetch product for editing
  const { data: productToEdit, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['products:single', modal.productId],
    queryFn: async () => {
      if (!modal.productId) return null;
      const result = await window.api.products.get(modal.productId);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    enabled: modal.isOpen && modal.mode === 'edit'
  });

  useEffect(() => {
    if (productToEdit) {
      setEditData(productToEdit);
    }
  }, [productToEdit]);

  const handleOpenModal = (mode: 'create' | 'edit', productId?: number) => {
    setModal({ isOpen: true, mode, productId });
    if (mode === 'create') {
      setEditData(null);
    }
  };

  const handleCloseModal = () => {
    setModal({ isOpen: false, mode: 'create' });
    setEditData(null);
  };

  const handleSave = async (formData: any) => {
    try {
      if (modal.mode === 'create') {
        await createMutation.mutateAsync(formData);
      } else if (modal.productId) {
        await updateMutation.mutateAsync({ id: modal.productId, dto: formData });
      }
    } catch (err: any) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err: any) {
        console.error('Delete error:', err);
      }
    }
  };

  const products = productsData?.items || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Products Master</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your product inventory</p>
        </div>
        <button
          onClick={() => handleOpenModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1F6B3B] text-white rounded-lg hover:bg-[#14472A] transition"
        >
          <Plus className="w-5 h-5" />
          New Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search code or name..."
              value={filter.search}
              onChange={(e) => {
                setFilter({ ...filter, search: e.target.value });
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
            />
          </div>

          {/* Category filter */}
          <select
            value={filter.category || ''}
            onChange={(e) => {
              setFilter({ ...filter, category: e.target.value ? parseInt(e.target.value) : null });
              setPage(1);
            }}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
          >
            <option value="">All Categories</option>
            {(categoriesData || []).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Supplier filter */}
          <select
            value={filter.supplier || ''}
            onChange={(e) => {
              setFilter({ ...filter, supplier: e.target.value ? parseInt(e.target.value) : null });
              setPage(1);
            }}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
          >
            <option value="">All Suppliers</option>
            {(suppliersData || []).map(sup => (
              <option key={sup.id} value={sup.id}>{sup.name}</option>
            ))}
          </select>

          {/* Low stock filter */}
          <label className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F7F8FA]">
            <input
              type="checkbox"
              checked={filter.lowStockOnly}
              onChange={(e) => {
                setFilter({ ...filter, lowStockOnly: e.target.checked });
                setPage(1);
              }}
              className="w-4 h-4 rounded border-[#D1D5DB] accent-[#1F6B3B]"
            />
            <span className="text-sm text-[#6B7280]">Low Stock Only</span>
          </label>
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B7280]">
            Showing <span className="font-semibold text-[#111827]">{products.length}</span> of{' '}
            <span className="font-semibold text-[#111827]">{totalCount}</span> products
          </span>
          <button className="flex items-center gap-1 text-[#1F6B3B] hover:underline">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Error state */}
      {productsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error loading products</p>
            <p className="text-sm text-red-700">{(productsError as any)?.message}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoadingProducts ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-[#1F6B3B]" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[#E5E7EB] p-12 text-center">
          <div className="w-12 h-12 mx-auto bg-[#E8F1EA] rounded-lg flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-[#1F6B3B]" />
          </div>
          <p className="text-[#111827] font-medium">No products found</p>
          <p className="text-[#6B7280] text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Products Table */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-[#111827]">Code</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#111827]">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#111827]">Category</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#111827]">Stock</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#111827]">Sale Price</th>
                    <th className="px-6 py-3 text-center font-semibold text-[#111827]">Status</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#111827]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => {
                    const isLowStock = product.currentStock <= product.reorderLevel;
                    const categoryName = categoriesData?.find(c => c.id === product.categoryId)?.name || '-';
                    const price = (product.salePrice / 100).toFixed(2);

                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-[#E5E7EB] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-[#F3F4F6] transition`}
                      >
                        <td className="px-6 py-3 font-mono text-[#111827]">{product.code}</td>
                        <td className="px-6 py-3 text-[#111827]">{product.name}</td>
                        <td className="px-6 py-3 text-[#6B7280]">{categoryName}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`font-semibold ${isLowStock ? 'text-[#DC2626]' : 'text-[#1F6B3B]'}`}>
                            {product.currentStock}
                          </span>
                          {isLowStock && (
                            <span className="ml-2 inline-block">
                              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-[#111827]">Rs {price}</td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              product.isActive
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : 'bg-[#FEE2E2] text-[#991B1B]'
                            }`}
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal('edit', product.id)}
                              className="p-1.5 hover:bg-[#E5E7EB] rounded transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-[#1F6B3B]" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-1.5 hover:bg-[#FEE2E2] rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-[#DC2626]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center py-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F7F8FA] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-[#6B7280]">
                Page <span className="font-semibold text-[#111827]">{page}</span> of{' '}
                <span className="font-semibold text-[#111827]">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F7F8FA] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Product Form Modal */}
      {modal.isOpen && (
        <ProductFormModal
          mode={modal.mode}
          product={editData}
          isLoading={isLoadingProduct || createMutation.isPending || updateMutation.isPending}
          categories={categoriesData || []}
          suppliers={suppliersData || []}
          colors={colorsData || []}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

interface ProductFormModalProps {
  mode: 'create' | 'edit';
  product?: Product;
  isLoading?: boolean;
  categories: any[];
  suppliers: any[];
  colors: any[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

function ProductFormModal({
  mode,
  product,
  isLoading,
  categories,
  suppliers,
  colors,
  onSave,
  onClose
}: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    code: product?.code || '',
    name: product?.name || '',
    categoryId: product?.categoryId || null,
    supplierId: product?.supplierId || null,
    colorId: product?.colorId || null,
    unit: product?.unit || 'pcs',
    packSize: product?.packSize || '',
    isCutToSize: product?.isCutToSize || false,
    purchasePrice: product ? product.purchasePrice / 100 : 0,
    salePrice: product ? product.salePrice / 100 : 0,
    minPrice: product ? product.minPrice / 100 : 0,
    defaultLength: product?.defaultLength || '',
    defaultWidth: product?.defaultWidth || '',
    reorderLevel: product?.reorderLevel || 0,
    openingStock: product?.openingStock || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = 'Product code is required';
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (formData.salePrice < 0) newErrors.salePrice = 'Sale price must be positive';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        ...formData,
        purchasePrice: Math.round(formData.purchasePrice * 100),
        salePrice: Math.round(formData.salePrice * 100),
        minPrice: Math.round(formData.minPrice * 100)
      };
      await onSave(payload);
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#111827]">
            {mode === 'create' ? 'Add New Product' : 'Edit Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F7F8FA] rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold text-[#111827] mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Product Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={mode === 'edit'}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none disabled:bg-[#F7F8FA]"
                  placeholder="e.g., AL-P4"
                />
                {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                  placeholder="e.g., Aluminum Patti 4 Inch"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Category
                </label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Supplier
                </label>
                <select
                  value={formData.supplierId || ''}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Color/Model
                </label>
                <select
                  value={formData.colorId || ''}
                  onChange={(e) => setFormData({ ...formData, colorId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                >
                  <option value="">Select Color</option>
                  {colors.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                >
                  <option value="pcs">Pieces</option>
                  <option value="sheet">Sheet</option>
                  <option value="sqft">Sq Ft</option>
                  <option value="rft">Running Ft</option>
                  <option value="kg">Kilogram</option>
                  <option value="set">Set</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCutToSize}
                  onChange={(e) => setFormData({ ...formData, isCutToSize: e.target.checked })}
                  className="w-4 h-4 rounded border-[#D1D5DB] accent-[#1F6B3B]"
                />
                <span className="text-sm font-medium text-[#111827]">Cut-to-size available</span>
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="font-semibold text-[#111827] mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Purchase Price (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Sale Price (Rs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                />
                {errors.salePrice && <p className="text-xs text-red-600 mt-1">{errors.salePrice}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Minimum Price (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minPrice}
                  onChange={(e) => setFormData({ ...formData, minPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h3 className="font-semibold text-[#111827] mb-4">Inventory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Opening Stock
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.openingStock}
                  onChange={(e) => setFormData({ ...formData, openingStock: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Reorder Level
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                />
              </div>

              {formData.isCutToSize && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-2">
                      Default Length
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.defaultLength}
                      onChange={(e) => setFormData({ ...formData, defaultLength: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-2">
                      Default Width
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.defaultWidth}
                      onChange={(e) => setFormData({ ...formData, defaultWidth: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1F6B3B] focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="border-t border-[#E5E7EB] pt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F7F8FA] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-[#1F6B3B] text-white rounded-lg hover:bg-[#14472A] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Create Product' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
