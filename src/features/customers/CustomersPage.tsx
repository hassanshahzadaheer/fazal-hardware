import { useMemo, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpenText, Users, Search } from 'lucide-react';
import { Customer } from '../../../shared/types';
import { CUSTOMER_TYPES, CustomerType } from '../../../shared/constants';
import LedgerDialog from '../ledger/LedgerDialog';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Input, Select, Field, Modal, Badge, EmptyState, Tooltip, confirmDialog } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const TYPE_BADGE_TONE: Record<CustomerType, 'accent' | 'warning' | 'neutral'> = {
  retail: 'accent',
  contractor: 'neutral',
  wholesale: 'warning',
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewingLedger, setViewingLedger] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await window.api.customers.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as Customer[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await window.api.customers.delete(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      notify('Customer deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalReceivable = useMemo(
    () => (customers ?? []).reduce((sum, c) => sum + c.balance, 0),
    [customers]
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setDialogOpen(true);
  };
  const handleSaved = () => {
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };
  const handleDelete = async (customer: Customer) => {
    const confirmed = await confirmDialog({
      title: 'Delete customer?',
      description: `"${customer.name}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) deleteMutation.mutate(customer.id);
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-ink tracking-tight">Customers</h1>
            <Badge tone="accent">{customers?.length ?? 0}</Badge>
          </div>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Total receivable: {formatPKR(totalReceivable)}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      <div className="relative w-full max-w-sm mb-4">
        <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="pl-9"
        />
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No customers match your search' : 'No customers yet'}
            description={search ? 'Try a different name or phone number.' : 'Add your first customer to start tracking balances.'}
            action={!search && <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Customer</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink">{customer.name}</div>
                      {customer.address && <div className="text-xs text-ink-muted">{customer.address}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{customer.phone ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {customer.type ? (
                        <Badge tone={TYPE_BADGE_TONE[customer.type]}>
                          <span className="capitalize">{customer.type}</span>
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={customer.balance > 0 ? 'text-warning font-medium' : 'text-success'}>
                        {formatPKR(customer.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="View ledger (balance history)">
                          <button
                            onClick={() => setViewingLedger(customer)}
                            aria-label={`Ledger for ${customer.name}`}
                            className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                          >
                            <BookOpenText className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Edit customer details">
                          <button
                            onClick={() => openEdit(customer)}
                            aria-label={`Edit ${customer.name}`}
                            className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete customer">
                          <button
                            onClick={() => handleDelete(customer)}
                            aria-label={`Delete ${customer.name}`}
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

      <CustomerFormDialog
        open={dialogOpen}
        customer={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
      {viewingLedger && (
        <LedgerDialog
          partyType="customer"
          partyId={viewingLedger.id}
          partyName={viewingLedger.name}
          balance={viewingLedger.balance}
          onClose={() => setViewingLedger(null)}
        />
      )}
    </div>
  );
}

function CustomerFormDialog({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [type, setType] = useState<string>(customer?.type ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = { name, phone: phone || null, type: type || null, address: address || null };
    const res = customer
      ? await window.api.customers.update(customer.id, payload)
      : await window.api.customers.create(payload);

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify(customer ? 'Customer updated' : 'Customer added', 'success');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" variant="primary" loading={submitting}>
            {customer ? 'Save Changes' : 'Add Customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <Field label="Name" required>
          <Input required placeholder="e.g. Ahmed Traders" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Phone">
          <Input placeholder="e.g. 0300-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">—</option>
            {CUSTOMER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Address">
          <Input placeholder="e.g. Shop 12, Main Market, Lahore" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
