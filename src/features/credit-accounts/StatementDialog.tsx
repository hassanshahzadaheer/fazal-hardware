import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Customer, SaleInvoice, Payment, Settings } from '../../../shared/types';
import { Button, Modal } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

interface StatementRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

function buildStatement(invoices: SaleInvoice[], payments: Payment[]): StatementRow[] {
  type Entry = { date: string; description: string; debit: number; credit: number };
  const entries: Entry[] = [
    ...invoices.map((inv) => ({
      date: inv.createdDate,
      description: `Invoice ${inv.invoiceNumber}`,
      debit: inv.total,
      credit: 0,
    })),
    ...payments.map((p) => ({
      date: p.createdDate,
      description: p.notes ? `Payment — ${p.notes}` : 'Payment received',
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  return entries.map((e) => {
    running += e.debit - e.credit;
    return { ...e, balance: running };
  });
}

function printStatement(companyName: string, customer: Customer, rows: StatementRow[]) {
  const win = window.open('', '_blank');
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${new Date(r.date).toLocaleDateString()}</td>
        <td>${r.description}</td>
        <td style="color:#DC2626">${r.debit ? formatPKR(r.debit) : ''}</td>
        <td style="color:#059669">${r.credit ? formatPKR(r.credit) : ''}</td>
        <td style="font-weight:600">${formatPKR(r.balance)}</td>
      </tr>`
    )
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>Statement — ${customer.name}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #111827; }
          h1 { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
          th { background: #F7F8FA; }
          .balance-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-weight: 600; margin-top: 8px; }
          .btn { margin-top: 24px; padding: 10px 16px; background: #2F5FEE; color: white; border: none; border-radius: 8px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>${companyName}</h1>
        <div>Account Statement</div>
        <div style="margin-top: 16px;">
          <strong>${customer.name}</strong><br/>
          ${customer.phone ?? ''} ${customer.address ? '— ' + customer.address : ''}
          <div class="balance-badge" style="background:${customer.balance > 0 ? '#FFFBEB' : '#ECFDF3'}; color:${
    customer.balance > 0 ? '#D97706' : '#16A34A'
  }">
            Outstanding: ${formatPKR(customer.balance)}
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <button class="btn" onclick="window.print()">Print / Save PDF</button>
        <p style="margin-top:24px; font-size:11px; color:#9CA3AF;">Computer-generated statement</p>
      </body>
    </html>
  `);
  win.document.close();
}

export default function StatementDialog({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data: invoices } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await window.api.sales.list();
      return res.ok ? (res.data as SaleInvoice[]) : [];
    },
  });
  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await window.api.payments.list();
      return res.ok ? (res.data as Payment[]) : [];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await window.api.settings.get();
      return res.ok ? (res.data as Settings) : null;
    },
  });

  const customerInvoices = useMemo(
    () => (invoices ?? []).filter((inv) => inv.customerId === customer.id && inv.status !== 'returned'),
    [invoices, customer.id]
  );
  const customerPayments = useMemo(
    () => (payments ?? []).filter((p) => p.partyType === 'customer' && p.partyId === customer.id),
    [payments, customer.id]
  );

  const rows = useMemo(() => buildStatement(customerInvoices, customerPayments), [customerInvoices, customerPayments]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Statement — ${customer.name}`}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => printStatement(settings?.companyName ?? 'Fazal Hardware', customer, rows)}
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className={`rounded-md px-4 py-3 border ${
            customer.balance > 0 ? 'bg-warning-soft border-warning/20' : 'bg-success-soft border-success/20'
          }`}
        >
          <div className="text-xs text-ink-muted">Outstanding Balance</div>
          <div className="text-lg font-bold text-ink">{formatPKR(customer.balance)}</div>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Date</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Description</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Debit</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Credit</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-sunken/60 transition-colors">
                  <td className="px-3 py-2 text-ink-muted">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-ink">{r.description}</td>
                  <td className="px-3 py-2 text-danger">{r.debit ? formatPKR(r.debit) : ''}</td>
                  <td className="px-3 py-2 text-success">{r.credit ? formatPKR(r.credit) : ''}</td>
                  <td className="px-3 py-2 font-medium text-ink">{formatPKR(r.balance)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
