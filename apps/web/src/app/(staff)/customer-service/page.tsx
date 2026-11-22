'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, AlertOctagon, RefreshCw05 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import LogInteractionDrawer from '@/components/customer-service/LogInteractionDrawer';
import EscalateModal from '@/components/customer-service/EscalateModal';
import { MetricCard } from '@/components/ui/MetricCard';

type Tab = 'search' | 'escalations' | 'followup';

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELIVERY_ATTEMPTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  RETURNED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const ESCALATION_PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-600 dark:text-red-400',
  HIGH: 'text-orange-600 dark:text-orange-400',
  MEDIUM: 'text-yellow-600 dark:text-yellow-400',
  LOW: 'text-muted-foreground',
};

const ESCALATION_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function CustomerServicePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationFilter, setEscalationFilter] = useState('');
  const [resolutionId, setResolutionId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['cs-search', submittedQ],
    queryFn: () => api.get(`/customer-service/packages/search?q=${encodeURIComponent(submittedQ)}`).then((r) => r.data),
    enabled: submittedQ.length >= 2,
  });

  const { data: pkgDetail } = useQuery({
    queryKey: ['cs-pkg-detail', selectedPkg?.id],
    queryFn: () => api.get(`/customer-service/packages/${selectedPkg.id}`).then((r) => r.data),
    enabled: !!selectedPkg?.id,
  });

  const customerId = (pkgDetail as any)?.senderId;
  const { data: customerPackages } = useQuery({
    queryKey: ['cs-customer-packages', customerId],
    queryFn: () => api.get('/packages', { params: { customerId, limit: 200 } }).then((r) => {
      const data = r.data;
      return Array.isArray(data) ? data : (data?.data ?? []);
    }),
    enabled: !!customerId,
    staleTime: 60_000,
  });

  const { data: followupPackages } = useQuery({
    queryKey: ['cs-followup'],
    queryFn: () => api.get('/packages?status=DELIVERY_ATTEMPTED').then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return list.filter((p: any) => !p.reattemptAt || new Date(p.reattemptAt).getTime() <= Date.now())
                 .sort((a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    }),
    enabled: tab === 'followup',
  });

  const { data: escalations } = useQuery({
    queryKey: ['cs-escalations', escalationFilter],
    queryFn: () => api.get(`/customer-service/escalations${escalationFilter ? `?status=${escalationFilter}` : ''}`).then((r) => r.data),
    enabled: tab === 'escalations',
  });

  const { mutate: updateEscalation } = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/customer-service/escalations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cs-escalations'] });
      setResolutionId(null);
      setResolutionText('');
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedQ(q);
  }

  function handleSelectPkg(pkg: any) {
    setSelectedPkg(pkg);
  }

  const detail = pkgDetail as any;
  const results = (searchResults as any[]) ?? [];
  const escalationList = (escalations as any[]) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Customer Service</h1>
            <p className="text-sm text-muted-foreground">Search packages, log interactions, and manage escalations</p>
          </div>
          {/* Desktop: pill buttons */}
          <div className="hidden sm:flex gap-2 shrink-0">
            <button
              onClick={() => setTab('search')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'search' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              Package Search
            </button>
            <button
              onClick={() => setTab('followup')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'followup' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              Follow-up Queue
            </button>
            <button
              onClick={() => setTab('escalations')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'escalations' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              Escalations
            </button>
          </div>
        </div>
        {/* Mobile: dropdown */}
        <div className="sm:hidden">
          <select
            value={tab}
            onChange={e => setTab(e.target.value as Tab)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="search">Package Search</option>
            <option value="followup">Follow-up Queue</option>
            <option value="escalations">Escalations</option>
          </select>
        </div>
      </div>

      {tab === 'search' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: search + results */}
          <div className="flex w-80 flex-col border-r">
            <form onSubmit={handleSearch} className="flex gap-2 p-3 border-b">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tracking #, customer, phone…"
                className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Search
              </button>
            </form>
            <div className="flex-1 overflow-y-auto">
              {isFetching && <p className="p-4 text-center text-sm text-muted-foreground">Searching…</p>}
              {!isFetching && submittedQ.length >= 2 && results.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">No packages found</p>
              )}
              {results.map((pkg: any) => (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPkg(pkg)}
                  className={`w-full border-b p-3 text-left hover:bg-muted/50 transition-colors ${selectedPkg?.id === pkg.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{pkg.trackingNumber}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pkg.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {pkg.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm truncate">{pkg.sender?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">â†’ {pkg.recipient?.name} Â· {pkg.destCity}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: detail */}
          <div className="flex-1 overflow-y-auto">
            {!selectedPkg && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p className="text-sm">Search and select a package to view details</p>
              </div>
            )}
            {selectedPkg && !detail && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p className="text-sm">Loading…</p>
              </div>
            )}
            {detail && (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold">{detail.trackingNumber}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[detail.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {detail.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.sender?.name} â†’ {detail.recipient?.name} Â· {detail.destCity}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLogDrawer(true)}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    >
                      Log Interaction
                    </button>
                    <button
                      onClick={() => setShowEscalateModal(true)}
                      className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                    >
                      Escalate
                    </button>
                  </div>
                </div>

                {/* Customer & Recipient info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Sender</p>
                    <p className="font-medium">{detail.sender?.name}</p>
                    <p className="text-sm text-muted-foreground">{detail.sender?.phone}</p>
                    {detail.sender?.email && <p className="text-sm text-muted-foreground">{detail.sender?.email}</p>}
                  </div>
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Recipient</p>
                    <p className="font-medium">{detail.recipient?.name}</p>
                    <p className="text-sm text-muted-foreground">{detail.recipient?.phone}</p>
                    <p className="text-sm text-muted-foreground">{detail.recipient?.deliveryAddress}</p>
                  </div>
                </div>

                {/* Customer delivery summary */}
                {customerPackages && customerPackages.length > 0 && (() => {
                  const total = customerPackages.length;
                  const delivered = customerPackages.filter((p: any) => p.status === 'DELIVERED').length;
                  const failed = customerPackages.filter((p: any) => ['RETURNED', 'CANCELLED'].includes(p.status)).length;
                  const inTransit = customerPackages.filter((p: any) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(p.status)).length;
                  const attempted = customerPackages.filter((p: any) => p.status === 'DELIVERY_ATTEMPTED').length;
                  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
                  const recent = [...customerPackages].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
                  return (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Delivery Summary</p>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                          { label: 'Total', value: total, cls: 'text-foreground' },
                          { label: 'Delivered', value: delivered, cls: 'text-emerald-600' },
                          { label: 'In Transit', value: inTransit, cls: 'text-blue-600' },
                          { label: 'Attempted', value: attempted, cls: 'text-amber-600' },
                          { label: 'Returned', value: failed, cls: 'text-red-600' },
                        ].map(({ label, value, cls }) => (
                          <div key={label} className="rounded-md border bg-card py-2 px-1">
                            <p className={`text-lg font-bold tabular-nums ${cls}`}>{value}</p>
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${successRate}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{successRate}% delivered</span>
                      </div>
                      {recent.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Recent packages</p>
                          <div className="space-y-1">
                            {recent.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                                <span className={`font-mono font-semibold ${p.id === detail.id ? 'text-primary' : 'text-muted-foreground'}`}>{p.trackingNumber}</span>
                                <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[p.status] ?? 'bg-muted text-muted-foreground'}`}>
                                  {p.status?.replace(/_/g, ' ')}
                                </span>
                                <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Status history */}
                <div>
                  <h3 className="mb-3 font-semibold">Status History</h3>
                  <div className="space-y-2">
                    {detail.statusHistory?.map((ev: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{ev.status?.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(ev.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {ev.note && <p className="mt-0.5 text-sm text-muted-foreground">{ev.note}</p>}
                          {ev.performedBy && (
                            <p className="text-xs text-muted-foreground">by {ev.performedBy.firstName} {ev.performedBy.lastName}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interaction log */}
                <div>
                  <h3 className="mb-3 font-semibold">Interaction Log</h3>
                  {detail.interactions?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interactions recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.interactions?.map((intr: any) => (
                        <div key={intr.id} className="rounded-md border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{intr.channel}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(intr.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm">{intr.summary}</p>
                          {intr.actionTaken && <p className="text-xs text-muted-foreground">Action: {intr.actionTaken}</p>}
                          {intr.outcome && <p className="text-xs text-muted-foreground">Outcome: {intr.outcome}</p>}
                          <p className="text-xs text-muted-foreground">— {intr.staff?.firstName} {intr.staff?.lastName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Escalations for this package */}
                {detail.escalations?.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-semibold">Escalations</h3>
                    <div className="space-y-2">
                      {detail.escalations?.map((esc: any) => (
                        <div key={esc.id} className="rounded-md border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase ${ESCALATION_PRIORITY_COLORS[esc.priority] ?? ''}`}>{esc.priority}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESCALATION_STATUS_COLORS[esc.status] ?? ''}`}>{esc.status}</span>
                          </div>
                          <p className="text-sm">{esc.reason}</p>
                          <p className="text-xs text-muted-foreground">Requested: {esc.requestedAction}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'followup' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Follow-up Queue</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Packages with a failed delivery attempt that need a follow-up call or action.
            </p>
          </div>
          {!followupPackages && <p className="text-sm text-muted-foreground">Loading…</p>}
          {followupPackages && followupPackages.length === 0 && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 px-4 py-6 text-center text-sm text-emerald-700 dark:text-emerald-400">
              All clear — no packages need follow-up right now.
            </p>
          )}
          {followupPackages && followupPackages.length > 0 && (
            <div className="rounded-lg border bg-card overflow-hidden">
              {followupPackages.map((pkg: any) => (
                <div key={pkg.id} className="border-b last:border-0 px-4 py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{pkg.trackingNumber}</span>
                      <span className="rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 text-[10px] font-medium uppercase">
                        Attempted
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{pkg.sender?.name ?? pkg.customer?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      → {pkg.recipient?.name} · {pkg.destCity}
                    </p>
                    {pkg.reattemptAt && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Scheduled reattempt: {new Date(pkg.reattemptAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(pkg.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => { setTab('search'); setQ(pkg.trackingNumber); setSubmittedQ(pkg.trackingNumber); }}
                    className="shrink-0 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'escalations' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Open" value={escalationList.filter((e: any) => e.status === 'OPEN').length} sub="Awaiting action" icon={AlertOctagon} iconCls="text-red-500" valueColor="text-red-600" />
            <MetricCard label="In Progress" value={escalationList.filter((e: any) => e.status === 'IN_PROGRESS').length} sub="Being handled" icon={RefreshCw05} iconCls="text-blue-500" valueColor="text-blue-600" />
            <MetricCard label="Resolved" value={escalationList.filter((e: any) => e.status === 'RESOLVED').length} sub="Closed cases" icon={CheckCircle} iconCls="text-emerald-500" valueColor="text-emerald-600" />
            <MetricCard label="Urgent" value={escalationList.filter((e: any) => e.priority === 'URGENT').length} sub="High priority" icon={AlertTriangle} iconCls="text-orange-500" valueColor="text-orange-600" />
          </div>
          <div className="flex items-center gap-2">
            {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => setEscalationFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${escalationFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          {escalationList.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No escalations found.</p>
          ) : (
            <div className="space-y-3">
              {escalationList.map((esc: any) => (
                <div key={esc.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${ESCALATION_PRIORITY_COLORS[esc.priority] ?? ''}`}>{esc.priority}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESCALATION_STATUS_COLORS[esc.status] ?? ''}`}>{esc.status?.replace(/_/g, ' ')}</span>
                        {esc.package && <span className="font-mono text-xs text-muted-foreground">{esc.package.trackingNumber}</span>}
                      </div>
                      <p className="text-sm font-medium">{esc.reason}</p>
                      <p className="text-xs text-muted-foreground">Requested: {esc.requestedAction}</p>
                      {esc.customer && <p className="text-xs text-muted-foreground">Customer: {esc.customer.name} Â· {esc.customer.phone}</p>}
                      <p className="text-xs text-muted-foreground">
                        Raised by {esc.raisedBy?.firstName} {esc.raisedBy?.lastName} Â· {new Date(esc.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    {esc.status === 'OPEN' || esc.status === 'IN_PROGRESS' ? (
                      <div className="flex flex-col gap-1">
                        {esc.status === 'OPEN' && (
                          <button
                            onClick={() => updateEscalation({ id: esc.id, status: 'IN_PROGRESS' })}
                            className="rounded border px-3 py-1 text-xs hover:bg-muted"
                          >Start</button>
                        )}
                        <button
                          onClick={() => setResolutionId(esc.id)}
                          className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                        >Resolve</button>
                        <button
                          onClick={() => updateEscalation({ id: esc.id, status: 'CLOSED' })}
                          className="rounded border px-3 py-1 text-xs hover:bg-muted"
                        >Close</button>
                      </div>
                    ) : null}
                  </div>
                  {resolutionId === esc.id && (
                    <div className="flex gap-2 pt-1">
                      <input
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Resolution note…"
                        className="flex-1 h-8 rounded border border-input bg-background px-2 text-sm"
                      />
                      <button
                        onClick={() => updateEscalation({ id: esc.id, status: 'RESOLVED', resolution: resolutionText })}
                        className="rounded bg-primary px-3 text-sm text-primary-foreground"
                      >Save</button>
                      <button onClick={() => setResolutionId(null)} className="rounded border px-3 text-sm">Cancel</button>
                    </div>
                  )}
                  {esc.resolution && <p className="text-xs text-muted-foreground">Resolution: {esc.resolution}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drawers / Modals */}
      {detail && (
        <>
          <LogInteractionDrawer
            open={showLogDrawer}
            onClose={() => setShowLogDrawer(false)}
            packageId={detail.id}
            customerId={detail.senderId}
          />
          <EscalateModal
            open={showEscalateModal}
            onClose={() => setShowEscalateModal(false)}
            packageId={detail.id}
            customerId={detail.senderId}
          />
        </>
      )}
    </div>
  );
}

