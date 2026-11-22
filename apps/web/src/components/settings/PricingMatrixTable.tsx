'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash01, Plus } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

type Zone = { id: string; name: string };
type MatrixEntry = { id: string; fromZoneId: string; toZoneId: string; baseRate: number; perKgRate: number; fromZone: Zone; toZone: Zone };

const inputCls = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectCls = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const EMPTY = { fromZoneId: '', toZoneId: '', baseRate: '', perKgRate: '0' };

export function PricingMatrixTable({ zones }: { zones: Zone[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);

  const { data: matrix = [] } = useQuery<MatrixEntry[]>({
    queryKey: ['pricing-matrix'],
    queryFn: () => api.get('/settings/pricing-matrix').then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (body: typeof form) =>
      api.post('/settings/pricing-matrix', {
        fromZoneId: body.fromZoneId,
        toZoneId: body.toZoneId,
        baseRate: parseFloat(body.baseRate),
        perKgRate: parseFloat(body.perKgRate),
      }),
    onSuccess: () => {
      toast.success('Rate saved');
      qc.invalidateQueries({ queryKey: ['pricing-matrix'] });
      setForm(EMPTY);
      setShowAdd(false);
    },
    onError: () => toast.error('Failed to save rate'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/pricing-matrix/${id}`),
    onSuccess: () => { toast.success('Rate removed'); qc.invalidateQueries({ queryKey: ['pricing-matrix'] }); },
    onError: () => toast.error('Failed to remove'),
  });

  const canSubmit = form.fromZoneId && form.toZoneId && form.fromZoneId !== form.toZoneId && form.baseRate;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Zone-to-Zone Pricing Matrix</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Override flat fee for specific origin â†’ destination zone pairs</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs font-medium hover:bg-muted"
        >
          <Plus className="h-3 w-3" /> Add Rate
        </button>
      </div>

      {showAdd && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">From Zone</label>
              <select value={form.fromZoneId} onChange={(e) => setForm((v) => ({ ...v, fromZoneId: e.target.value }))} className={selectCls}>
                <option value="">Select zone…</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">To Zone</label>
              <select value={form.toZoneId} onChange={(e) => setForm((v) => ({ ...v, toZoneId: e.target.value }))} className={selectCls}>
                <option value="">Select zone…</option>
                {zones.filter((z) => z.id !== form.fromZoneId).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Base Rate (NGN)</label>
              <input type="number" value={form.baseRate} onChange={(e) => setForm((v) => ({ ...v, baseRate: e.target.value }))} placeholder="e.g. 2500" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Per kg Rate (NGN)</label>
              <input type="number" value={form.perKgRate} onChange={(e) => setForm((v) => ({ ...v, perKgRate: e.target.value }))} placeholder="e.g. 100" className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowAdd(false); setForm(EMPTY); }} className="inline-flex h-8 items-center rounded-md border px-3 text-xs hover:bg-muted">Cancel</button>
            <button onClick={() => upsert.mutate(form)} disabled={!canSubmit || upsert.isPending}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Save Rate
            </button>
          </div>
        </div>
      )}

      {matrix.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No zone-to-zone rates set — flat fee applies everywhere</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {['From', 'To', 'Base Rate', 'Per kg', ''].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{e.fromZone.name}</td>
                  <td className="px-3 py-2">{e.toZone.name}</td>
                  <td className="px-3 py-2 font-mono">₦{Number(e.baseRate).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">₦{Number(e.perKgRate).toLocaleString()}/kg</td>
                  <td className="px-3 py-2">
                    <button onClick={() => remove.mutate(e.id)} disabled={remove.isPending}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
                      <Trash01 className="h-3 w-3" />
                    </button>
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

