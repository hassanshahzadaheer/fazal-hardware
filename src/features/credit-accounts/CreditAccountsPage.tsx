import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, HandCoins } from 'lucide-react';
import { Customer, SaleInvoice } from '../../../shared/types';
import { maxAgeDays, isOverdue } from './aging';
import StatementDialog from './StatementDialog';
import LedgerDialog from '../ledger/LedgerDialog';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function CreditAccountsPage() {
  const [viewingStatement, setViewingStatement] = useState<Customer | null>(null);
  const [receivingFrom, setReceivingFrom] = useState<Customer | null>(null);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await window.api.customers.list();
      return res.ok ? (res.data as Customer[]) : [];
    },
  });
  const { data: invoices } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await window.api.sales.list();
      return res.ok ? (res.data as SaleInvoice[]) : [];
    },
  });

  const accounts = useMemo(() => {
    const active = (customers ?? []).filter((c) => c.balance > 0);
    return active.map((c) => {
      const pending = (invoices ?? []).filter(
        (inv) => inv.customerId === c.id && (inv.status === 'credit' || inv.status === 'partial')
      );
      const age = maxAgeDays(pending.map((inv) => inv.createdDate));
      return { customer: c, pendingCount: pending.length, ageDays: age, overdue: isOverdue(age) };
    });
  }, [customers, invoices]);

  const totalReceivable = useMemo(() => accounts.reduce((sum, a) => sum + a.customer.balance, 0), [accounts]);
  const highest = useMemo(
    () => accounts.reduce((max, a) => (a.customer.balance > (max?.customer.balance ?? 0) ? a : max), null as (typeof accounts)[number] | null),
    [accounts]
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[#111827]">Credit Accounts</h1>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
          {accounts.length} outstanding
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <div className="text-xs text-[#6B7280]">Active Accounts</div>
          <div className="text-xl font-bold text-[#111827]">{accounts.length}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <div className="text-xs text-[#6B7280]">Total Receivable</div>
          <div className="text-xl font-bold text-[#111827]">{formatPKR(totalReceivable)}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
          <div className="text-xs text-[#6B7280]">Highest Balance</div>
          <div className="text-xl font-bold text-[#111827]">
            {highest ? formatPKR(highest.customer.balance) : '—'}
          </div>
          {highest && <div className="text-xs text-[#6B7280]">{highest.customer.name}</div>}
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Contact</th>
              <th className="px-4 py-2.5 font-medium">Credit Invoices</th>
              <th className="px-4 py-2.5 font-medium">Outstanding</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {accounts.map(({ customer, pendingCount, ageDays: age, overdue }) => (
              <tr key={customer.id}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#E8F1EA] text-[#1F6B3B] flex items-center justify-center text-xs font-bold">
                      {customer.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[#111827] font-medium">{customer.name}</div>
                      {overdue && <div className="text-xs text-rose-600">{age}d overdue</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[#6B7280]">{customer.phone ?? '—'}</td>
                <td className="px-4 py-2.5 text-[#6B7280]">{pendingCount}</td>
                <td className="px-4 py-2.5">
                  <span className={overdue ? 'text-rose-700 font-medium' : 'text-amber-700 font-medium'}>
                    {formatPKR(customer.balance)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setViewingStatement(customer)}
                      className="flex items-center gap-1 text-[#6B7280] hover:text-[#111827] text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Statement
                    </button>
                    <button
                      onClick={() => setReceivingFrom(customer)}
                      className="flex items-center gap-1 text-[#1F6B3B] hover:text-[#17522D] text-xs font-medium"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      Receive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">
                  No outstanding credit accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewingStatement && (
        <StatementDialog customer={viewingStatement} onClose={() => setViewingStatement(null)} />
      )}
      {receivingFrom && (
        <LedgerDialog
          partyType="customer"
          partyId={receivingFrom.id}
          partyName={receivingFrom.name}
          balance={receivingFrom.balance}
          onClose={() => setReceivingFrom(null)}
        />
      )}
    </div>
  );
}
