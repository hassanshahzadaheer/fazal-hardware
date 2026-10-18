import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, Printer } from 'lucide-react';
import { ReportSummary, SalesByDay, TopProduct, LowStockRow, BalanceRow } from '../../../shared/types';
import { downloadCSV, printTable } from './export';
import { Button, Skeleton } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

type Tab = 'sales' | 'top-products' | 'low-stock' | 'receivables' | 'payables';
const TABS: [Tab, string][] = [
  ['sales', 'Sales'],
  ['top-products', 'Top Products'],
  ['low-stock', 'Low Stock'],
  ['receivables', 'Receivables'],
  ['payables', 'Payables'],
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales');

  const { data: summary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: async () => {
      const res = await window.api.reports.summary();
      return res.ok ? (res.data as ReportSummary) : null;
    },
  });

  const kpis: [string, string][] = summary
    ? [
        ['Revenue', formatPKR(summary.totalRevenue)],
        ['Gross Profit', formatPKR(summary.grossProfit)],
        ['Stock Value', formatPKR(summary.stockValue)],
        ['Low Stock', String(summary.lowStockCount)],
        ['Receivables', formatPKR(summary.totalReceivable)],
        ['Payables', formatPKR(summary.totalPayable)],
      ]
    : [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight">Reports</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">Sales performance, stock health, and outstanding balances.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {summary
          ? kpis.map(([label, value]) => (
              <div key={label} className="bg-surface border border-border rounded-md p-4">
                <div className="text-xs text-ink-muted">{label}</div>
                <div className="text-base font-bold text-ink tabular-nums">{value}</div>
              </div>
            ))
          : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[60px]" />)}
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sales' && <SalesTab />}
      {tab === 'top-products' && <TopProductsTab />}
      {tab === 'low-stock' && <LowStockTab />}
      {tab === 'receivables' && <ReceivablesTab />}
      {tab === 'payables' && <PayablesTab />}
    </div>
  );
}

function ExportBar({ onCsv, onPrint }: { onCsv: () => void; onPrint: () => void }) {
  return (
    <div className="flex justify-end gap-2 mb-3">
      <Button variant="secondary" size="sm" onClick={onCsv}>
        <Download className="w-3.5 h-3.5" />
        CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={onPrint}>
        <Printer className="w-3.5 h-3.5" />
        Print / PDF
      </Button>
    </div>
  );
}

function SalesTab() {
  const { data } = useQuery({
    queryKey: ['reports-sales-by-day'],
    queryFn: async () => {
      const res = await window.api.reports.salesByDay(7);
      return res.ok ? (res.data as SalesByDay[]) : [];
    },
  });
  const chartData = (data ?? []).map((d) => ({
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: d.revenue,
  }));

  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <ExportBar
        onCsv={() => downloadCSV('sales-last-7-days.csv', ['Date', 'Revenue'], (data ?? []).map((d) => [d.date, d.revenue]))}
        onPrint={() => printTable('Sales — Last 7 Days', ['Date', 'Revenue'], (data ?? []).map((d) => [d.date, formatPKR(d.revenue)]))}
      />
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="day" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v) => formatPKR(Number(v))} />
            {/* Chart fill uses the accent brand hex directly — recharts takes a raw
                color prop, not a Tailwind class, so this can't route through tokens. */}
            <Bar dataKey="revenue" fill="#2F5FEE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopProductsTab() {
  const { data } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: async () => {
      const res = await window.api.reports.topProducts();
      return res.ok ? (res.data as TopProduct[]) : [];
    },
  });

  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <ExportBar
        onCsv={() =>
          downloadCSV(
            'top-products.csv',
            ['#', 'Product', 'Qty Sold', 'Revenue'],
            (data ?? []).map((p, i) => [i + 1, p.productName, p.qtySold, p.revenue])
          )
        }
        onPrint={() =>
          printTable(
            'Top Products',
            ['#', 'Product', 'Qty Sold', 'Revenue'],
            (data ?? []).map((p, i) => [i + 1, p.productName, p.qtySold, formatPKR(p.revenue)])
          )
        }
      />
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
          <tr>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">#</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Product</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Qty Sold</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((p, i) => (
            <tr key={p.productId} className="hover:bg-surface-sunken/60 transition-colors">
              <td className="px-4 py-2.5 text-ink-muted">{i + 1}</td>
              <td className="px-4 py-2.5 text-ink">{p.productName}</td>
              <td className="px-4 py-2.5 text-ink-muted">{p.qtySold}</td>
              <td className="px-4 py-2.5 text-ink font-medium tabular-nums">{formatPKR(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowStockTab() {
  const { data } = useQuery({
    queryKey: ['reports-low-stock'],
    queryFn: async () => {
      const res = await window.api.reports.lowStock();
      return res.ok ? (res.data as LowStockRow[]) : [];
    },
  });

  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <ExportBar
        onCsv={() =>
          downloadCSV(
            'low-stock.csv',
            ['Product', 'On Hand', 'Reorder Level', 'Deficit'],
            (data ?? []).map((p) => [p.name, p.stockOnHand, p.reorderLevel, p.deficit])
          )
        }
        onPrint={() =>
          printTable(
            'Low Stock',
            ['Product', 'On Hand', 'Reorder Level', 'Deficit'],
            (data ?? []).map((p) => [p.name, p.stockOnHand, p.reorderLevel, p.deficit])
          )
        }
      />
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
          <tr>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Product</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">On Hand</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Reorder Level</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Deficit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((p) => (
            <tr key={p.id} className="hover:bg-surface-sunken/60 transition-colors">
              <td className="px-4 py-2.5 text-ink">{p.name}</td>
              <td className="px-4 py-2.5 text-danger font-medium">{p.stockOnHand}</td>
              <td className="px-4 py-2.5 text-ink-muted">{p.reorderLevel}</td>
              <td className="px-4 py-2.5 text-ink-muted">{p.deficit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BalanceTab({ queryKey, fetcher, label, csvName }: { queryKey: string; fetcher: () => Promise<any>; label: string; csvName: string }) {
  const { data } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await fetcher();
      return res.ok ? (res.data as BalanceRow[]) : [];
    },
  });

  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <ExportBar
        onCsv={() =>
          downloadCSV(csvName, [label, 'Phone', 'Balance'], (data ?? []).map((r) => [r.name, r.phone ?? '', r.balance]))
        }
        onPrint={() =>
          printTable(label, [label, 'Phone', 'Balance'], (data ?? []).map((r) => [r.name, r.phone ?? '', formatPKR(r.balance)]))
        }
      />
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
          <tr>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">{label}</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Phone</th>
            <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((r) => (
            <tr key={r.id} className="hover:bg-surface-sunken/60 transition-colors">
              <td className="px-4 py-2.5 text-ink">{r.name}</td>
              <td className="px-4 py-2.5 text-ink-muted">{r.phone ?? '—'}</td>
              <td className="px-4 py-2.5 font-medium text-ink tabular-nums">{formatPKR(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceivablesTab() {
  return (
    <BalanceTab
      queryKey="reports-receivables"
      fetcher={() => window.api.reports.receivables()}
      label="Customer"
      csvName="receivables.csv"
    />
  );
}

function PayablesTab() {
  return (
    <BalanceTab
      queryKey="reports-payables"
      fetcher={() => window.api.reports.payables()}
      label="Supplier"
      csvName="payables.csv"
    />
  );
}
