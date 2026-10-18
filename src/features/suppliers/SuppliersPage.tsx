import { useMemo, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, BookOpenText } from 'lucide-react';
import { Supplier } from '../../../shared/types';
import LedgerDialog from '../ledger/LedgerDialog';
import { notify } from '../../components/shared/NotificationProvider';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewingLedger, setViewingLedger] = useState<Supplier | null>(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await window.api.suppliers.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as Supplier[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await window.api.suppliers.delete(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      notify('Supplier deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.phone].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const totalPayable = useMemo(
    () => (suppliers ?? []).reduce((sum, s) => sum + s.balance, 0),
    [suppliers]
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setDialogOpen(true);
  };
  const handleSaved = () => {
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  };
  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Delete "${supplier.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#111827]">Suppliers</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#E8F1EA] text-[#1F6B3B] text-xs font-semibold">
            {suppliers?.length ?? 0}
          </span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>
      <p className="text-sm text-[#6B7280] mb-4">Total payable: {formatPKR(totalPayable)}</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or phone…"
        className="w-full max-w-md mb-4 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
      />

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
                <th className="px-4 py-2.5 font-medium">Payable</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-[#111827]">{supplier.name}</div>
                    {supplier.address && <div className="text-xs text-[#6B7280]">{supplier.address}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{supplier.phone ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={supplier.balance > 0 ? 'text-rose-700 font-medium' : 'text-emerald-700'}>
                      {formatPKR(supplier.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingLedger(supplier)}
                        className="text-[#6B7280] hover:text-[#111827]"
                        title="Ledger"
                      >
                        <BookOpenText className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(supplier)} className="text-[#6B7280] hover:text-[#111827]" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier)}
                        className="text-[#6B7280] hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">
                    {search ? 'No suppliers match your search.' : 'No suppliers yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <SupplierFormDialog supplier={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
      )}
      {viewingLedger && (
        <LedgerDialog
          partyType="supplier"
          partyId={viewingLedger.id}
          partyName={viewingLedger.name}
          balance={viewingLedger.balance}
          onClose={() => setViewingLedger(null)}
        />
      )}
    </div>
  );
}

function SupplierFormDialog({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = { name, phone: phone || null, address: address || null };
    const res = supplier
      ? await window.api.suppliers.update(supplier.id, payload)
      : await window.api.suppliers.create(payload);

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify(supplier ? 'Supplier updated' : 'Supplier added', 'success');
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">{supplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">
              Name <span className="text-rose-600">*</span>
            </label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
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
              {submitting ? 'Saving…' : supplier ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
