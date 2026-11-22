'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash01, Users01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

export function ZonesSettings() {
  const qc = useQueryClient();
  const [newZone, setNewZone] = useState({ name: '', basePrice: '' });

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) });
  const { data: riders } = useQuery({ queryKey: ['riders-all'], queryFn: () => api.get('/riders').then((r) => r.data) });

  const addZone = useMutation({
    mutationFn: () => api.post('/settings/zones', { name: newZone.name, basePrice: parseFloat(newZone.basePrice) }),
    onSuccess: () => { toast.success('Zone added'); qc.invalidateQueries({ queryKey: ['settings'] }); setNewZone({ name: '', basePrice: '' }); },
    onError: () => toast.error('Failed to add zone'),
  });

  const deleteZone = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/zones/${id}`),
    onSuccess: () => { toast.success('Zone removed'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to remove zone'),
  });

  const assignZone = useMutation({
    mutationFn: ({ riderId, zoneId }: { riderId: string; zoneId: string | null }) =>
      api.patch(`/riders/${riderId}/zone`, { zoneId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['riders-all'] }); },
    onError: () => toast.error('Failed to update zone assignment'),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  const zones: any[] = settings?.zones ?? [];
  const allRiders: any[] = riders ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Delivery Zones</h2>
        <p className="text-sm text-muted-foreground">Define zones and their base delivery prices</p>
      </div>

      <div className="max-w-lg space-y-3">
        {zones.map((z: any) => (
          <div key={z.id} className="rounded-lg border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{z.name}</p>
                <p className="text-xs text-muted-foreground">Base price: ₦{z.basePrice.toLocaleString()}</p>
              </div>
              <button onClick={() => deleteZone.mutate(z.id)} disabled={deleteZone.isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
                <Trash01 className="h-3.5 w-3.5" />
              </button>
            </div>
            {z.riders?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
                {z.riders.map((r: any) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {r.user.firstName} {r.user.lastName}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">Add Zone</p>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Zone name" value={newZone.name} onChange={(e) => setNewZone((z) => ({ ...z, name: e.target.value }))}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <input placeholder="Base price (NGN)" type="number" value={newZone.basePrice} onChange={(e) => setNewZone((z) => ({ ...z, basePrice: e.target.value }))}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <button disabled={!newZone.name || !newZone.basePrice || addZone.isPending} onClick={() => addZone.mutate()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            <Plus className="h-3.5 w-3.5" /> Add Zone
          </button>
        </div>
      </div>

      {allRiders.length > 0 && zones.length > 0 && (
        <div className="max-w-lg">
          <div className="mb-3 flex items-center gap-2">
            <Users01 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Rider Zone Assignments</h3>
          </div>
          <div className="space-y-2">
            {allRiders.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.user.firstName} {r.user.lastName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.vehicleType ?? 'Rider'}</p>
                </div>
                <select
                  value={r.zoneId ?? ''}
                  onChange={(e) => assignZone.mutate({ riderId: r.id, zoneId: e.target.value || null })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">No zone</option>
                  {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
