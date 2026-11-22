'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, CheckCircle, Clock, AlertCircle, ArrowRight, Plus } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

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

const inp = 'flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function PortalDashboard() {
  const qc = useQueryClient();
  const [showRequest, setShowRequest] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [destCity, setDestCity] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');

  function resetForm() {
    setRecipientName(''); setRecipientPhone(''); setPickupAddress('');
    setDestAddress(''); setDestCity(''); setDescription(''); setWeight('');
  }

  const { data, isLoading } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => api.get('/portal/dashboard').then((r) => r.data),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post('/portal/delivery-requests', {
        recipientName, recipientPhone, pickupAddress, destAddress, destCity,
        description, weight: weight ? parseFloat(weight) : undefined,
      }),
    onSuccess: () => {
      toast.success('Delivery request submitted — a dispatcher will confirm shortly');
      qc.invalidateQueries({ queryKey: ['portal-dashboard'] });
      setShowRequest(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Submission failed'),
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!data) return null;

  const { customer, stats, recent } = data;

  const kpis = [
    { label: 'Total Shipments', value: stats.total,      icon: Package,      colorCls: 'bg-blue-50 text-blue-600'   },
    { label: 'Delivered',       value: stats.delivered,  icon: CheckCircle,  colorCls: 'bg-green-50 text-green-600' },
    { label: 'In Progress',     value: stats.inProgress, icon: Clock,        colorCls: 'bg-amber-50 text-amber-600' },
    { label: 'Failed / Returned', value: stats.failed,   icon: AlertCircle,  colorCls: 'bg-red-50 text-red-600'    },
  ];

  const canSubmit = recipientName && recipientPhone && destCity && !submit.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">{customer.name}</p>
        </div>
        <button
          onClick={() => setShowRequest(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.colorCls}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Recent Shipments</h2>
          <Link href="/portal/packages" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">No shipments yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {['Tracking #', 'Recipient', 'Destination', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((pkg: any) => (
                <tr key={pkg.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{pkg.trackingNumber}</td>
                  <td className="px-4 py-3">{pkg.recipient?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pkg.destCity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[pkg.status] ?? 'bg-muted text-foreground'}`}>
                      {pkg.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(pkg.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showRequest && (
        <Drawer
          title="New Delivery Request"
          onClose={() => setShowRequest(false)}
          width="lg"
          footer={
            <div className="flex gap-3">
              <button onClick={() => setShowRequest(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                disabled={!canSubmit}
                onClick={() => submit.mutate()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submit.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Fill in the delivery details. A dispatcher will review and confirm your request.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">Recipient Name *</label>
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inp} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">Recipient Phone *</label>
                <input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className={inp} placeholder="+234…" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Pickup Address</label>
              <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className={inp} placeholder="Street address where we collect from" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">Delivery Address</label>
                <input value={destAddress} onChange={(e) => setDestAddress(e.target.value)} className={inp} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">City *</label>
                <input value={destCity} onChange={(e) => setDestCity(e.target.value)} className={inp} placeholder="e.g. Lagos" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">Item Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="e.g. Documents" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">Weight (kg)</label>
                <input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={inp} placeholder="0.0" />
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
