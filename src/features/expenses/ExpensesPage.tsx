import { useMemo, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Expense } from '../../../shared/types';
import { EXPENSE_HEADS, EXPENSE_PAYMENT_MODES } from '../../../shared/constants';

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
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
  const handleDelete = (expense: Expense) => {
    if (confirm(`Delete this ${expense.expenseHead} expense?`)) {
      deleteMutation.mutate(expense.id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#111827]">Daily Expenses</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <div className="text-xs text-[#6B7280]">Month Total</div>
          <div className="text-lg font-bold text-[#111827]">{formatPKR(monthTotal)}</div>
        </div>
        {topHeads.map((t) => (
          <div key={t.head} className="bg-white border border-[#E5E7EB] rounded-lg p-4">
            <div className="text-xs text-[#6B7280]">{t.head}</div>
            <div className="text-lg font-bold text-[#111827]">{formatPKR(t.amount)}</div>
            <div className="text-xs text-[#6B7280]">{t.pct}% of total</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by head, description, or reference…"
          className="flex-1 max-w-sm px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
        />
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
        />
      </div>

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Head</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Mode</th>
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2.5 text-[#6B7280]">{e.date}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#E8F1EA] text-[#1F6B3B] text-xs font-medium">
                      {e.expenseHead}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{e.description ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[#6B7280] capitalize">{e.paymentMode.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{e.reference ?? '—'}</td>
                  <td className="px-4 py-2.5 text-rose-700 font-medium">{formatPKR(e.amount)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(e)} className="text-[#6B7280] hover:text-[#111827]" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(e)} className="text-[#6B7280] hover:text-rose-600" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">
                    No expenses for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">
              Amount (PKR) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Expense Head</label>
            <select value={expenseHead} onChange={(e) => setExpenseHead(e.target.value)} className={inputCls}>
              {EXPENSE_HEADS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)} className={inputCls}>
              {EXPENSE_PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} />
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
              {submitting ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
