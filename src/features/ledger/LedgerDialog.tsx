import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Payment } from '../../../shared/types';
import { notify } from '../../components/shared/NotificationProvider';

interface Props {
  partyType: 'customer' | 'supplier';
  partyId: number;
  partyName: string;
  balance: number;
  onClose: () => void;
}

const MODE_ICON: Record<string, string> = {
  cash: '💵',
  card: '💳',
  bank_transfer: '🏦',
  cheque: '📄',
  other: '🔄',
};

export default function LedgerDialog({ partyType, partyId, partyName, balance, onClose }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await window.api.payments.list();
      return res.ok ? (res.data as Payment[]) : [];
    },
  });

  const history = (payments ?? []).filter((p) => p.partyType === partyType && p.partyId === partyId);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await window.api.payments.create({
        partyType,
        partyId,
        partyName,
        amount: Number(amount),
        direction: partyType === 'customer' ? 'received' : 'paid',
        mode,
        notes: notes || null,
      });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      notify(partyType === 'customer' ? 'Payment received' : 'Payment recorded', 'success');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: [partyType === 'customer' ? 'customers' : 'suppliers'] });
      setShowForm(false);
      setAmount('');
      setNotes('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message);
      notify(err.message, 'error');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">{partyName}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            className={`rounded-lg px-4 py-3 border ${
              balance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="text-xs text-[#6B7280]">
              {partyType === 'customer' ? 'Receivable Balance' : 'Payable Balance'}
            </div>
            <div className="text-lg font-bold text-[#111827]">PKR {balance.toLocaleString('en-PK')}</div>
          </div>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
            >
              {partyType === 'customer' ? 'Receive Payment' : 'Record Payment'}
            </button>
          ) : (
            <div className="space-y-3 border border-[#E5E7EB] rounded-lg p-4">
              {error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Amount (Max: {balance})</label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
              </div>
              {Number(amount) > 0 && (
                <p className="text-xs text-[#6B7280]">
                  Remaining after payment: PKR {Math.max(0, balance - Number(amount)).toLocaleString('en-PK')}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !amount}
                  className="flex-1 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D] disabled:opacity-60"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-2">Payment History</h3>
            <ul className="divide-y divide-[#E5E7EB]">
              {history.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{MODE_ICON[p.mode] ?? '🔄'}</span>
                    <div>
                      <div className="text-[#111827]">{new Date(p.createdDate).toLocaleDateString()}</div>
                      {p.notes && <div className="text-xs text-[#6B7280]">{p.notes}</div>}
                    </div>
                  </div>
                  <span className="font-medium text-[#111827]">PKR {p.amount.toLocaleString('en-PK')}</span>
                </li>
              ))}
              {history.length === 0 && (
                <li className="py-4 text-center text-sm text-[#6B7280]">No payments yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40';
