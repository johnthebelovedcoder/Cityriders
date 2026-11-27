'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { LayoutGrid01, List, AlertTriangle, File01, Route, XClose, Star01, Package, CheckCircle, Truck01, Inbox01, Download01 } from '@untitled-ui/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { KanbanBoard } from '@/components/assignments/KanbanBoard';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricCard } from '@/components/ui/MetricCard';
import { SelectField } from '@/components/ui/SelectField';

const COLUMNS = [
  { id: 'AWAITING_ASSIGNMENT', title: 'Unassigned' },
  { id: 'ASSIGNED', title: 'Assigned' },
  { id: 'PICKED_UP', title: 'Picked Up' },
  { id: 'IN_TRANSIT', title: 'In Transit' },
  { id: 'DELIVERED', title: 'Delivered' },
];

const STATUS_BADGE: Record<string, string> = {
  AWAITING_ASSIGNMENT: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-red-100 text-red-700',
};

export default function AssignmentsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [optimizePackage, setOptimizePackage] = useState<{ id: string; trackingNumber: string; destCity?: string } | null>(null);
  const qc = useQueryClient();

  const { data: optimizeSuggestions, isLoading: optimizeLoading } = useQuery({
    queryKey: ['assignments/optimize', optimizePackage?.id],
    queryFn: () => api.get('/assignments/optimize', { params: { packageId: optimizePackage!.id } }).then((r) => r.data),
    enabled: !!optimizePackage,
  });

  const assignMutation = useMutation({
    mutationFn: ({ packageId, riderId }: { packageId: string; riderId: string }) =>
      api.post('/assignments', { packageId, riderId }),
    onSuccess: () => {
      toast.success('Rider assigned');
      qc.invalidateQueries({ queryKey: ['packages/kanban'] });
      setOptimizePackage(null);
    },
    onError: () => toast.error('Failed to assign rider'),
  });

  const { data: rawPackages, isLoading } = useQuery({
    queryKey: ['packages/kanban'],
    queryFn: () => api.get('/packages/kanban').then((r) => {
      const raw = r.data;
      const pkgs: any[] = Array.isArray(raw) ? raw : (Object.values(raw) as any[][]).flat();
      return pkgs.map((p: any) => ({
        ...p,
        rider: p.rider ?? (p.assignments?.[0]?.rider ?? undefined),
      }));
    }),
  });

  const kanbanPackages = rawPackages ?? [];
  const filteredPackages = search
    ? kanbanPackages.filter((p: any) =>
        JSON.stringify({ trackingNumber: p.trackingNumber, recipient: p.recipient?.name, rider: p.rider ? `${p.rider.user.firstName} ${p.rider.user.lastName}` : '' }).toLowerCase().includes(search.toLowerCase())
      )
    : kanbanPackages;

  const riderLoad = useMemo(() => {
    if (!rawPackages) return [];
    const COLORS = ['bg-blue-500','bg-violet-500','bg-amber-500','bg-emerald-500','bg-rose-500','bg-cyan-500'];
    const map = new Map<string, { name: string; count: number; color: string }>();
    let idx = 0;
    for (const pkg of rawPackages) {
      if (!pkg.rider || !['ASSIGNED','PICKED_UP','IN_TRANSIT'].includes(pkg.status)) continue;
      const key = `${pkg.rider.user.firstName} ${pkg.rider.user.lastName}`;
      if (!map.has(key)) map.set(key, { name: key, count: 0, color: COLORS[idx++ % COLORS.length] ?? 'bg-blue-500' });
      map.get(key)!.count++;
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rawPackages]);

  const { data: conflicts } = useQuery({
    queryKey: ['assignments/conflicts'],
    queryFn: () => api.get('/assignments/conflicts').then((r) => r.data as any[]),
    staleTime: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
    staleTime: 300_000,
  });

  const { data: manifests } = useQuery({
    queryKey: ['dispatch/manifests'],
    queryFn: () => api.get('/dispatch/manifests').then((r) => r.data as any[]),
    staleTime: 60_000,
  });

  const workloadThreshold: number = settings?.maxActiveAssignments ?? 5;

  function printManifest() {
    const active = kanbanPackages.filter(
      (p: any) => p.rider && ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(p.status),
    );
    const byRider = new Map<string, { name: string; packages: any[] }>();
    for (const pkg of active) {
      const key = `${pkg.rider.user.firstName} ${pkg.rider.user.lastName}`;
      if (!byRider.has(key)) byRider.set(key, { name: key, packages: [] });
      byRider.get(key)!.packages.push(pkg);
    }
    const date = new Date().toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const rows = [...byRider.values()].map(({ name, packages }) => `
      <div class="rider-block">
        <div class="rider-header">${name} &nbsp;<span class="count">${packages.length} package${packages.length !== 1 ? 's' : ''}</span></div>
        <table>
          <thead><tr><th>#</th><th>Tracking</th><th>Recipient</th><th>Destination</th><th>Status</th><th>✓</th></tr></thead>
          <tbody>
            ${packages.map((p: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td class="mono">${p.trackingNumber}</td>
                <td>${p.recipient?.name ?? '—'}</td>
                <td>${[p.destStreet, p.destCity].filter(Boolean).join(', ') || p.destCity || '—'}</td>
                <td>${p.status.replace(/_/g, ' ')}</td>
                <td class="checkbox"></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Manifest — ${date}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; color: #111; padding: 32px; font-size: 12px; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
      .logo { font-size: 18px; font-weight: 900; }
      .sub { font-size: 10px; color: #666; letter-spacing: .08em; text-transform: uppercase; }
      .meta { text-align: right; }
      .meta p { font-size: 11px; color: #444; }
      .meta .title { font-size: 13px; font-weight: 700; color: #000; margin-bottom: 4px; }
      .rider-block { margin-bottom: 28px; break-inside: avoid; }
      .rider-header { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 12px; font-weight: 700; font-size: 12px; margin-bottom: 6px; }
      .count { font-weight: 400; color: #6b7280; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f9fafb; text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #e5e7eb; }
      td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      tr:last-child td { border-bottom: none; }
      .mono { font-family: monospace; font-size: 11px; font-weight: 600; color: #1d4ed8; }
      .checkbox { width: 20px; }
      .footer { border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 20px; font-size: 10px; color: #9ca3af; text-align: center; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="page-header">
        <div><p class="logo">CityRider</p><p class="sub">Dispatch Manifest</p></div>
        <div class="meta">
          <p class="title">Dispatch Manifest</p>
          <p>${date}</p>
          <p>${active.length} package${active.length !== 1 ? 's' : ''} across ${byRider.size} rider${byRider.size !== 1 ? 's' : ''}</p>
        </div>
      </div>
      ${rows || '<p style="color:#9ca3af;text-align:center;padding:40px 0;">No active dispatch packages</p>'}
      <div class="footer">Printed ${new Date().toLocaleTimeString()} &bull; CityRider Logistics &bull; Confidential</div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const movePackage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/packages/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages/kanban'] });
      qc.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <div className="space-y-6">
      {/* Route Optimisation Modal */}
      {optimizePackage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <Route className="h-4 w-4 text-primary" /> Rider Suggestions
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {optimizePackage.trackingNumber}{optimizePackage.destCity ? ` → ${optimizePackage.destCity}` : ''}
                </p>
              </div>
              <button onClick={() => setOptimizePackage(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <XClose className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2">
              {optimizeLoading && <p className="text-sm text-muted-foreground py-4 text-center">Calculating…</p>}
              {!optimizeLoading && optimizeSuggestions?.suggestions?.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No available riders found</p>
              )}
              {!optimizeLoading && optimizeSuggestions?.suggestions?.map((s: any) => (
                <div key={s.riderId} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.recommended ? 'border-primary/40 bg-primary/5' : ''}`}>
                  {s.recommended && <Star01 className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  {!s.recommended && <span className="h-3.5 w-3.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.riderName}</p>
                    <p className="text-xs text-muted-foreground">
                      Zone: {s.zoneName ?? 'Unassigned'} · {s.activeLoad} active package{s.activeLoad !== 1 ? 's' : ''}
                      {s.recommended && <span className="ml-1.5 text-primary font-medium">· Best match</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => assignMutation.mutate({ packageId: optimizePackage.id, riderId: s.riderId })}
                    disabled={assignMutation.isPending}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">Drag packages between columns or change status in list view</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printManifest}
            disabled={!kanbanPackages.length}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <File01 className="h-3.5 w-3.5" /> Print Manifest
          </button>
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid01 className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Unassigned" value={kanbanPackages.filter((p: any) => p.status === 'AWAITING_ASSIGNMENT').length} sub="Needs a rider" icon={Inbox01} iconCls="text-yellow-500" valueColor="text-yellow-600" />
        <MetricCard label="Assigned" value={kanbanPackages.filter((p: any) => p.status === 'ASSIGNED').length} sub="Rider ready to go" icon={Package} iconCls="text-blue-500" valueColor="text-blue-600" />
        <MetricCard label="In Transit" value={kanbanPackages.filter((p: any) => ['PICKED_UP', 'IN_TRANSIT'].includes(p.status)).length} sub="Out for delivery" icon={Truck01} iconCls="text-amber-500" valueColor="text-amber-600" />
        <MetricCard label="Delivered" value={kanbanPackages.filter((p: any) => p.status === 'DELIVERED').length} sub="Completed today" icon={CheckCircle} iconCls="text-emerald-500" valueColor="text-emerald-600" />
      </div>

      {conflicts && conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Route Conflicts Detected</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                {conflicts.length} rider{conflicts.length > 1 ? 's have' : ' has'} overlapping delivery windows. Review and reassign to avoid delays.
              </p>
              <div className="mt-3 space-y-2">
                {conflicts.map((c: any) => (
                  <div key={c.riderId} className="rounded-lg bg-amber-100 dark:bg-amber-900/40 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{c.riderName}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {c.conflictPackages.map((p: any) => (
                        <span key={p.id} className="inline-flex items-center gap-1 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/60 px-2 py-0.5 text-xs font-mono font-medium text-amber-800 dark:text-amber-300">
                          {p.trackingNumber}
                          <span className="text-amber-600 dark:text-amber-500">{p.deliveryWindow}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && riderLoad.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Active rider load</p>
          <div className="flex flex-wrap gap-2">
            {riderLoad.map((r) => {
              const overloaded = r.count >= workloadThreshold;
              return (
                <div key={r.name} className={`flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 ${overloaded ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                  <span className={`h-2 w-2 rounded-full ${r.color}`} />
                  <span className="text-xs font-medium">{r.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${overloaded ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>{r.count}</span>
                  {overloaded && <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                </div>
              );
            })}
          </div>
          {riderLoad.some((r) => r.count >= workloadThreshold) && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Riders with <AlertTriangle className="inline h-3 w-3" /> have reached the {workloadThreshold}-package workload threshold. Consider redistributing.
            </p>
          )}
        </div>
      )}

      {manifests && manifests.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent dispatch manifests</p>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Rider</th>
                  <th className="px-4 py-2 font-medium">Expected</th>
                  <th className="px-4 py-2 font-medium">Actual</th>
                  <th className="px-4 py-2 font-medium">Variance</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {manifests.slice(0, 10).map((m: any) => {
                  const expected = m.expectedPackageCount ?? m.packages?.length ?? null;
                  const actual = m.actualPackageCount ?? null;
                  const variance = expected != null && actual != null ? actual - expected : null;
                  return (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {m.rider ? `${m.rider.user.firstName} ${m.rider.user.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{expected ?? '—'}</td>
                    <td className="px-4 py-2 tabular-nums">{actual ?? '—'}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {variance != null ? (
                        <span className={variance === 0 ? 'text-emerald-600 font-medium' : variance > 0 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {m.pdfUrl ? (
                        <a
                          href={m.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download01 className="h-3 w-3" /> PDF
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No PDF</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <>
          {isLoading && <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">Loading board...</div>}
          {!isLoading && <KanbanBoard packages={kanbanPackages} />}
        </>
      )}

      {view === 'list' && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <div className="border-b px-4 py-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking #, recipient, rider…"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {['Tracking #', 'Recipient', 'Rider', 'Status', 'Weight', 'Move to'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!isLoading && filteredPackages.length === 0 && (
                <tr><td colSpan={6} className="py-2">
                  <EmptyState title="No packages to assign" description="Register a package to get started." />
                </td></tr>
              )}
              {filteredPackages.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/packages/${p.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {p.trackingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.recipient?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.rider ? `${p.rider.user.firstName} ${p.rider.user.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {(p.status ?? '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.weight ? `${p.weight}kg` : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.status === 'AWAITING_ASSIGNMENT' && (
                        <button
                          onClick={() => setOptimizePackage({ id: p.id, trackingNumber: p.trackingNumber, destCity: p.destCity })}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Route className="h-3 w-3" /> Optimize
                        </button>
                      )}
                      {p.status !== 'DELIVERED' && (
                        <SelectField value="" onChange={(status) => movePackage.mutate({ id: p.id, status })} placeholder="Move to…" options={COLUMNS.filter((column) => column.id !== p.status).map((column) => ({ value: column.id, label: column.title }))} aria-label={`Move ${p.trackingNumber} to status`} className="w-32" buttonClassName="h-8 rounded-lg px-2 text-xs" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
