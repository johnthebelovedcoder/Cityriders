'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

type Props = { packageIds: string[]; onClose: () => void };

const SCORE_BADGE: Record<string, string> = {
  'Best Match': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Good':       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Available':  'bg-muted text-muted-foreground',
};

export function DispatchModal({ packageIds, onClose }: Props) {
  const qc = useQueryClient();
  const [riderId, setRiderId] = useState('');
  const [expectedCount, setExpectedCount] = useState(String(packageIds.length));

  const { data: riders, isLoading } = useQuery({
    queryKey: ['riders/smart-dispatch'],
    queryFn: () => api.get('/riders/smart-dispatch').then((r) => r.data as any[]),
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((response) => response.data),
  });
  const capacity = Number(settings?.maxPackagesPerRider ?? 20);

  // Auto-select the top recommendation when data arrives
  const topRider = riders?.[0];
  const selectedId = riderId || topRider?.id || '';

  const create = useMutation({
    mutationFn: () => api.post('/dispatch/manifests', { packageIds, riderId: selectedId, expectedPackageCount: Number(expectedCount) }),
    onSuccess: () => {
      toast.success(`${packageIds.length} package(s) dispatched`);
      qc.invalidateQueries({ queryKey: ['packages'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Dispatch failed'),
  });

  return (
    <Drawer
      title={`Dispatch Packages (${packageIds.length})`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            disabled={!selectedId || create.isPending}
            onClick={() => create.mutate()}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {create.isPending ? 'Dispatching…' : 'Dispatch'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Riders ranked by zone match, current load, and on-time history.</p>
        <label className="block space-y-1">
          <span className="text-xs font-medium">Expected packages from customer</span>
          <input type="number" min={0} value={expectedCount} onChange={(e) => setExpectedCount(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          <span className="text-xs text-muted-foreground">Selected and received: {packageIds.length}. A mismatch must be reconciled before dispatch.</span>
        </label>

        {isLoading && <p className="text-sm text-muted-foreground">Loading riders…</p>}

        {riders?.map((rider: any, idx: number) => {
          const isSelected = (riderId || topRider?.id) === rider.id;
          const projectedLoad = Number(rider.currentLoad ?? 0) + packageIds.length;
          const exceedsCapacity = projectedLoad > capacity;
          return (
            <label
              key={rider.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="dispatch-rider"
                value={rider.id}
                checked={isSelected}
                onChange={() => setRiderId(rider.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">
                    {rider.user.firstName} {rider.user.lastName}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${SCORE_BADGE[rider.scoreLabel] ?? SCORE_BADGE['Available']}`}>
                    {idx === 0 ? '★ ' : ''}{rider.scoreLabel}
                  </span>
                  {rider.zoneMatch && (
                    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                      Zone match
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{rider.vehicleType ?? 'Rider'} · {rider.zone?.name}</span>
                  <span>Load: {rider.currentLoad} active · {projectedLoad} after this dispatch / {capacity}</span>
                  {exceedsCapacity && <span className="font-semibold text-amber-700">Above configured capacity</span>}
                  <span>On-time: {rider.onTimeRate}%</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold tabular-nums ${rider.score >= 85 ? 'text-emerald-600' : rider.score >= 65 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {rider.score}
                </span>
                <p className="text-[10px] text-muted-foreground">score</p>
              </div>
            </label>
          );
        })}
      </div>
    </Drawer>
  );
}
