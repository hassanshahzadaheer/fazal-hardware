import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Payment } from '../../../shared/types';
import { notify } from '../../components/shared/NotificationProvider';
import { Button, Input, Select, Field, Modal } from '../../components/ui';

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
    <Modal
      open
      onClose={onClose}
      title={partyName}
      footer={
        showForm ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => mutation.mutate()}
              disabled={!amount}
              loading={mutation.isPending}
            >
              Confirm
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div
          className={`rounded-md px-4 py-3 border ${
            balance > 0 ? 'bg-warning-soft border-warning/20' : 'bg-success-soft border-success/20'
          }`}
        >
          <div className="text-xs text-ink-muted">
            {partyType === 'customer' ? 'Receivable Balance' : 'Payable Balance'}
          </div>
          <div className="text-lg font-bold text-ink">PKR {balance.toLocaleString('en-PK')}</div>
        </div>

        {!showForm ? (
          <Button variant="primary" className="w-full" onClick={() => setShowForm(true)}>
            {partyType === 'customer' ? 'Receive Payment' : 'Record Payment'}
          </Button>
        ) : (
          <div className="space-y-3 border border-border rounded-md p-4">
            {error && (
              <div className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <Field label={`Amount (Max: ${balance})`}>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Mode">
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {Number(amount) > 0 && (
              <p className="text-xs text-ink-muted">
                Remaining after payment: PKR {Math.max(0, balance - Number(amount)).toLocaleString('en-PK')}
              </p>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-ink mb-2">Payment History</h3>
          <ul className="divide-y divide-border">
            {history.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{MODE_ICON[p.mode] ?? '🔄'}</span>
                  <div>
                    <div className="text-ink">{new Date(p.createdDate).toLocaleDateString()}</div>
                    {p.notes && <div className="text-xs text-ink-muted">{p.notes}</div>}
                  </div>
                </div>
                <span className="font-medium text-ink">PKR {p.amount.toLocaleString('en-PK')}</span>
              </li>
            ))}
            {history.length === 0 && (
              <li className="py-4 text-center text-sm text-ink-muted">No payments yet.</li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
