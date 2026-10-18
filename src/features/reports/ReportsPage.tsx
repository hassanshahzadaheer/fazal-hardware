import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, Printer } from 'lucide-react';
import { ReportSummary, SalesByDay, TopProduct, LowStockRow, BalanceRow } from '../../../shared/types';
import { downloadCSV, printTable } from './export';

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
      <h1 className="text-2xl font-bold text-[#111827] mb-6">Reports</h1>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {kpis.map(([label, value]) => (
          <div key={label} className="bg-white border border-[#E5E7EB] rounded-lg p-4">
            <div className="text-xs text-[#6B7280]">{label}</div>
            <div className="text-base font-bold text-[#111827]">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#E5E7EB]">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-[#1F6B3B] text-[#1F6B3B]'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
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
      <button
        onClick={onCsv}
        className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-3 py-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        CSV
      </button>
      <button
        onClick={onPrint}
        className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-3 py-1.5"
      >
        <Printer className="w-3.5 h-3.5" />
        Print / PDF
      </button>
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
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
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
            <Bar dataKey="revenue" fill="#1F6B3B" radius={[4, 4, 0, 0]} />
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
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
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
        <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Qty Sold</th>
            <th className="px-3 py-2 font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {(data ?? []).map((p, i) => (
            <tr key={p.productId}>
              <td className="px-3 py-2 text-[#6B7280]">{i + 1}</td>
              <td className="px-3 py-2 text-[#111827]">{p.productName}</td>
              <td className="px-3 py-2 text-[#6B7280]">{p.qtySold}</td>
              <td className="px-3 py-2 text-[#111827] font-medium">{formatPKR(p.revenue)}</td>
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
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
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
        <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
          <tr>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">On Hand</th>
            <th className="px-3 py-2 font-medium">Reorder Level</th>
            <th className="px-3 py-2 font-medium">Deficit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 text-[#111827]">{p.name}</td>
              <td className="px-3 py-2 text-rose-600 font-medium">{p.stockOnHand}</td>
              <td className="px-3 py-2 text-[#6B7280]">{p.reorderLevel}</td>
              <td className="px-3 py-2 text-[#6B7280]">{p.deficit}</td>
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
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
      <ExportBar
        onCsv={() =>
          downloadCSV(csvName, [label, 'Phone', 'Balance'], (data ?? []).map((r) => [r.name, r.phone ?? '', r.balance]))
        }
        onPrint={() =>
          printTable(label, [label, 'Phone', 'Balance'], (data ?? []).map((r) => [r.name, r.phone ?? '', formatPKR(r.balance)]))
        }
      />
      <table className="w-full text-sm">
        <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
          <tr>
            <th className="px-3 py-2 font-medium">{label}</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {(data ?? []).map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-[#111827]">{r.name}</td>
              <td className="px-3 py-2 text-[#6B7280]">{r.phone ?? '—'}</td>
              <td className="px-3 py-2 font-medium text-[#111827]">{formatPKR(r.balance)}</td>
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
