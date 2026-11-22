'use client';

import { Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { Truck01, Copy01, Check, ArrowUp, ArrowDown, Package, CheckCircle, AlertTriangle } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { DispatchModal } from '@/components/packages/DispatchModal';
import { BulkUploadButton } from '@/components/packages/BulkUploadButton';
import { RegisterPackageModal } from '@/components/packages/RegisterPackageModal';
import { PackageDetailDrawer } from '@/components/packages/PackageDetailDrawer';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricCard } from '@/components/ui/MetricCard';

const STATUS_BADGE: Record<string, string> = {
  REGISTERED: 'bg-gray-100 text-gray-700',
  AWAITING_ASSIGNMENT: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  DELIVERY_ATTEMPTED: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
  PENDING: 'bg-slate-100 text-slate-700',
  COLLECTED: 'bg-cyan-100 text-cyan-700',
  RECEIVED_AT_OFFICE: 'bg-teal-100 text-teal-700',
  SORTED: 'bg-violet-100 text-violet-700',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
  ON_HOLD: 'bg-gray-100 text-gray-600',
};

function PackagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(() => {
    try { return localStorage.getItem('pkg-search') ?? ''; } catch { return ''; }
  });
  const [status, setStatus] = useState(() => {
    try { return localStorage.getItem('pkg-status') ?? ''; } catch { return ''; }
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDispatch, setShowDispatch] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [detailPkgId, setDetailPkgId] = useState<string | null>(null);
  const { range, setRange } = usePeriodFilter('this-month');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>(() => {
    try { return localStorage.getItem('pkg-sort') ?? ''; } catch { return ''; }
  });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    try { return (localStorage.getItem('pkg-sort-dir') as 'asc' | 'desc') ?? 'desc'; } catch { return 'desc'; }
  });

  function toggleSort(field: string) {
    const dir = sortField === field && sortDir === 'desc' ? 'asc' : 'desc';
    setSortField(field); setSortDir(dir);
    try { localStorage.setItem('pkg-sort', field); localStorage.setItem('pkg-sort-dir', dir); } catch {}
  }

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowRegister(true);
      router.replace('/packages');
    }
    const detail = searchParams.get('detail');
    if (detail) {
      setDetailPkgId(detail);
      router.replace('/packages');
    }
  }, [searchParams, router]);

  const { data: statsData } = useQuery({
    queryKey: ['packages-stats', range.from, range.to],
    queryFn: () => api.get('/packages/stats', { params: { from: range.from, to: range.to } }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['packages', search, status, page, range.from, range.to],
    queryFn: () =>
      api.get('/packages', { params: { search: search || undefined, status: status || undefined, page, limit: 25, from: range.from, to: range.to } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const onSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    setPage(1);
    try { if (v) localStorage.setItem('pkg-search', v); else localStorage.removeItem('pkg-search'); } catch {}
  }, []);

  const qc = useQueryClient();

  const { data: slaAlerts } = useQuery({
    queryKey: ['packages/sla-alerts'],
    queryFn: () => api.get('/packages/sla-alerts').then((r) => r.data as any[]),
    staleTime: 60_000,
  });

  const bulkStatus = useMutation({
    mutationFn: (newStatus: string) =>
      api.post('/packages/bulk-status', { packageIds: [...selected], status: newStatus }),
    onSuccess: (_: any, newStatus: string) => {
      toast.success(`${selected.size} package(s) updated to ${newStatus.replace(/_/g, ' ')}`);
      qc.invalidateQueries({ queryKey: ['packages'] });
      setSelected(new Set());
    },
    onError: () => toast.error('Bulk update failed'),
  });

  const packages = data?.data ?? [];
  const meta = data?.meta;

  const sorted = useMemo(() => {
    if (!sortField) return packages;
    return [...packages].sort((a: any, b: any) => {
      const av = sortField === 'date' ? new Date(a.createdAt).getTime() :
                 sortField === 'status' ? a.status :
                 sortField === 'tracking' ? a.trackingNumber : 0;
      const bv = sortField === 'date' ? new Date(b.createdAt).getTime() :
                 sortField === 'status' ? b.status :
                 sortField === 'tracking' ? b.trackingNumber : 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [packages, sortField, sortDir]);

  const allIds = sorted.map((p: any) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id: string) => selected.has(id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) { allIds.forEach((id: string) => next.delete(id)); }
      else { allIds.forEach((id: string) => next.add(id)); }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function exportCSV() {
    const rows = sorted.filter((p: any) => selected.has(p.id));
    const header = ['Tracking #', 'Sender', 'Recipient', 'Destination', 'Status', 'Rider', 'Date'];
    const lines = [header, ...rows.map((p: any) => {
      const a = p.assignments?.find((x: any) => x.isActive);
      return [p.trackingNumber, p.sender?.name ?? '', p.recipient?.name ?? '', p.destCity ?? '', p.status,
        a ? `${a.rider.user.firstName} ${a.rider.user.lastName}` : '', new Date(p.createdAt).toLocaleDateString()];
    })];
    const csv = lines.map((r: unknown[]) => r.map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv,' + encodeURIComponent(csv);
    link.download = `packages-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Packages</h1>
          <p className="text-muted-foreground">Manage all shipments and parcels</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkUploadButton />
          <button onClick={() => setShowRegister(true)} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + Register Package
          </button>
        </div>
      </div>

      {/* Period filter + Stats */}
      <div className="flex items-center gap-3">
        <PeriodFilter value={range} onChange={setRange} defaultPreset="this-month" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Packages"
          value={statsData?.total ?? '-'}
          sub="Shipments this period"
          icon={Package}
          iconCls="text-foreground bg-muted"
        />
        <MetricCard
          label="In Transit"
          value={statsData?.inTransit ?? '-'}
          sub="Currently on the move"
          icon={Truck01}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Delivered"
          value={statsData?.delivered ?? '-'}
          sub="Successfully delivered"
          icon={CheckCircle}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
        <MetricCard
          label="Pending / Other"
          value={(statsData?.total ?? 0) - (statsData?.delivered ?? 0) - (statsData?.inTransit ?? 0)}
          sub="Not yet delivered"
          icon={AlertTriangle}
          iconCls="text-orange-500 bg-orange-50"
          valueColor="text-orange-500"
        />
      </div>

      {/* SLA alert banner */}
      {slaAlerts && slaAlerts.length > 0 && (
        <div className={`rounded-xl border p-4 ${slaAlerts.some((a: any) => a.isBreached) ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${slaAlerts.some((a: any) => a.isBreached) ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${slaAlerts.some((a: any) => a.isBreached) ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'}`}>
                SLA {slaAlerts.some((a: any) => a.isBreached) ? 'Breach' : 'Warning'} — {slaAlerts.length} package{slaAlerts.length > 1 ? 's' : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {slaAlerts.map((a: any) => (
                  <div key={a.id} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${a.isBreached ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'}`}>
                    <span className="font-mono font-semibold">{a.trackingNumber}</span>
                    <span>·</span>
                    <span>{a.isBreached ? `${a.hoursElapsed}h (breached ${(a.hoursElapsed - a.slaHours).toFixed(1)}h ago)` : `${a.hoursElapsed}h / ${a.slaHours}h SLA`}</span>
                    {a.riderName && <span className="text-muted-foreground">· {a.riderName}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk selection toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDispatch(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Truck01 className="h-3.5 w-3.5" /> Assign to Rider
            </button>
            <select
              defaultValue=""
              onChange={(e) => { if (!e.target.value) return; bulkStatus.mutate(e.target.value); e.target.value = ''; }}
              disabled={bulkStatus.isPending}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            >
              <option value="">Update Status…</option>
              <option value="SORTED">Sorted</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="RETURNED">Returned</option>
            </select>
            <button
              onClick={exportCSV}
              className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium hover:bg-muted"
            >
              Export CSV
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex h-8 items-center px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={onSearch}
          placeholder="Search tracking number, sender, recipient"
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); try { localStorage.setItem('pkg-status', e.target.value); } catch {} }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Statuses</option>
          <optgroup label="Phase 2">
            <option value="PENDING">Pending</option>
            <option value="COLLECTED">Collected</option>
            <option value="RECEIVED_AT_OFFICE">Received at Office</option>
            <option value="SORTED">Sorted</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="ON_HOLD">On Hold</option>
          </optgroup>
          <optgroup label="Legacy">
            <option value="REGISTERED">Registered</option>
            <option value="AWAITING_ASSIGNMENT">Awaiting Assignment</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERY_ATTEMPTED">Delivery Attempted</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </optgroup>
        </select>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 w-10">
                  {packages.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                      title="Select all"
                    />
                  )}
                </th>
                {[
                  { label: 'Tracking #', field: 'tracking' },
                  { label: 'Sender', field: null },
                  { label: 'Recipient', field: null },
                  { label: 'Destination', field: null },
                  { label: 'Status', field: 'status' },
                  { label: 'Rider', field: null },
                  { label: 'Date', field: 'date' },
                ].map(({ label, field }) =>
                  field ? (
                    <th key={label} onClick={() => toggleSort(field)}
                      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground">
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {sortField === field
                          ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                          : <span className="opacity-20 text-[10px]"></span>}
                      </span>
                    </th>
                  ) : (
                    <th key={label} className="px-4 py-3 font-medium">{label}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading</td></tr>
              )}
              {!isLoading && packages.length === 0 && (
                <tr><td colSpan={8} className="py-2">
                  <EmptyState title="No packages found" description="Register your first package to get started." />
                </td></tr>
              )}
              {sorted.map((pkg: any) => {
                const activeAssignment = pkg.assignments?.find((a: any) => a.isActive);
                return (
                  <tr key={pkg.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(pkg.id)} onChange={() => toggleOne(pkg.id)} className="cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailPkgId(pkg.id)}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {pkg.trackingNumber}
                        </button>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(pkg.trackingNumber).catch(() => {}); setCopiedId(pkg.id); setTimeout(() => setCopiedId((c) => (c === pkg.id ? null : c)), 1500); }}
                          className="text-muted-foreground/40 hover:text-muted-foreground"
                          title="Copy tracking number"
                        >
                          {copiedId === pkg.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy01 className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{pkg.sender?.name}</td>
                    <td className="px-4 py-3">{pkg.recipient?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pkg.destCity}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${STATUS_BADGE[pkg.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {pkg.status.replace(/_/g, ' ')}
                        </span>
                        {pkg.invoicedAt && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Invoiced</span>
                        )}
                        {pkg.promisedDelivery && !['DELIVERED','RETURNED','CANCELLED'].includes(pkg.status) && new Date(pkg.promisedDelivery) < new Date() && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">SLA breach</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {activeAssignment ? `${activeAssignment.rider.user.firstName} ${activeAssignment.rider.user.lastName}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(pkg.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {(page - 1) * meta.limit + 1}{'-'}{Math.min(page * meta.limit, meta.total)} of {meta.total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="rounded-lg border px-3 py-1 text-sm hover:bg-muted disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} className="rounded-lg border px-3 py-1 text-sm hover:bg-muted disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showDispatch && (
        <DispatchModal
          packageIds={[...selected]}
          onClose={() => { setShowDispatch(false); setSelected(new Set()); }}
        />
      )}

      {showRegister && <RegisterPackageModal onClose={() => setShowRegister(false)} />}

      {detailPkgId && (
        <PackageDetailDrawer packageId={detailPkgId} onClose={() => setDetailPkgId(null)} />
      )}
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense>
      <PackagesContent />
    </Suspense>
  );
}
