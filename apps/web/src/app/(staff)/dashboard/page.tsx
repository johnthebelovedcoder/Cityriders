'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Package, Truck01, CheckCircle, Clock, TrendUp01, TrendDown01, AlertCircle, ArrowRight, CurrencyDollar, AlertTriangle, ZapFast } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

const STATUS_BADGE: Record<string, string> = {
  REGISTERED:          'bg-gray-100 text-gray-700',
  AWAITING_ASSIGNMENT: 'bg-yellow-100 text-yellow-700',
  ASSIGNED:            'bg-blue-100 text-blue-700',
  PICKED_UP:           'bg-indigo-100 text-indigo-700',
  IN_TRANSIT:          'bg-amber-100 text-amber-700',
  DELIVERY_ATTEMPTED:  'bg-orange-100 text-orange-700',
  DELIVERED:           'bg-green-100 text-green-700',
  RETURNED:            'bg-red-100 text-red-700',
  CANCELLED:           'bg-gray-100 text-gray-500 line-through',
};

const ACTIVITY_ICON: Record<string, { icon: typeof CheckCircle; cls: string }> = {
  DELIVERED:          { icon: CheckCircle,  cls: 'text-green-600' },
  ASSIGNED:           { icon: Truck01,      cls: 'text-blue-600' },
  IN_TRANSIT:         { icon: TrendUp01,    cls: 'text-amber-600' },
  PICKED_UP:          { icon: TrendUp01,    cls: 'text-indigo-600' },
  REGISTERED:         { icon: Package,      cls: 'text-gray-500' },
  DELIVERY_ATTEMPTED: { icon: AlertCircle,  cls: 'text-orange-500' },
};

const RIDER_STATUS_CLS: Record<string, string> = {
  'On delivery': 'bg-blue-100 text-blue-700',
  'Available':   'bg-green-100 text-green-700',
  'Off duty':    'bg-gray-100 text-gray-500',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 shadow-lg text-xs min-w-[100px]">
      {label && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? p.fill }} />
            {p.name}
          </span>
          <span className="font-semibold text-foreground">{p.value}</span>
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
      <p className="text-muted-foreground">{p.value} packages</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const wow = stats?.weekOverWeek ?? {};
  const kpis = [
    {
      label: 'Active Deliveries',
      value: stats?.activeDeliveries ?? '—',
      sub: 'In progress now',
      icon: TrendUp01,
      color: 'text-amber-600 bg-amber-50',
      delta: wow.activeDeliveries,
    },
    {
      label: 'Revenue Today',
      value: stats?.revenueToday != null ? `₦${Number(stats.revenueToday).toLocaleString()}` : '—',
      sub: 'Delivery fees collected',
      icon: CurrencyDollar,
      color: 'text-emerald-600 bg-emerald-50',
      delta: wow.revenueToday,
    },
    {
      label: 'Completed Today',
      value: stats?.completedToday ?? '—',
      sub: 'Successfully delivered',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50',
      delta: wow.completedToday,
    },
    {
      label: 'Pending Dispatch',
      value: stats?.pendingAssignments ?? '—',
      sub: 'Awaiting rider assignment',
      icon: Clock,
      color: 'text-rose-600 bg-rose-50',
      delta: null as number | null,
    },
  ];

  const pendingActions = [
    stats?.pendingAssignments > 0 && {
      icon: Clock,
      cls: 'text-amber-600',
      bg: 'bg-amber-50',
      label: `${stats.pendingAssignments} package${stats.pendingAssignments > 1 ? 's' : ''} awaiting assignment`,
      href: '/packages',
    },
    stats?.pendingExpenseApprovals > 0 && {
      icon: AlertTriangle,
      cls: 'text-orange-600',
      bg: 'bg-orange-50',
      label: `${stats.pendingExpenseApprovals} expense approval${stats.pendingExpenseApprovals > 1 ? 's' : ''} pending`,
      href: '/expenses',
    },
    stats?.failedToday > 0 && {
      icon: AlertCircle,
      cls: 'text-rose-600',
      bg: 'bg-rose-50',
      label: `${stats.failedToday} failed deliver${stats.failedToday > 1 ? 'ies' : 'y'} today`,
      href: '/packages',
    },
    stats?.overdueInvoices > 0 && {
      icon: AlertCircle,
      cls: 'text-red-600',
      bg: 'bg-red-50',
      label: `${stats.overdueInvoices} overdue invoice${stats.overdueInvoices > 1 ? 's' : ''}`,
      href: '/accounting',
    },
  ].filter(Boolean) as Array<{ icon: typeof Clock; cls: string; bg: string; label: string; href: string }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {user?.role === 'DISPATCHER' ? 'Package dispatch & rider assignment' :
           user?.role === 'ACCOUNTANT' ? 'Financial overview & billing' :
           user?.role === 'MANAGER' ? 'Executive performance summary' :
           'Overview of today\'s operations'}
        </p>
      </div>

      {/* Role-specific action banner */}
      {!isLoading && user?.role === 'DISPATCHER' && (stats?.pendingAssignments ?? 0) > 0 && (
        <Link href="/assignments" className="flex items-center justify-between rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition-colors dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {stats.pendingAssignments} package{stats.pendingAssignments > 1 ? 's' : ''} awaiting dispatch
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Click to assign riders now</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}

      {!isLoading && user?.role === 'ACCOUNTANT' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue Today</p>
            <p className="mt-1.5 text-xl font-bold text-emerald-600">
              {stats?.revenueToday != null ? `₦${Number(stats.revenueToday).toLocaleString()}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue Invoices</p>
            <p className={`mt-1.5 text-xl font-bold ${(stats?.overdueInvoices ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats?.overdueInvoices ?? 0}
            </p>
          </div>
          <Link href="/accounting" className="rounded-xl border bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Go to Accounting</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
              View invoices & payments <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </Link>
        </div>
      )}

      {/* 4 KPI cards — 2×2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">{card.label}</p>
                  <p className="mt-2 text-xl font-bold tracking-tight truncate">
                    {isLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" /> : card.value}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-xs text-muted-foreground leading-tight">{card.sub}</p>
                    {!isLoading && card.delta != null && (
                      <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-medium ${card.delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {card.delta >= 0
                          ? <TrendUp01 className="h-3 w-3" />
                          : <TrendDown01 className="h-3 w-3" />}
                        {Math.abs(card.delta)}% WoW
                      </span>
                    )}
                  </div>
                </div>
                <div className={`shrink-0 rounded-xl p-2 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold">Delivery Volume</p>
          <p className="mb-4 text-xs text-muted-foreground">Last 7 days</p>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.deliveryTrend ?? []} barSize={18} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                <Bar dataKey="delivered" name="Delivered" fill="#FFB217" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="failed" name="Failed" fill="#AE1805" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold">Package Status</p>
          <p className="mb-4 text-xs text-muted-foreground">Current distribution</p>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.statusBreakdown ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="42%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {(stats?.statusBreakdown ?? []).map((entry: any) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pending Actions + Rider Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pending Actions */}
        <div className="min-w-0 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ZapFast className="h-3.5 w-3.5 text-amber-500" />
              Pending Actions
            </h2>
            {pendingActions.length === 0 && !isLoading && (
              <span className="text-xs text-emerald-600 font-medium">All clear</span>
            )}
          </div>
          <div className="divide-y">
            {isLoading && (
              <div className="px-5 py-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-muted" />
                ))}
              </div>
            )}
            {!isLoading && pendingActions.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No pending actions
              </div>
            )}
            {pendingActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  <div className={`shrink-0 rounded-lg p-1.5 ${item.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${item.cls}`} />
                  </div>
                  <span className="flex-1 text-sm">{item.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Rider Activity */}
        <div className="lg:col-span-2 min-w-0 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Rider Activity Today</h2>
            <Link href="/riders" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {[
                    { label: 'Rider',      cls: '' },
                    { label: 'Deliveries', cls: '' },
                    { label: 'Vehicle',    cls: 'hidden sm:table-cell' },
                    { label: 'Status',     cls: '' },
                  ].map((h) => (
                    <th key={h.label} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${h.cls}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && !(stats?.topRiders?.length) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No rider data</td></tr>
                )}
                {(stats?.topRiders ?? []).map((rider: any) => (
                  <tr key={rider.name} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{rider.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{rider.deliveriesToday}</span>
                      <span className="ml-1 text-xs text-muted-foreground">today</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">{rider.vehicle}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RIDER_STATUS_CLS[rider.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {rider.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity + Recent Packages */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 min-w-0 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-y">
            {isLoading && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!isLoading && (stats?.recentActivity ?? []).map((ev: any) => {
              const def = ACTIVITY_ICON[ev.type] ?? { icon: Package, cls: 'text-gray-500' };
              const Icon = def.icon;
              return (
                <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-0.5 shrink-0 ${def.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{ev.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(ev.time)}</p>
                  </div>
                  <Link href={`/packages/${ev.packageId}`} className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-primary">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 min-w-0 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent Packages</h2>
            <Link href="/packages" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {[
                    { label: 'Tracking #',   cls: '' },
                    { label: 'Recipient',    cls: '' },
                    { label: 'Destination', cls: 'hidden sm:table-cell' },
                    { label: 'Status',       cls: '' },
                  ].map((h) => (
                    <th key={h.label} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${h.cls}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && !stats?.recentPackages?.length && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No packages yet</td></tr>
                )}
                {stats?.recentPackages?.map((pkg: any) => (
                  <tr key={pkg.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/packages/${pkg.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {pkg.trackingNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[120px] truncate">{pkg.recipient?.name ?? '—'}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">{pkg.destCity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${STATUS_BADGE[pkg.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {pkg.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

