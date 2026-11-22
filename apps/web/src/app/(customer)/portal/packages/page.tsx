'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Calendar, XClose, RefreshCcw01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

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
};

const STATUSES = [
  'All', 'REGISTERED', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP',
  'IN_TRANSIT', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'RETURNED', 'CANCELLED',
];

export default function PortalPackagesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rescheduleTarget, setRescheduleTarget] = useState<{ id: string; trackingNumber: string } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      api.patch(`/portal/packages/${id}/reschedule`, { requestedDate: date }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Reschedule request submitted. Our team will confirm your new delivery date.');
      qc.invalidateQueries({ queryKey: ['portal-packages'] });
      setRescheduleTarget(null);
      setRescheduleDate('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to submit reschedule request'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['portal-packages', status, dateFrom, dateTo, page],
    queryFn: () =>
      api.get('/portal/packages', {
        params: {
          ...(status !== 'All' ? { status } : {}),
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
          page,
        },
      }).then((r) => r.data),
  });

  const packages: any[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Packages</h1>
        <p className="text-muted-foreground">Track all your shipments</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <span className="text-muted-foreground text-sm">&mdash;</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        {(dateFrom || dateTo || status !== 'All') && (
          <button onClick={() => { setStatus('All'); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear filters
          </button>
        )}
      </div>

      {meta && (
        <p className="text-xs text-muted-foreground">{meta.total} shipment{meta.total !== 1 ? 's' : ''}</p>
      )}


      {isLoading && <div className="py-12 text-center text-muted-foreground">Loading&hellip;</div>}

      {!isLoading && packages.length === 0 && (
        <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">No packages found</div>
      )}

      {!isLoading && packages.length > 0 && meta && meta.total > meta.limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= Math.ceil(meta.total / meta.limit)}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">Request Reschedule</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{rescheduleTarget.trackingNumber}</p>
              </div>
              <button onClick={() => { setRescheduleTarget(null); setRescheduleDate(''); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <XClose className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">Pick a preferred delivery date. Our team will contact you to confirm availability.</p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block">Preferred Date</label>
                <input
                  type="date"
                  min={minDateStr}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t px-5 pb-5 pt-4">
              <button onClick={() => { setRescheduleTarget(null); setRescheduleDate(''); }} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                disabled={!rescheduleDate || rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate({ id: rescheduleTarget.id, date: rescheduleDate })}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {rescheduleMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && packages.length > 0 && (
        <div className="rounded-xl border bg-card divide-y">
          {packages.map((pkg: any) => (
            <div key={pkg.id}>
              <button
                onClick={() => setExpanded(expanded === pkg.id ? null : pkg.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tracking #</p>
                    <p className="font-mono text-xs font-semibold text-primary">{pkg.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recipient</p>
                    <p className="text-sm font-medium">{pkg.recipient?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Destination</p>
                    <p className="text-sm text-muted-foreground">{pkg.destCity ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[pkg.status] ?? 'bg-muted text-foreground'}`}>
                      {pkg.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {expanded === pkg.id ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {expanded === pkg.id && (
                <div className="border-t bg-muted/20 px-5 py-4 space-y-4">
                  {pkg.status === 'DELIVERY_ATTEMPTED' && (
                    <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 px-4 py-3">
                      <RefreshCcw01 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-200">Delivery was attempted but unsuccessful</p>
                        <p className="mt-0.5 text-xs text-orange-700 dark:text-orange-400">Request a new delivery date and our team will contact you to confirm.</p>
                      </div>
                      <button
                        onClick={() => setRescheduleTarget({ id: pkg.id, trackingNumber: pkg.trackingNumber })}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" /> Reschedule
                      </button>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Delivery Address</p>
                      <p className="text-sm">{pkg.recipient?.deliveryAddress ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Submitted</p>
                      <p className="text-sm">{new Date(pkg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  {pkg.statusHistory?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Status History</p>
                      <div className="space-y-1.5">
                        {pkg.statusHistory.map((h: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className={`mt-0.5 rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[h.status] ?? 'bg-muted text-foreground'}`}>
                              {h.status.replace(/_/g, ' ')}
                            </span>
                            {h.note && <span className="text-muted-foreground">{h.note}</span>}
                            <span className="ml-auto text-muted-foreground shrink-0">{new Date(h.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
