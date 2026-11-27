'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendUp01, TrendDown01, CurrencyDollar, Wallet01, File01, BarChart01, InfoCircle, CheckCircle, Clock } from '@untitled-ui/icons-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { TabNav } from '@/components/ui/TabNav';
import { api } from '@/lib/api';
import { InvoicesTab } from '@/components/accounting/InvoicesTab';
import { ExpensesTab } from '@/components/accounting/ExpensesTab';

const TABS = [
  { id: 'overview',    label: 'Overview',         icon: BarChart01 },
  { id: 'income',      label: 'Income',            icon: TrendUp01 },
  { id: 'expenses',    label: 'Expenses',          icon: TrendDown01 },
  { id: 'invoices',    label: 'Invoices',          icon: File01 },
  { id: 'statements',  label: 'Statements',        icon: Wallet01 },
  { id: 'cod',         label: 'COD Reconciliation', icon: CurrencyDollar },
];

const fmt = (n: number) => `₦${Number(n).toLocaleString()}`;

const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b'];
const STATUS_CLS: Record<string, string> = {
  Collected: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Unpaid: 'bg-amber-50 text-amber-700 border border-amber-200',
  Overdue: 'bg-red-50 text-red-700 border border-red-200',
};

function ChartTooltip({ active, payload, label, money = false }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 shadow-lg text-xs min-w-[120px]">
      {label && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? p.fill }} />
            {p.name}
          </span>
          <span className="font-semibold text-foreground">{money ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{p.name}</p>
      <p className="text-muted-foreground">{fmt(p.value)}</p>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, colorCls }: { label: string; value: string; sub?: string; icon: any; colorCls: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`ml-2 shrink-0 rounded-xl p-2.5 ${colorCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  const kpis = [
    { label: 'Total Revenue (MTD)', value: fmt(data.revenue.total), sub: 'This month', icon: TrendUp01, colorCls: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Expenses (MTD)', value: fmt(data.expenses.total), sub: 'This month', icon: TrendDown01, colorCls: 'text-rose-600 bg-rose-50' },
    { label: 'Net Profit', value: fmt(data.profit), sub: 'Revenue minus expenses', icon: CurrencyDollar, colorCls: 'text-blue-600 bg-blue-50' },
  ];
  const incomeBreakdown = [
    { name: 'Delivery Fees', value: data.revenue.deliveryFees },
    { name: 'COD Collections', value: data.revenue.cod },
    { name: 'Other Income', value: data.revenue.other },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        <KpiCard
          label="Profit Margin"
          value={data.revenue.total > 0 ? `${Math.round((data.profit / data.revenue.total) * 100)}%` : '—'}
          sub="Net profit / revenue"
          icon={TrendUp01}
          colorCls={data.profit >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <p className="mb-1 text-sm font-semibold">Revenue vs Expenses</p>
          <p className="mb-4 text-xs text-muted-foreground">Last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyTrend} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#FFB217" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#AE1805" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-1 text-sm font-semibold">Income Breakdown</p>
          <p className="mb-4 text-xs text-muted-foreground">By category, this month</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={incomeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={52} outerRadius={78} paddingAngle={2}>
                {incomeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} strokeWidth={0} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function IncomeTab({ data }: { data: any[] }) {
  const total = data.reduce((s: number, r: any) => s + r.amount, 0);
  const collected = data.filter((r: any) => r.status === 'Collected').reduce((s: number, r: any) => s + r.amount, 0);
  return (
    <div className="space-y-5">
      {/* How income is recorded */}
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm">
        <InfoCircle className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
        <div className="text-blue-800">
          <p className="font-medium">How income is recorded</p>
          <p className="mt-0.5 text-xs leading-relaxed">
            Income is automatically created when a delivery fee or COD collection is recorded as a payment. Each package&apos;s delivery fee becomes a &ldquo;Delivery Fee&rdquo; income entry; COD amounts collected by riders appear as &ldquo;COD Collections&rdquo;. Invoices group multiple shipments for corporate customers into a single billable record.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Income (MTD)"
          value={fmt(total)}
          sub="Gross revenue this month"
          icon={TrendUp01}
          iconCls="text-emerald-600 bg-emerald-50"
          valueColor="text-emerald-600"
        />
        <MetricCard
          label="Collected"
          value={fmt(collected)}
          sub="Payments received"
          icon={CheckCircle}
          iconCls="text-blue-600 bg-blue-50"
          valueColor="text-blue-600"
        />
        <MetricCard
          label="Pending"
          value={fmt(total - collected)}
          sub="Outstanding balance"
          icon={Clock}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Transactions"
          value={data.length}
          sub="Income entries"
          icon={Wallet01}
          iconCls="text-violet-600 bg-violet-50"
          valueColor="text-violet-600"
        />
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {['Date', 'Source', 'Category', 'Amount', 'Method', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.date).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{r.source}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{fmt(r.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.method}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[r.status] ?? ''}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function StatementsTab({ data }: { data: any }) {
  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
  const rows = [
    { label: 'REVENUE', isHeader: true },
    { label: 'Delivery Fees', value: data.revenue.deliveryFees },
    { label: 'COD Collections', value: data.revenue.cod },
    { label: 'Other Income', value: data.revenue.other },
    { label: 'TOTAL REVENUE', value: data.revenue.total, isSub: true },
    { label: '', isSpace: true },
    { label: 'OPERATING EXPENSES', isHeader: true },
    { label: 'Personnel (Salaries)', value: data.expenses.salary },
    { label: 'Fuel & Operations', value: data.expenses.fuel },
    { label: 'Vehicle Maintenance', value: data.expenses.maintenance },
    { label: 'Marketing', value: data.expenses.marketing },
    { label: 'Office & Admin', value: data.expenses.office },
    { label: 'TOTAL EXPENSES', value: data.expenses.total, isSub: true },
    { label: '', isSpace: true },
    { label: 'NET PROFIT / (LOSS)', value: data.profit, isTotal: true },
  ];
  const margin = data.revenue.total > 0 ? ((data.profit / data.revenue.total) * 100).toFixed(1) : '0.0';
  const isProfit = data.profit >= 0;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card overflow-hidden max-w-xl">
        <div className="bg-muted/50 px-6 py-4 border-b">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Income Statement</p>
          <p className="text-sm font-semibold mt-0.5">{monthLabel}</p>
        </div>
        <div className="p-6 space-y-0.5">
          {rows.map((r, i) => {
            if (r.isSpace) return <div key={i} className="h-4" />;
            if (r.isHeader) return (
              <p key={i} className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{r.label}</p>
            );
            return (
              <div key={i} className={`flex items-center justify-between ${r.isSub ? 'border-t border-border pt-2 mt-1 font-semibold' : 'py-1'} ${r.isTotal ? 'border-t-2 border-b-2 border-border py-3 mt-2 font-bold text-base' : 'text-sm'}`}>
                <span className={r.isTotal ? 'text-foreground' : r.isSub ? 'text-foreground' : 'pl-4 text-muted-foreground'}>{r.label}</span>
                <span className={`tabular-nums ${r.isTotal ? (isProfit ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold') : r.isSub ? 'font-semibold' : ''}`}>
                  {r.value !== undefined ? fmt(Math.abs(r.value!)) : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="border-t px-6 py-3 bg-muted/30 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Profit margin</span>
          <span className={`text-sm font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>{margin}%</span>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${isProfit ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {isProfit ? 'Profitable' : 'Loss'}
          </span>
        </div>
      </div>
    </div>
  );
}

function CodReconciliationTab() {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ['accounting-cod'],
    queryFn: () => api.get('/accounting/cod-reconciliation').then((r) => r.data),
  });

  const totalCollected = rows.reduce((s, r) => s + (r.collectedAmount ?? 0), 0);
  const totalRemitted  = rows.reduce((s, r) => s + (r.expectedAmount ?? 0), 0);
  const totalVariance  = rows.reduce((s, r) => s + (r.variance ?? 0), 0);
  const discrepancies  = rows.filter((r) => r.status === 'DISCREPANCY').length;

  return (
    <div className="space-y-5">
      {discrepancies > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-5 py-3">
          <InfoCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">
            <strong>{discrepancies} rider{discrepancies !== 1 ? 's' : ''}</strong> {discrepancies !== 1 ? 'have' : 'has'} a COD discrepancy. Variance exceeding ₦5,000 requires manager review.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Collected" value={fmt(totalCollected)} sub="COD received from customers" icon={CurrencyDollar} iconCls="text-blue-600 bg-blue-50" valueColor="text-blue-600" />
        <MetricCard label="Total Remitted" value={fmt(totalRemitted)} sub="Handed over to operations" icon={CheckCircle} iconCls="text-green-600 bg-green-50" valueColor="text-green-600" />
        <MetricCard label="Total Variance" value={fmt(totalVariance)} sub="Unaccounted difference" icon={Wallet01} iconCls={totalVariance > 0 ? 'text-red-600 bg-red-50' : 'text-muted-foreground bg-muted'} valueColor={totalVariance > 0 ? 'text-red-600' : undefined} />
        <MetricCard label="Discrepancies" value={discrepancies} sub="Riders with mismatch" icon={TrendDown01} iconCls={discrepancies > 0 ? 'text-orange-600 bg-orange-50' : 'text-muted-foreground bg-muted'} valueColor={discrepancies > 0 ? 'text-orange-600' : undefined} />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Rider COD Summary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Today's collected vs. remitted per rider</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {['Rider', 'Vehicle', 'Deliveries', 'Collected', 'Remitted', 'Variance', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {rows.map((r: any) => (
              <tr key={r.riderId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{r.riderName}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{r.vehicle?.toLowerCase()}</td>
                <td className="px-4 py-3 tabular-nums">{r.deliveries}</td>
                <td className="px-4 py-3 tabular-nums font-medium">{fmt(r.collectedAmount ?? 0)}</td>
                <td className="px-4 py-3 tabular-nums font-medium">{fmt(r.expectedAmount ?? 0)}</td>
                <td className={`px-4 py-3 tabular-nums font-semibold ${r.variance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {r.variance > 0 ? `+${fmt(r.variance)}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {r.status === 'CLEAR' && <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Clear</span>}
                  {r.status === 'DISCREPANCY' && <span className="inline-flex rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-medium">Discrepancy</span>}
                  {r.status === 'NO_COD' && <span className="inline-flex rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">No COD</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: summary } = useQuery({ queryKey: ['accounting-summary'], queryFn: () => api.get('/accounting/summary').then(r => r.data) });
  const { data: income } = useQuery({ queryKey: ['accounting-income'], queryFn: () => api.get('/accounting/income').then(r => r.data), enabled: activeTab === 'income' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">Financial records, invoices and statements</p>
      </div>

      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {!summary && activeTab === 'overview' && <div className="py-12 text-center text-muted-foreground">Loading…</div>}
      {summary && activeTab === 'overview' && <OverviewTab data={summary} />}
      {activeTab === 'income' && income && <IncomeTab data={income} />}
      {activeTab === 'income' && !income && <div className="py-12 text-center text-muted-foreground">Loading…</div>}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'statements' && summary && <StatementsTab data={summary} />}
      {activeTab === 'cod' && <CodReconciliationTab />}
    </div>
  );
}

