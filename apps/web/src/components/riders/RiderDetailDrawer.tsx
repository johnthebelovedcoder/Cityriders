'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Truck01, Phone, Mail01, Hash01, SwitchHorizontal01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { RiderCodSection } from '@/components/riders/RiderCodSection';
import { RiderExpenseSummary } from '@/components/riders/RiderExpenseSummary';

interface Props {
  riderId: string;
  onClose: () => void;
}

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

export function RiderDetailDrawer({ riderId, onClose }: Props) {
  const qc = useQueryClient();

  const { data: rider, isLoading } = useQuery({
    queryKey: ['rider', riderId],
    queryFn: () => api.get(`/riders/${riderId}`).then((r) => r.data),
  });

  const { data: deliveries = [] } = useQuery<any[]>({
    queryKey: ['rider-deliveries', riderId],
    queryFn: () => api.get(`/riders/${riderId}/deliveries`).then((r) => r.data),
    enabled: !!rider,
  });

  const toggleStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'INACTIVE') =>
      api.patch(`/riders/${riderId}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['rider', riderId] });
      qc.invalidateQueries({ queryKey: ['riders'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Update failed'),
  });

  const isActive = rider?.status === 'ACTIVE';
  const totalDeliveries = deliveries.length;
  const completed = deliveries.filter((d: any) => d.package?.status === 'DELIVERED').length;
  const successRate = totalDeliveries > 0 ? Math.round((completed / totalDeliveries) * 100) : 0;

  return (
    <Drawer
      title={rider ? `${rider.user?.firstName} ${rider.user?.lastName}` : 'Rider Details'}
      onClose={onClose}
      width="2xl"
    >
      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
      )}

      {rider && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-lg border bg-card p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {rider.user?.firstName?.[0]}{rider.user?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{rider.user?.firstName} {rider.user?.lastName}</h3>
                  {rider.riderId && <p className="text-xs text-muted-foreground font-mono">ID: {rider.riderId}</p>}
                </div>
              </div>
              <button
                onClick={() => toggleStatus.mutate(isActive ? 'INACTIVE' : 'ACTIVE')}
                disabled={toggleStatus.isPending}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <SwitchHorizontal01 className="h-4 w-4" />
                {isActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {rider.user?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{rider.user.phone}</span>
                </div>
              )}
              {rider.user?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail01 className="h-4 w-4 shrink-0" />
                  <span>{rider.user.email}</span>
                </div>
              )}
            </div>

            <hr />

            <div>
              <h4 className="mb-3 font-semibold text-sm">Vehicle</h4>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {rider.vehicleType && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Truck01 className="h-4 w-4 shrink-0" />
                    <span className="capitalize">{rider.vehicleType}</span>
                  </div>
                )}
                {rider.vehiclePlate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash01 className="h-4 w-4 shrink-0" />
                    <span>{rider.vehiclePlate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance + Member since */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h4 className="font-semibold text-sm">Performance</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Total Assignments</p>
                <p className="text-2xl font-bold mt-0.5">{totalDeliveries}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Delivered</p>
                <p className="text-2xl font-bold mt-0.5">{completed}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Success Rate</p>
                <p className={`text-2xl font-bold mt-0.5 ${successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {successRate}%
                </p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${successRate >= 80 ? 'bg-green-500' : successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${successRate}%` }}
              />
            </div>
            {rider.createdAt && (
              <p className="text-xs text-muted-foreground">
                Member since {new Date(rider.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Expense Summary */}
          <RiderExpenseSummary riderId={riderId} />

          {/* COD Remittances */}
          <RiderCodSection riderId={riderId} />

          {/* Delivery History */}
          {deliveries.length > 0 && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="border-b px-5 py-4">
                <h4 className="font-semibold">Delivery History</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Last {deliveries.length} assignments</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                      {['Tracking #', 'Recipient', 'Destination', 'Status', 'Assigned'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveries.map((d: any) => (
                      <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{d.package?.trackingNumber}</td>
                        <td className="px-4 py-3">{d.package?.recipient?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.package?.destCity ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[d.package?.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {d.package?.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {d.assignedAt ? new Date(d.assignedAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
