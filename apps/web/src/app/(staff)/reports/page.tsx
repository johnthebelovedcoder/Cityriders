'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Package, CheckCircle, TrendUp01, TrendDown01, CurrencyDollar, BarChart01, AlertOctagon, Map01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { MetricCard } from '@/components/ui/MetricCard';
import { TabNav } from '@/components/ui/TabNav';

const REPORT_TYPES = [
  { id: 'delivery-summary',  label: 'Delivery Summary' },
  { id: 'revenue',           label: 'Revenue Report' },
  { id: 'revenue-by-zone',   label: 'Revenue by Zone' },
  { id: 'rider-performance', label: 'Rider Performance' },
  { id: 'sla-breach',        label: 'SLA Breach' },
  { id: 'profit-loss',       label: 'Profit & Loss' },
  { id: 'customer-activity', label: 'Customer Activity' },
  { id: 'year-on-year',      label: 'Year on Year' },
  { id: 'route-performance', label: 'Route Performance' },
  { id: 'delivery-exceptions', label: 'Delivery Exceptions' },
  { id: 'invoice-aging', label: 'Receivables Aging' },
  { id: 'customer-service-activity', label: 'Customer Service Activity' },
  { id: 'maintenance-history', label: 'Maintenance History' },
];

const PIE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
const fmt = (n: number) => `₦${n.toLocaleString()}`;

function DeliverySummaryReport({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Packages"
          value={data.total}
          sub="Registered this period"
          icon={Package}
          iconCls="text-blue-600 bg-blue-50"
          valueColor="text-blue-600"
        />
        <MetricCard
          label="Delivered"
          value={data.totalDelivered}
          sub="Successfully completed"
          icon={CheckCircle}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
        <MetricCard
          label="Success Rate"
          value={`${data.successRate}%`}
          sub="Delivery completion rate"
          icon={TrendUp01}
          iconCls="text-emerald-600 bg-emerald-50"
          valueColor={data.successRate >= 90 ? 'text-emerald-600' : data.successRate >= 75 ? 'text-amber-600' : 'text-rose-600'}
        />
        <MetricCard
          label="Not Delivered"
          value={(data.total ?? 0) - (data.totalDelivered ?? 0)}
          sub="Failed / in progress"
          icon={AlertOctagon}
          iconCls="text-rose-600 bg-rose-50"
          valueColor="text-rose-600"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Daily Volume</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="delivered" name="Delivered" fill="#FFB217" stackId="a" />
              <Bar dataKey="failed" name="Failed" fill="#AE1805" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">By Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.byStatus.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RevenueReport({ data }: { data: any }) {
  const avgDaily = data.byDay?.length ? Math.round(data.total / data.byDay.length) : 0;
  const txnCount = data.transactionCount ?? data.byDay?.length ?? 0;
  const avgPerTxn = txnCount > 0 ? Math.round(data.total / txnCount) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={fmt(data.total)}
          sub="Gross income this period"
          icon={CurrencyDollar}
          iconCls="text-emerald-600 bg-emerald-50"
          valueColor="text-emerald-600"
        />
        <MetricCard
          label="Transactions"
          value={txnCount.toLocaleString()}
          sub="Payment count"
          icon={BarChart01}
          iconCls="text-blue-600 bg-blue-50"
          valueColor="text-blue-600"
        />
        <MetricCard
          label="Avg Per Day"
          value={fmt(avgDaily)}
          sub="Daily revenue average"
          icon={TrendUp01}
          iconCls="text-violet-600 bg-violet-50"
          valueColor="text-violet-600"
        />
        <MetricCard
          label="Avg Per Txn"
          value={fmt(avgPerTxn)}
          sub="Per transaction value"
          icon={TrendDown01}
          iconCls="text-indigo-600 bg-indigo-50"
          valueColor="text-indigo-600"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Daily Revenue</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Line type="monotone" dataKey="amount" stroke="#FFB217" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">By Payment Method</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byMethod} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="amount" fill="#FFB217" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RiderPerformanceReport({ data }: { data: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Deliveries per Rider</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="riderName" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="deliveries" name="Deliveries" fill="#FFB217" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">On-Time Rate (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="riderName" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Bar dataKey="onTimeRate" name="On-Time %" fill="#FFB217" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {['Rider', 'Zone', 'Deliveries', 'Success Rate', 'On-Time %', 'Avg Hours', 'Earnings'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.riderName} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.riderName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.zone ?? '—'}</td>
                <td className="px-4 py-3">{r.deliveries}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${r.successRate >= 90 ? 'text-green-600' : r.successRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{r.successRate}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${r.onTimeRate >= 90 ? 'text-green-600' : r.onTimeRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{r.onTimeRate ?? '—'}%</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.avgDeliveryHours != null ? `${r.avgDeliveryHours}h` : '—'}</td>
                <td className="px-4 py-3 font-mono">{fmt(r.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfitLossReport({ data }: { data: any }) {
  const isProfit = data.profit >= 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={fmt(data.revenue)}
          sub="Total income this period"
          icon={TrendUp01}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
        <MetricCard
          label="Expenses"
          value={fmt(data.expenses)}
          sub="Total costs this period"
          icon={TrendDown01}
          iconCls="text-red-600 bg-red-50"
          valueColor="text-red-600"
        />
        <MetricCard
          label="Net Profit"
          value={`${!isProfit ? '-' : ''}${fmt(Math.abs(data.profit))}`}
          sub={`Margin: ${data.margin}%`}
          icon={CurrencyDollar}
          iconCls={isProfit ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}
          valueColor={isProfit ? 'text-emerald-600' : 'text-red-600'}
        />
        <MetricCard
          label="Expense Ratio"
          value={data.revenue > 0 ? `${Math.round((data.expenses / data.revenue) * 100)}%` : '—'}
          sub="Costs as % of revenue"
          icon={Map01}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Monthly Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="revenue" name="Revenue" fill="#FFB217" />
              <Bar dataKey="expenses" name="Expenses" fill="#AE1805" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Expense Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.expenseBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                {data.expenseBreakdown.map((_: any, i: number) => <Cell key={i} fill={['#AE1805','#FFB217','#D8CFC4','#6B625A','#2A2522'][i % 5]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CustomerActivityReport({ data }: { data: any[] }) {
  const fmt2 = (n: number) => `₦${n.toLocaleString()}`;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Top Customers by Spend</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(v: any) => fmt2(v)} />
            <Bar dataKey="spend" fill="#FFB217" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40 text-left">{['Customer', 'Shipments', 'Total Spend', 'Last Shipment'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((c: any) => (
              <tr key={c.name} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.shipments}</td>
                <td className="px-4 py-3 font-mono">{fmt2(c.spend)}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.lastShipment).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function SlaBreachReport({ data }: { data: any }) {
  const breachCls = (rate: number) => rate >= 35 ? 'text-red-600' : rate >= 20 ? 'text-amber-600' : 'text-green-600';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Breach Rate" value={`${data.breachRate}%`} sub="Packages exceeding SLA" icon={AlertOctagon} iconCls="text-red-600 bg-red-50" valueColor={data.breachRate >= 25 ? 'text-red-600' : 'text-amber-600'} />
        <MetricCard label="Breached" value={data.breachedPackages} sub={`of ${data.totalPackages} packages`} icon={Package} iconCls="text-orange-600 bg-orange-50" valueColor="text-orange-600" />
        <MetricCard label="Avg Delivery" value={`${data.avgDeliveryHours}h`} sub={`SLA target: ${data.slaHours}h`} icon={TrendUp01} iconCls="text-blue-600 bg-blue-50" valueColor={data.avgDeliveryHours > data.slaHours ? 'text-red-600' : 'text-green-600'} />
        <MetricCard label="SLA Target" value={`${data.slaHours}h`} sub="Max delivery window" icon={CheckCircle} iconCls="text-muted-foreground bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Daily Deliveries vs Breaches</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="delivered" name="On Time" fill="#FFB217" stackId="a" />
              <Bar dataKey="breached" name="Breached" fill="#AE1805" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Breach Rate by Zone</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byZone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 50]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Bar dataKey="breachRate" name="Breach Rate" fill="#AE1805" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <div className="border-b px-4 py-3"><p className="text-sm font-medium">Top SLA Breaches</p></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40 text-left">{['Tracking #', 'Zone', 'Delivery Time', 'SLA', 'Over By'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {data.topBreached.map((p: any) => (
              <tr key={p.trackingNumber} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{p.trackingNumber}</td>
                <td className="px-4 py-3">{p.zone}</td>
                <td className="px-4 py-3 font-medium text-red-600">{p.deliveryHours}h</td>
                <td className="px-4 py-3 text-muted-foreground">{p.slaHours}h</td>
                <td className="px-4 py-3 font-semibold text-red-600">+{(p.deliveryHours - p.slaHours).toFixed(1)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueByZoneReport({ data }: { data: any }) {
  const totalRevenue = data.total ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Revenue" value={fmt(totalRevenue)} sub="All zones combined" icon={CurrencyDollar} iconCls="text-emerald-600 bg-emerald-50" valueColor="text-emerald-600" />
        <MetricCard label="Zones" value={data.byZone?.length ?? 0} sub="Active delivery zones" icon={Map01} iconCls="text-blue-600 bg-blue-50" valueColor="text-blue-600" />
        <MetricCard label="Avg per Zone" value={fmt(Math.round(totalRevenue / (data.byZone?.length || 1)))} sub="Mean zone revenue" icon={BarChart01} iconCls="text-violet-600 bg-violet-50" valueColor="text-violet-600" />
        <MetricCard label="Top Zone" value={data.byZone?.[0]?.zone ?? '—'} sub={data.byZone?.[0] ? fmt(data.byZone[0].revenue) : 'No data'} icon={TrendUp01} iconCls="text-amber-600 bg-amber-50" valueColor="text-amber-600" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Revenue by Zone</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byZone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="revenue" name="Revenue" fill="#FFB217" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Deliveries by Zone</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byZone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="deliveries" name="Deliveries" fill="#FFB217" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40 text-left">{['Zone', 'Deliveries', 'Revenue', 'Avg Fee', 'Share'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {data.byZone.map((z: any) => (
              <tr key={z.zone} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{z.zone}</td>
                <td className="px-4 py-3">{z.deliveries}</td>
                <td className="px-4 py-3 font-mono">{fmt(z.revenue)}</td>
                <td className="px-4 py-3 font-mono">{fmt(z.avgFee)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 max-w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((z.revenue / totalRevenue) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round((z.revenue / totalRevenue) * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YearOnYearReport({ data }: { data: any }) {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;
  const pct = (curr: number, prev: number) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
  const delta = (curr: number, prev: number) => {
    const p = pct(curr, prev);
    if (p === null) return null;
    return <span className={`text-xs font-semibold ml-1 ${p >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{p >= 0 ? '+' : ''}{p}% YoY</span>;
  };

  return (
    <div className="space-y-6">
      {/* KPI comparison cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Packages', curr: data.thisYear.packages, prev: data.lastYear.packages, icon: Package, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Revenue', curr: data.thisYear.revenue, prev: data.lastYear.revenue, icon: CurrencyDollar, cls: 'text-emerald-600 bg-emerald-50', money: true },
          { label: 'Deliveries', curr: data.thisYear.deliveries, prev: data.lastYear.deliveries, icon: CheckCircle, cls: 'text-green-600 bg-green-50' },
          { label: 'Success Rate', curr: data.thisYear.successRate, prev: data.lastYear.successRate, icon: TrendUp01, cls: 'text-violet-600 bg-violet-50', pct: true },
        ].map(({ label, curr, prev, icon: Icon, cls, money, pct: isPct }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className={`rounded-lg p-2 ${cls}`}><Icon className="h-3.5 w-3.5" /></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{money ? fmt(curr) : isPct ? `${curr}%` : curr.toLocaleString()}</span>
                {delta(curr, prev)}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastYear}: {money ? fmt(prev) : isPct ? `${prev}%` : prev.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly comparison chart */}
      <div className="rounded-xl border bg-card p-5">
        <p className="mb-1 text-sm font-semibold">Monthly Revenue: {thisYear} vs {lastYear}</p>
        <p className="mb-4 text-xs text-muted-foreground">Year-on-year comparison by month</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.monthly} barSize={12} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} width={48} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Bar dataKey="thisYear" name={String(thisYear)} fill="#FFB217" radius={[3, 3, 0, 0]} />
            <Bar dataKey="lastYear" name={String(lastYear)} fill="#D8CFC4" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Volume comparison */}
      <div className="rounded-xl border bg-card p-5">
        <p className="mb-1 text-sm font-semibold">Package Volume: {thisYear} vs {lastYear}</p>
        <p className="mb-4 text-xs text-muted-foreground">Packages shipped per month</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.monthly} barSize={12} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Bar dataKey="thisYearPkgs" name={String(thisYear)} fill="#FFB217" radius={[3, 3, 0, 0]} />
            <Bar dataKey="lastYearPkgs" name={String(lastYear)} fill="#D8CFC4" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="border-b px-5 py-3">
          <p className="text-sm font-semibold">Quarter-by-Quarter Summary</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3">Quarter</th>
              <th className="px-4 py-3">{thisYear} Revenue</th>
              <th className="px-4 py-3">{lastYear} Revenue</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">{thisYear} Pkgs</th>
              <th className="px-4 py-3">{lastYear} Pkgs</th>
            </tr>
          </thead>
          <tbody>
            {data.quarterly.map((q: any) => {
              const revChange = pct(q.thisYearRev, q.lastYearRev);
              return (
                <tr key={q.quarter} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{q.quarter}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{fmt(q.thisYearRev)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmt(q.lastYearRev)}</td>
                  <td className="px-4 py-3">
                    {revChange !== null && (
                      <span className={`text-xs font-semibold ${revChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {revChange >= 0 ? '+' : ''}{revChange}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{q.thisYearPkgs}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{q.lastYearPkgs}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportToCsv(reportId: string, data: any, reportLabel: string, from?: string, to?: string) {
  if (!data) return;
  let rows: string[][] = [];

  if (reportId === 'delivery-summary' && data.byDay) {
    rows = [['Date', 'Delivered', 'Failed'], ...data.byDay.map((r: any) => [r.date, r.delivered, r.failed])];
  } else if (reportId === 'revenue' && data.byDay) {
    rows = [['Date', 'Amount'], ...data.byDay.map((r: any) => [r.date, r.amount])];
  } else if (reportId === 'rider-performance') {
    rows = [['Rider', 'Deliveries', 'Success Rate', 'Earnings'], ...(data as any[]).map((r) => [r.riderName, r.deliveries, `${r.successRate}%`, r.earnings])];
  } else if (reportId === 'profit-loss' && data.byMonth) {
    rows = [['Month', 'Revenue', 'Expenses'], ...data.byMonth.map((r: any) => [r.month, r.revenue, r.expenses])];
  } else if (reportId === 'customer-activity') {
    rows = [['Customer', 'Shipments', 'Total Spend', 'Last Shipment'], ...(data as any[]).map((c) => [c.name, c.shipments, c.spend, c.lastShipment])];
  } else if (reportId === 'sla-breach' && data.byZone) {
    rows = [['Zone', 'Packages', 'Breached', 'Breach Rate'], ...data.byZone.map((z: any) => [z.zone, z.total, z.breached, `${z.breachRate}%`])];
  } else if (reportId === 'revenue-by-zone' && data.byZone) {
    rows = [['Zone', 'Deliveries', 'Revenue', 'Avg Fee'], ...data.byZone.map((z: any) => [z.zone, z.deliveries, z.revenue, z.avgFee])];
  } else if (reportId === 'year-on-year') {
    rows = [['Measure', 'This year', 'Last year'],
      ['Packages', data.thisYear.packages, data.lastYear.packages],
      ['Revenue', data.thisYear.revenue, data.lastYear.revenue],
      ['Deliveries', data.thisYear.deliveries, data.lastYear.deliveries],
      ['Success rate', `${data.thisYear.successRate}%`, `${data.lastYear.successRate}%`]];
  } else if (reportId === 'route-performance') {
    rows = [['Route ID', 'Route', 'Packages', 'Delivered', 'Unsuccessful', 'Pending', 'Completion rate'], ...(data as any[]).map((r) => [r.routeId, r.route, r.packages, r.delivered, r.unsuccessful, r.pending, `${r.completionRate}%`])];
  } else if (reportId === 'delivery-exceptions' || reportId === 'invoice-aging' || reportId === 'maintenance-history') {
    const records = (data as any[]).map((r) => ({
      ...(r.trackingNumber ? { trackingNumber: r.trackingNumber, customer: r.sender?.name, recipient: r.recipient?.name, status: r.status, reason: r.statusHistory?.[0]?.failureReasonCode?.label ?? r.statusHistory?.[0]?.failedReason, updatedAt: r.statusHistory?.[0]?.createdAt, reattemptAt: r.reattemptAt } : {}),
      ...(r.invoiceNumber ? { invoiceNumber: r.invoiceNumber, customer: r.customer, dueDate: r.dueDate, daysOverdue: r.daysOverdue, bucket: r.bucket, balance: r.balance, status: r.status } : {}),
      ...(r.vehicle ? { vehicle: r.vehicle.plateNumber, serviceDate: r.serviceDate, type: r.type, description: r.description, cost: r.cost, nextServiceDate: r.nextServiceDate } : {}),
    }));
    const columns = [...new Set(records.flatMap((r) => Object.keys(r)))];
    rows = [columns, ...records.map((record) => columns.map((column) => (record as any)[column] ?? ''))];
  } else if (reportId === 'customer-service-activity') {
    const interactions = Array.isArray(data?.interactions) ? data.interactions : [];
    const escalations = Array.isArray(data?.escalations) ? data.escalations : [];
    const records = [...interactions.map((r: any) => ({ id: r.id, type: 'Interaction', date: r.createdAt, customer: r.customer?.name, package: r.package?.trackingNumber, channel: r.channel, summary: r.summary, action: r.actionTaken, outcome: r.outcome, staff: `${r.staff?.firstName ?? ''} ${r.staff?.lastName ?? ''}`.trim() })), ...escalations.map((r: any) => ({ id: r.id, type: 'Escalation', date: r.createdAt, customer: r.customer?.name, package: r.package?.trackingNumber, priority: r.priority, status: r.status, reason: r.reason, requestedAction: r.requestedAction }))];
    const columns = [...new Set(records.flatMap((r) => Object.keys(r)))];
    rows = [columns, ...records.map((record) => columns.map((column) => (record as any)[column] ?? ''))];
  }

  if (!rows.length) return;
  const csvRows = [['Report', reportLabel], ['From', from ?? 'All dates'], ['To', to ?? 'All dates'], ['Generated at', new Date().toISOString()], [], ...rows];
  const csv = csvRows.map((r) => r.map((value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function GenericReportTable({ data }: { data: any }) {
  const records = Array.isArray(data) ? data : [];
  const flattened = records.map((row) => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (['statusHistory'].includes(key) && Array.isArray(value)) result.failureReason = (value[0] as any)?.failureReasonCode?.label ?? (value[0] as any)?.failedReason;
      else if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) result[key] = (value as any).name ?? (value as any).plateNumber ?? (value as any).firstName ?? JSON.stringify(value);
      else if (!Array.isArray(value)) result[key] = value instanceof Date ? value.toLocaleString() : value;
    }
    return result;
  });
  const columns = [...new Set(flattened.flatMap((row) => Object.keys(row)))].filter((key) => !['id', 'senderId', 'customerId', 'staffId', 'createdById'].includes(key));
  return <div className="rounded-lg border bg-card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-left">{columns.map((key) => <th key={key} className="px-3 py-2 font-medium">{key.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{flattened.map((row, index) => <tr key={index} className="border-b last:border-0">{columns.map((key) => <td key={key} className="max-w-xs px-3 py-2 align-top">{String(row[key] ?? '—')}</td>)}</tr>)}{flattened.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="p-8 text-center text-muted-foreground">No records for this selection.</td></tr>}</tbody></table></div>;
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('delivery-summary');
  const { range, setRange } = usePeriodFilter('this-month');

  const { data, isLoading } = useQuery({
    queryKey: ['report', activeReport, range.from, range.to],
    queryFn: () => api.get(`/reports/${activeReport}`, { params: { from: range.from, to: range.to } }).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analyse operations and financial performance</p>
      </div>

      <TabNav tabs={REPORT_TYPES} active={activeReport} onChange={setActiveReport} />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{REPORT_TYPES.find((r) => r.id === activeReport)?.label}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={range} onChange={setRange} defaultPreset="this-month" />
            <button
              onClick={() => exportToCsv(activeReport, data, REPORT_TYPES.find((r) => r.id === activeReport)?.label ?? activeReport, range.from, range.to)}
              disabled={!data}
              className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        {isLoading && <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">Loading report...</div>}
        {!isLoading && data && activeReport === 'delivery-summary'  && <DeliverySummaryReport data={data} />}
        {!isLoading && data && activeReport === 'revenue'           && <RevenueReport data={data} />}
        {!isLoading && data && activeReport === 'revenue-by-zone'   && <RevenueByZoneReport data={data} />}
        {!isLoading && data && activeReport === 'rider-performance' && <RiderPerformanceReport data={data} />}
        {!isLoading && data && activeReport === 'sla-breach'        && <SlaBreachReport data={data} />}
        {!isLoading && data && activeReport === 'profit-loss'       && <ProfitLossReport data={data} />}
        {!isLoading && data && activeReport === 'customer-activity' && <CustomerActivityReport data={data} />}
        {!isLoading && data && activeReport === 'year-on-year'       && <YearOnYearReport data={data} />}
        {!isLoading && data && activeReport === 'route-performance' && <GenericReportTable data={data} />}
        {!isLoading && data && activeReport === 'delivery-exceptions' && <GenericReportTable data={data} />}
        {!isLoading && data && activeReport === 'invoice-aging' && <GenericReportTable data={data} />}
        {!isLoading && data && activeReport === 'maintenance-history' && <GenericReportTable data={data} />}
        {!isLoading && data && activeReport === 'customer-service-activity' && <GenericReportTable data={[
          ...(Array.isArray(data.interactions) ? data.interactions : []).map((r: any) => ({ type: 'Interaction', ...r })),
          ...(Array.isArray(data.escalations) ? data.escalations : []).map((r: any) => ({ type: 'Escalation', ...r })),
        ]} />}
      </div>
    </div>
  );
}

