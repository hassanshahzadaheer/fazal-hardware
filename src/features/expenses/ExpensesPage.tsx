import { useMemo, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, TrendingDown } from 'lucide-react';
import { Expense } from '../../../shared/types';
import { EXPENSE_HEADS, EXPENSE_PAYMENT_MODES } from '../../../shared/constants';
import { notify } from '../../components/shared/NotificationProvider';
import { Badge, Button, confirmDialog, EmptyState, Field, Input, Modal, Select } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(currentMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await window.api.expenses.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as Expense[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await window.api.expenses.delete(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      notify('Expense deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const filtered = useMemo(() => {
    let list = expenses ?? [];
    if (filterMonth) list = list.filter((e) => e.date?.startsWith(filterMonth));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.expenseHead, e.description, e.reference].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
      );
    }
    return list;
  }, [expenses, search, filterMonth]);

  const monthTotal = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  const topHeads = useMemo(() => {
    const byHead = new Map<string, number>();
    for (const e of filtered) {
      byHead.set(e.expenseHead, (byHead.get(e.expenseHead) ?? 0) + e.amount);
    }
    return Array.from(byHead.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([head, amount]) => ({ head, amount, pct: monthTotal ? Math.round((amount / monthTotal) * 100) : 0 }));
  }, [filtered, monthTotal]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setDialogOpen(true);
  };
  const handleSaved = () => {
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };
  const handleDelete = async (expense: Expense) => {
    const confirmed = await confirmDialog({
      title: 'Delete expense?',
      description: `This ${expense.expenseHead} expense will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) deleteMutation.mutate(expense.id);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink tracking-tight">Daily Expenses</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Track cash outflows by head, mode, and reference.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-ink-muted">Month Total</div>
          <div className="text-lg font-semibold text-ink">{formatPKR(monthTotal)}</div>
        </div>
        {topHeads.map((t) => (
          <div key={t.head} className="bg-surface border border-border rounded-md p-4">
            <div className="text-xs text-ink-muted">{t.head}</div>
            <div className="text-lg font-semibold text-ink">{formatPKR(t.amount)}</div>
            <div className="text-xs text-ink-muted">{t.pct}% of total</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by head, description, or reference…"
          />
        </div>
        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No expenses for this filter"
            description="Try a different month or search term, or add a new expense."
            action={<Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Expense</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Head</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Description</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Mode</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Ref</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5 text-ink-muted">{e.date}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone="accent">{e.expenseHead}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{e.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-ink-muted capitalize">{e.paymentMode.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{e.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-danger font-medium tabular-nums">{formatPKR(e.amount)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          aria-label={`Edit expense on ${e.date}`}
                          className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(e)}
                          aria-label={`Delete expense on ${e.date}`}
                          className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogOpen && (
        <ExpenseFormDialog expense={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

function ExpenseFormDialog({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10));
  const [expenseHead, setExpenseHead] = useState(expense?.expenseHead ?? EXPENSE_HEADS[0]);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '');
  const [paymentMode, setPaymentMode] = useState(expense?.paymentMode ?? 'cash');
  const [reference, setReference] = useState(expense?.reference ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    setSubmitting(true);
    const payload = {
      date,
      expenseHead,
      description: description || null,
      amount: Number(amount),
      paymentMode,
      reference: reference || null,
    };
    const res = expense
      ? await window.api.expenses.update(expense.id, payload)
      : await window.api.expenses.create(payload);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }
    notify(expense ? 'Expense updated' : 'Expense added', 'success');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={expense ? 'Edit Expense' : 'Add Expense'}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" variant="primary" loading={submitting}>
            {expense ? 'Save Changes' : 'Add Expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">{error}</div>
        )}
        <Field label="Date" required>
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Amount (PKR)" required>
          <Input
            type="number"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Expense Head">
          <Select value={expenseHead} onChange={(e) => setExpenseHead(e.target.value)}>
            {EXPENSE_HEADS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Payment Mode">
          <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)}>
            {EXPENSE_PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
