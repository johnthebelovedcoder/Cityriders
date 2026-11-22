'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit01, Trash01, XClose, Check } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { PricingMatrixTable } from './PricingMatrixTable';

type Zone = { id: string; name: string; basePrice: number };
type EditingZone = { id: string; name: string; basePrice: string };

export function PricingSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) });
  const [flatFee, setFlatFee] = useState('');
  const [surcharge, setSurcharge] = useState('');
  const [editingZone, setEditingZone] = useState<EditingZone | null>(null);

  useEffect(() => {
    if (settings) {
      setFlatFee(String(settings.flatDeliveryFee));
      setSurcharge(String(settings.weightSurcharge));
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.patch('/settings', { flatDeliveryFee: parseFloat(flatFee), weightSurcharge: parseFloat(surcharge) }),
    onSuccess: () => { toast.success('Pricing saved'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const updateZone = useMutation({
    mutationFn: (z: EditingZone) => api.patch(`/settings/zones/${z.id}`, { name: z.name, basePrice: parseFloat(z.basePrice) }),
    onSuccess: () => { toast.success('Zone updated'); qc.invalidateQueries({ queryKey: ['settings'] }); setEditingZone(null); },
    onError: () => toast.error('Failed to update zone'),
  });

  const deleteZone = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/zones/${id}`),
    onSuccess: () => { toast.success('Zone removed'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to remove zone'),
  });

  if (!settings) return <div className="text-sm text-muted-foreground">Loading...</div>;

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pricing</h2>
        <p className="text-sm text-muted-foreground">Set delivery fee rules, weight surcharges and per-zone pricing</p>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-medium">Base Delivery Fee</h3>
          <div className="space-y-1">
            <label className="text-sm font-medium">Flat fee (NGN)</label>
            <input type="number" value={flatFee} onChange={(e) => setFlatFee(e.target.value)} className={inputCls} />
            <p className="text-xs text-muted-foreground">Applied to all deliveries unless overridden by zone pricing</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-medium">Weight Surcharge</h3>
          <div className="space-y-1">
            <label className="text-sm font-medium">Extra fee per kg (NGN)</label>
            <input type="number" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} className={inputCls} />
            <p className="text-xs text-muted-foreground">Added on top of base fee for each kilogram above 1kg</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-medium">Zone Pricing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Click the edit icon on any zone to update its name or price</p>
            </div>
          </div>
          <div className="space-y-2">
            {settings.zones?.map((z: Zone) => (
              <div key={z.id} className="rounded-md border bg-background px-3 py-2">
                {editingZone?.id === z.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editingZone.name}
                      onChange={(e) => setEditingZone((v) => v ? { ...v, name: e.target.value } : v)}
                      className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Zone name"
                    />
                    <input
                      type="number"
                      value={editingZone.basePrice}
                      onChange={(e) => setEditingZone((v) => v ? { ...v, basePrice: e.target.value } : v)}
                      className="flex h-8 w-28 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Price (NGN)"
                    />
                    <button
                      onClick={() => updateZone.mutate(editingZone)}
                      disabled={updateZone.isPending || !editingZone.name || !editingZone.basePrice}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setEditingZone(null)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                    >
                      <XClose className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{z.name}</p>
                      <p className="text-xs text-muted-foreground">₦{z.basePrice.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => setEditingZone({ id: z.id, name: z.name, basePrice: String(z.basePrice) })}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Edit01 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteZone.mutate(z.id)}
                      disabled={deleteZone.isPending}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash01 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!settings.zones?.length && (
              <p className="text-sm text-muted-foreground text-center py-3">No zones yet — add them in the Zones tab</p>
            )}
          </div>
        </div>
      </div>

      <PricingMatrixTable zones={settings.zones ?? []} />

      <button onClick={() => save.mutate()} disabled={save.isPending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {save.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

