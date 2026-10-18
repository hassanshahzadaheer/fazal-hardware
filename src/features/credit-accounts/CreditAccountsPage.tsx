import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, HandCoins, Wallet } from 'lucide-react';
import { Customer, SaleInvoice } from '../../../shared/types';
import { maxAgeDays, isOverdue } from './aging';
import StatementDialog from './StatementDialog';
import LedgerDialog from '../ledger/LedgerDialog';
import { Badge, Banner, EmptyState } from '../../components/ui';

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
  const overdueAccounts = useMemo(() => accounts.filter((a) => a.overdue), [accounts]);
  const overdueTotal = useMemo(
    () => overdueAccounts.reduce((sum, a) => sum + a.customer.balance, 0),
    [overdueAccounts]
  );

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center gap-2.5 mb-6">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight">Credit Accounts</h1>
        <Badge tone="warning">{accounts.length} outstanding</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-ink-muted">Active Accounts</div>
          <div className="text-xl font-bold text-ink">{accounts.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-ink-muted">Total Receivable</div>
          <div className="text-xl font-bold text-ink">{formatPKR(totalReceivable)}</div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-ink-muted">Highest Balance</div>
          <div className="text-xl font-bold text-ink">
            {highest ? formatPKR(highest.customer.balance) : '—'}
          </div>
          {highest && <div className="text-xs text-ink-muted">{highest.customer.name}</div>}
        </div>
      </div>

      {overdueAccounts.length > 0 && (
        <div className="mb-4">
          <Banner tone="warning" title="Overdue balances need follow-up">
            {overdueAccounts.length} customer{overdueAccounts.length > 1 ? 's' : ''} {overdueAccounts.length > 1 ? 'have' : 'has'} credit outstanding for more than 30 days, totalling {formatPKR(overdueTotal)}. Consider calling to collect before it ages further.
          </Banner>
        </div>
      )}

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {accounts.length === 0 ? (
          <EmptyState icon={Wallet} title="No outstanding credit accounts" description="Customers with an open balance will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Credit Invoices</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Outstanding</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map(({ customer, pendingCount, ageDays: age, overdue }) => (
                  <tr key={customer.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold">
                          {customer.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-ink font-medium">{customer.name}</div>
                          {overdue && <div className="text-xs text-danger">{age}d overdue</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{customer.phone ?? '—'}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{pendingCount}</td>
                    <td className="px-4 py-2.5">
                      <span className={overdue ? 'text-danger font-medium' : 'text-warning font-medium'}>
                        {formatPKR(customer.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setViewingStatement(customer)}
                          className="flex items-center gap-1 text-ink-muted hover:text-ink text-xs font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Statement
                        </button>
                        <button
                          onClick={() => setReceivingFrom(customer)}
                          className="flex items-center gap-1 text-accent hover:text-accent-hover text-xs font-medium"
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          Receive
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
