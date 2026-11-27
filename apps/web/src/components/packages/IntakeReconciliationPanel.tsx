'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { SelectField } from '@/components/ui/SelectField';

export function IntakeReconciliationPanel() {
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [receivedCounts, setReceivedCounts] = useState<Record<string, string>>({});
  const [pickupIds, setPickupIds] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data: ordersRaw, isLoading } = useQuery({
    queryKey: ['package-orders'],
    queryFn: () => api.get('/packages/orders').then((response) => response.data as any[]),
  });
  const orders: any[] = ordersRaw ?? [];
  const reconcile = useMutation({
    mutationFn: ({ id, expectedPackageCount, receivedPackageCount, discrepancyNote }: { id: string; expectedPackageCount: number; receivedPackageCount: number; discrepancyNote?: string }) =>
      api.patch(`/packages/orders/${id}/intake-reconciliation`, { expectedPackageCount, receivedPackageCount, discrepancyNote }),
    onSuccess: () => {
      toast.success('Order intake reconciled');
      queryClient.invalidateQueries({ queryKey: ['package-orders'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Could not reconcile order intake'),
  });
  const collect = useMutation({
    mutationFn: ({ id, pickupLocationId }: { id: string; pickupLocationId?: string }) => api.post(`/packages/orders/${id}/collection`, { pickupLocationId }),
    onSuccess: () => { toast.success('Collection recorded'); queryClient.invalidateQueries({ queryKey: ['package-orders'] }); },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Could not record collection'),
  });

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">Order intake reconciliation</h2>
        <p className="text-sm text-muted-foreground">Compare packages received against each customer order before dispatch.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading customer orders…</p> : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Orders appear here when a customer order reference is entered during package registration.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => {
            const expected = counts[order.id] ?? (order.expectedPackageCount == null ? '' : String(order.expectedPackageCount));
            const reconciled = order.status === 'RECONCILED';
            return (
              <div key={order.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_130px_130px_130px_minmax(180px,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{order.customerReference}</p>
                  <p className="truncate text-xs text-muted-foreground">{order.customer.name} · {order.packages.length} linked packages · {order.officeReceivedAt ? `office received ${new Date(order.officeReceivedAt).toLocaleString()}` : 'office receipt not reconciled'}</p>
                </div>
                <div className="flex gap-1">
                  <SelectField className="min-w-36" aria-label={`Pickup location for ${order.customerReference}`} value={pickupIds[order.id] ?? order.pickupLocationId ?? ''} onChange={(value) => setPickupIds((current) => ({ ...current, [order.id]: value }))} placeholder="Pickup location" options={order.pickupLocations.map((location: any) => ({ value: location.id, label: location.label }))} />
                  <button type="button" disabled={collect.isPending || !order.collectedAt && !pickupIds[order.id] && order.pickupLocations.length > 0} onClick={() => collect.mutate({ id: order.id, pickupLocationId: pickupIds[order.id] || undefined })} className="h-9 whitespace-nowrap rounded-md border px-2 text-xs">{order.collectedAt ? 'Collected' : 'Mark collected'}</button>
                </div>
                <input aria-label={`Received packages for ${order.customerReference}`} type="number" min="0" step="1" value={receivedCounts[order.id] ?? String(order.receivedPackageCount)} onChange={(event) => setReceivedCounts((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Received" className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                <input aria-label={`Expected package count for ${order.customerReference}`} type="number" min="0" step="1" value={expected} onChange={(event) => setCounts((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Expected" className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                <input aria-label={`Discrepancy note for ${order.customerReference}`} value={notes[order.id] ?? order.discrepancyNote ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Note required if counts differ" className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                <div className="flex items-center gap-2">
                  <span className={`whitespace-nowrap text-xs font-medium ${reconciled ? 'text-green-700' : 'text-amber-700'}`}>{reconciled ? 'Reconciled' : 'Receiving'}</span>
                  <button type="button" disabled={reconcile.isPending || expected === '' || (receivedCounts[order.id] ?? String(order.receivedPackageCount)) === ''} onClick={() => reconcile.mutate({ id: order.id, expectedPackageCount: Number(expected), receivedPackageCount: Number(receivedCounts[order.id] ?? order.receivedPackageCount), discrepancyNote: notes[order.id] ?? order.discrepancyNote ?? undefined })} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">Save</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
