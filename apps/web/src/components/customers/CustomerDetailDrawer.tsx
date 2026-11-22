'use client';

import { useQuery } from '@tanstack/react-query';
import { Users01, Package, Phone, Mail01, MarkerPin01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

interface Props {
  customerId: string;
  onClose: () => void;
}

const STATUS_CLS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
  RESCHEDULED: 'bg-indigo-100 text-indigo-700',
};

function fmt(n: number) { return `₦${n.toLocaleString()}`; }

export function CustomerDetailDrawer({ customerId, onClose }: Props) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.get(`/customers/${customerId}`).then((r) => r.data),
  });

  return (
    <Drawer title="Customer Details" onClose={onClose} width="lg">
      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
      )}
      {customer && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {customer.name?.[0]?.toUpperCase() ?? <Users01 className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{customer.name}</h3>
              <p className="text-xs text-muted-foreground">Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : '—'}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Contact</p>
            {customer.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail01 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2.5 text-sm">
                <MarkerPin01 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span className="text-muted-foreground">{customer.address}</span>
              </div>
            )}
          </div>

          {/* Quick stats */}
          {customer.stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-blue-600" />
                <p className="text-xl font-bold">{customer.stats.totalPackages ?? 0}</p>
                <p className="text-xs text-muted-foreground">Packages</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-green-600" />
                <p className="text-xl font-bold text-green-600">{customer.stats.delivered ?? 0}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-amber-600" />
                <p className="text-xl font-bold text-amber-600">{customer.stats.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          )}

          {/* Total spend */}
          {customer.stats?.totalSpend !== undefined && (
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Total spend (all time)</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{fmt(customer.stats.totalSpend)}</p>
            </div>
          )}

          {/* Recent packages */}
          {customer.recentPackages?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Recent Packages</p>
              <div className="space-y-2">
                {customer.recentPackages.slice(0, 6).map((pkg: any) => (
                  <div key={pkg.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
                    <div>
                      <p className="text-sm font-mono font-medium">{pkg.trackingNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.recipient?.name ?? '—'} · {new Date(pkg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[pkg.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {pkg.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
