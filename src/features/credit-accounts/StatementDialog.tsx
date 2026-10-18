import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer } from 'lucide-react';
import { Customer, SaleInvoice, Payment, Settings } from '../../../shared/types';

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
          .btn { margin-top: 24px; padding: 10px 16px; background: #1F6B3B; color: white; border: none; border-radius: 8px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>${companyName}</h1>
        <div>Account Statement</div>
        <div style="margin-top: 16px;">
          <strong>${customer.name}</strong><br/>
          ${customer.phone ?? ''} ${customer.address ? '— ' + customer.address : ''}
          <div class="balance-badge" style="background:${customer.balance > 0 ? '#FEF3C7' : '#D1FAE5'}; color:${
    customer.balance > 0 ? '#92400E' : '#065F46'
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">Statement — {customer.name}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            className={`rounded-lg px-4 py-3 border ${
              customer.balance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="text-xs text-[#6B7280]">Outstanding Balance</div>
            <div className="text-lg font-bold text-[#111827]">{formatPKR(customer.balance)}</div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280] text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Debit</th>
                <th className="px-3 py-2 font-medium">Credit</th>
                <th className="px-3 py-2 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-[#6B7280]">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-[#111827]">{r.description}</td>
                  <td className="px-3 py-2 text-rose-700">{r.debit ? formatPKR(r.debit) : ''}</td>
                  <td className="px-3 py-2 text-emerald-700">{r.credit ? formatPKR(r.credit) : ''}</td>
                  <td className="px-3 py-2 font-medium text-[#111827]">{formatPKR(r.balance)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[#6B7280]">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => printStatement(settings?.companyName ?? 'Fazal Hardware', customer, rows)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
            >
              <Printer className="w-4 h-4" />
              Print Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
