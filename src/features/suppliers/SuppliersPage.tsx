import { useMemo, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpenText, Truck } from 'lucide-react';
import { Supplier } from '../../../shared/types';
import LedgerDialog from '../ledger/LedgerDialog';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Input, Field, Modal, EmptyState, Tooltip, confirmDialog, PageHeader, Toolbar } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

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
  const handleDelete = async (supplier: Supplier) => {
    const confirmed = await confirmDialog({
      title: 'Delete supplier?',
      description: `"${supplier.name}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) deleteMutation.mutate(supplier.id);
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Suppliers"
        count={suppliers?.length ?? 0}
        subtitle={`Total payable: ${formatPKR(totalPayable)}`}
      />

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or phone…"
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          }
        />
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={search ? 'No suppliers match your search' : 'No suppliers yet'}
            description={search ? 'Try a different name or phone number.' : 'Add your first supplier to start tracking payables.'}
            action={!search && <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Supplier</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Supplier</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Payable</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink">{supplier.name}</div>
                      {supplier.address && <div className="text-xs text-ink-muted">{supplier.address}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{supplier.phone ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={supplier.balance > 0 ? 'text-danger font-medium' : 'text-success'}>
                        {formatPKR(supplier.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="View ledger (balance history)">
                          <button
                            onClick={() => setViewingLedger(supplier)}
                            aria-label={`Ledger for ${supplier.name}`}
                            className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                          >
                            <BookOpenText className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Edit supplier details">
                          <button
                            onClick={() => openEdit(supplier)}
                            aria-label={`Edit ${supplier.name}`}
                            className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete supplier">
                          <button
                            onClick={() => handleDelete(supplier)}
                            aria-label={`Delete ${supplier.name}`}
                            className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierFormDialog
        open={dialogOpen}
        supplier={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
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
  open,
  supplier,
  onClose,
  onSaved,
}: {
  open: boolean;
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
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? 'Edit Supplier' : 'Add Supplier'}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" variant="primary" loading={submitting}>
            {supplier ? 'Save Changes' : 'Add Supplier'}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <Field label="Name" required>
          <Input required placeholder="e.g. Al-Madina Steel & Hardware" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Phone">
          <Input placeholder="e.g. 0321-9876543" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <Field label="Address">
          <Input placeholder="e.g. Plot 45, Industrial Area, Karachi" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
