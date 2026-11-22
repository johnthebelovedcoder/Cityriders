'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

function ConfirmModal({ remittance, onClose }: { remittance: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(Number(remittance.expectedAmount)));

  const mut = useMutation({
    mutationFn: () => api.patch(
      `/riders/${remittance.riderId}/cod-remittances/${remittance.id}/confirm`,
      { collectedAmount: Number(amount) }
    ).then(r => r.data),
    onSuccess: () => {
      toast.success('Remittance confirmed');
      qc.invalidateQueries({ queryKey: ['rider-cod', remittance.riderId] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error confirming'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card shadow-xl">
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Confirm Remittance</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">âœ•</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Package: <span className="font-medium text-foreground">{remittance.package?.trackingNumber}</span></p>
            <p className="text-sm text-muted-foreground">Expected: <span className="font-mono font-semibold text-foreground">{fmt(remittance.expectedAmount)}</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Collected Amount (₦)</label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              type="number" min="0" value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          {mut.error && <p className="text-xs text-destructive">{(mut.error as any).response?.data?.message ?? 'Error'}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={() => mut.mutate()} disabled={mut.isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {mut.isPending ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RiderCodSection({ riderId }: { riderId: string }) {
  const [confirmTarget, setConfirmTarget] = useState<any>(null);

  const { data: remittances = [], isLoading } = useQuery<any[]>({
    queryKey: ['rider-cod', riderId],
    queryFn: () => api.get(`/riders/${riderId}/cod-remittances`).then(r => r.data),
  });

  const unremitted = remittances.filter((r: any) => !r.remittedAt);
  const totalPending = unremitted.reduce((s: number, r: any) => s + Number(r.expectedAmount), 0);

  if (isLoading) return null;
  if (remittances.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="font-semibold">COD Remittances</h2>
          {unremitted.length > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">{fmt(totalPending)} pending collection</p>
          )}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
            {['Package', 'Destination', 'Expected', 'Collected', 'Status', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {remittances.map((r: any) => (
            <tr key={r.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/packages/${r.packageId}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                  {r.package?.trackingNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.package?.destCity ?? '—'}</td>
              <td className="px-4 py-3 font-mono">{fmt(r.expectedAmount)}</td>
              <td className="px-4 py-3 font-mono">{r.collectedAmount != null ? fmt(r.collectedAmount) : '—'}</td>
              <td className="px-4 py-3">
                {r.remittedAt ? (
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Remitted</span>
                ) : (
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>
                )}
              </td>
              <td className="px-4 py-3">
                {!r.remittedAt && (
                  <button onClick={() => setConfirmTarget(r)}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    Confirm
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmTarget && <ConfirmModal remittance={confirmTarget} onClose={() => setConfirmTarget(null)} />}
    </div>
  );
}

