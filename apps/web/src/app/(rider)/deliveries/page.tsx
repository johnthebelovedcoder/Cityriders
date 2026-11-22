'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Package, MarkerPin01, Phone, Clock, CheckCircle, AlertCircle, ChevronRight } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

const ACTIVE_STATUSES = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ASSIGNED:           { label: 'Assigned',           cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PICKED_UP:          { label: 'Picked Up',           cls: 'bg-indigo-100 text-indigo-700' },
  IN_TRANSIT:         { label: 'In Transit',          cls: 'bg-amber-100 text-amber-700' },
  DELIVERY_ATTEMPTED: { label: 'Attempted',           cls: 'bg-orange-100 text-orange-700' },
  DELIVERED:          { label: 'Delivered',           cls: 'bg-green-100 text-green-700' },
  RETURNED:           { label: 'Returned',            cls: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status.replace(/_/g, ' '), cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

export default function RiderDeliveriesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-deliveries'],
    queryFn: () => api.get('/deliveries/my').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const active  = assignments.filter((a: any) => ACTIVE_STATUSES.includes(a.package?.status ?? a.status));
  const history = assignments.filter((a: any) => !ACTIVE_STATUSES.includes(a.package?.status ?? a.status));
  const shown   = tab === 'active' ? active : history;

  const todayDelivered = history.filter((a: any) => {
    const s = a.package?.status ?? a.status;
    if (s !== 'DELIVERED') return false;
    const updated = new Date(a.updatedAt ?? a.package?.updatedAt);
    return updated.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-5">
      {/* Greeting + stats */}
      <div>
        <h1 className="text-xl font-bold">Hey, {user?.firstName} 👋</h1>
        <p className="text-sm text-muted-foreground">Here are your deliveries for today</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">{active.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{todayDelivered}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Delivered today</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-muted-foreground">{history.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(['active', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              tab === t ? 'bg-white dark:bg-gray-900 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'active' ? `Active (${active.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {/* Delivery cards */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
          </div>
        )}
        {!isLoading && shown.length === 0 && (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            {tab === 'active'
              ? <><Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No active deliveries</p><p className="text-xs text-muted-foreground/60">New assignments will appear here</p></>
              : <><CheckCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No delivery history yet</p></>
            }
          </div>
        )}
        {shown.map((a: any) => {
          const pkg = a.package ?? a;
          const status = pkg.status ?? a.status;
          const isActive = ACTIVE_STATUSES.includes(status);
          return (
            <Link
              key={a.id}
              href={`/deliveries/${pkg.id}`}
              className="block rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-primary">{pkg.trackingNumber}</span>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-1.5 font-medium text-sm">{pkg.recipient?.name}</p>
                  <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <MarkerPin01 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{pkg.destStreet ? `${pkg.destStreet}, ` : ''}{pkg.destCity}</span>
                  </div>
                  {pkg.recipient?.phone && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{pkg.recipient.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                  {isActive && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      ACTION NEEDED
                    </span>
                  )}
                </div>
              </div>
              {pkg.specialInstructions && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{pkg.specialInstructions}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
