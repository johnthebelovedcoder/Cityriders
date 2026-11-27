'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckDone01, CheckCircle, AlertOctagon } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { MetricCard } from '@/components/ui/MetricCard';

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation/pending', search],
    queryFn: () =>
      api.get('/packages/reconciliation/pending', { params: search ? { search } : {} })
        .then((r) => r.data),
  });

  const { data: allData } = useQuery({
    queryKey: ['reconciliation/all-stats'],
    queryFn: () =>
      api.get('/packages/reconciliation/pending').then((r) => r.data),
    staleTime: 30_000,
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/packages/${id}/reconcile`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Package marked as reconciled');
      qc.invalidateQueries({ queryKey: ['reconciliation/pending'] });
      qc.invalidateQueries({ queryKey: ['reconciliation/all-stats'] });
      setConfirming(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Reconciliation failed'),
  });

  const packages: any[] = data?.data ?? [];
  const total: number = allData?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Receipt Reconciliation</h1>
        <p className="text-muted-foreground">Verify physical delivery receipts against system records</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Pending Reconciliation"
          value={total}
          sub="delivered, unreconciled"
          icon={AlertOctagon}
          iconCls="text-orange-500 bg-orange-50"
          valueColor={total > 0 ? 'text-orange-600' : undefined}
        />
        <MetricCard
          label="Showing"
          value={packages.length}
          sub={search ? `matching "${search}"` : 'all pending'}
          icon={CheckDone01}
          iconCls="text-blue-500 bg-blue-50"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tracking #, recipient, sender…"
          className="h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear
          </button>
        )}
      </div>

      {isLoading && (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">Loading…</div>
      )}

      {!isLoading && packages.length === 0 && (
        <div className="rounded-xl border bg-card py-16 text-center space-y-2">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
          <p className="font-semibold text-lg">All caught up!</p>
          <p className="text-sm text-muted-foreground">
            {search ? `No unreconciled packages matching "${search}"` : 'No delivered packages pending reconciliation'}
          </p>
        </div>
      )}

      {!isLoading && packages.length > 0 && (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {['Tracking #', 'Recipient', 'Sender', 'Rider', 'Delivered', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg: any) => {
                const rider = pkg.assignments?.[0]?.rider;
                const riderName = rider ? `${rider.user.firstName} ${rider.user.lastName}` : '—';
                const deliveredAt = pkg.updatedAt
                  ? new Date(pkg.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—';
                const isConfirming = confirming === pkg.id;

                return (
                  <tr key={pkg.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-primary">{pkg.trackingNumber}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{pkg.recipient?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pkg.sender?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{riderName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{deliveredAt}</td>
                    <td className="px-4 py-3">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => reconcileMutation.mutate(pkg.id)}
                            disabled={reconcileMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {reconcileMutation.isPending ? 'Saving…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirming(null)}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirming(pkg.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <CheckDone01 className="h-3.5 w-3.5" /> Mark Reconciled
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
