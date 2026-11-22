'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, MarkerPin01, Phone, Package, File01, AlertCircle, CheckCircle } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { ProofOfDelivery } from '@/components/rider/ProofOfDelivery';

const TRANSITIONS: Record<string, { label: string; nextStatus: string; className: string; requiresPod?: boolean }[]> = {
  ASSIGNED:           [{ label: 'Mark as Picked Up', nextStatus: 'PICKED_UP', className: 'bg-indigo-600 text-white hover:bg-indigo-700' }],
  PICKED_UP:          [{ label: 'Mark as In Transit', nextStatus: 'IN_TRANSIT', className: 'bg-amber-600 text-white hover:bg-amber-700' }],
  IN_TRANSIT: [
    { label: 'Confirm Delivered', nextStatus: 'DELIVERED', className: 'bg-green-600 text-white hover:bg-green-700', requiresPod: true },
    { label: 'Record Failed Attempt', nextStatus: 'DELIVERY_ATTEMPTED', className: 'border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100' },
  ],
  DELIVERY_ATTEMPTED: [
    { label: 'Try Again (In Transit)', nextStatus: 'IN_TRANSIT', className: 'bg-amber-600 text-white hover:bg-amber-700' },
    { label: 'Confirm Delivered', nextStatus: 'DELIVERED', className: 'bg-green-600 text-white hover:bg-green-700', requiresPod: true },
    { label: 'Mark as Returned', nextStatus: 'RETURNED', className: 'border hover:bg-muted text-muted-foreground' },
  ],
};

const FAILURE_REASONS = [
  { value: 'RECIPIENT_NOT_AVAILABLE', label: 'Recipient not available' },
  { value: 'WRONG_ADDRESS', label: 'Wrong address' },
  { value: 'REFUSED_DELIVERY', label: 'Refused delivery' },
  { value: 'ACCESS_ISSUE', label: 'Access issue' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Assigned', PICKED_UP: 'Picked Up', IN_TRANSIT: 'In Transit',
  DELIVERY_ATTEMPTED: 'Attempted', DELIVERED: 'Delivered', RETURNED: 'Returned',
};

export default function RiderDeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [failedReason, setFailedReason] = useState('');
  const [reattemptAt, setReattemptAt] = useState('');
  const [showPod, setShowPod] = useState(false);

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['delivery-detail', id],
    queryFn: () => api.get(`/packages/${id}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, failed, reattempt }: { status: string; failed?: string; reattempt?: string }) =>
      api.post(`/deliveries/${id}/status`, { status, note: note || undefined, failedReason: failed || undefined, reattemptAt: reattempt || undefined }),
    onSuccess: (_, vars) => {
      toast.success(`Status updated to ${(STATUS_LABEL[vars.status] ?? vars.status).toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['delivery-detail', id] });
      qc.invalidateQueries({ queryKey: ['my-deliveries'] });
      setNote('');
      setFailedReason('');
      setReattemptAt('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Update failed'),
  });

  function handleTransition(t: typeof TRANSITIONS[string][number]) {
    if (t.requiresPod) { setShowPod(true); return; }
    statusMutation.mutate({
      status: t.nextStatus,
      failed: t.nextStatus === 'DELIVERY_ATTEMPTED' ? failedReason : undefined,
      reattempt: t.nextStatus === 'DELIVERY_ATTEMPTED' && reattemptAt ? reattemptAt : undefined,
    });
  }

  function handlePodSuccess() {
    setShowPod(false);
    statusMutation.mutate({ status: 'DELIVERED' });
  }

  if (isLoading) return (
    <div className="space-y-3 py-6">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
    </div>
  );
  if (!pkg) return null;

  const transitions = TRANSITIONS[pkg.status] ?? [];
  const isComplete = ['DELIVERED', 'RETURNED', 'CANCELLED'].includes(pkg.status);

  if (showPod) {
    return <ProofOfDelivery packageId={id} onSuccess={handlePodSuccess} onCancel={() => setShowPod(false)} />;
  }

  return (
    <div className="space-y-4">
      <Link href="/deliveries" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to My Deliveries
      </Link>

      {/* Package info card */}
      <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-5 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Tracking Number</p>
              <p className="font-mono text-lg font-bold text-primary">{pkg.trackingNumber}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              pkg.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
              pkg.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {STATUS_LABEL[pkg.status] ?? pkg.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="divide-y px-5">
          {/* Recipient */}
          <div className="py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliver To</p>
            <p className="font-semibold">{pkg.recipient?.name}</p>
            {pkg.recipient?.phone && (
              <a href={`tel:${pkg.recipient.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" />
                {pkg.recipient.phone}
              </a>
            )}
            <div className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MarkerPin01 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{pkg.destStreet ? `${pkg.destStreet}, ` : ''}{pkg.destCity}</span>
            </div>
            {pkg.recipient?.deliveryNotes && (
              <p className="mt-2 text-xs text-muted-foreground italic">Note: {pkg.recipient.deliveryNotes}</p>
            )}
          </div>

          {/* Package details */}
          {(pkg.description || pkg.weight) && (
            <div className="py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package</p>
              {pkg.description && <div className="flex items-start gap-1.5 text-sm"><Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{pkg.description}</span></div>}
              {pkg.weight && <p className="mt-1 text-sm text-muted-foreground">{pkg.weight} kg</p>}
            </div>
          )}

          {/* Special instructions */}
          {pkg.specialInstructions && (
            <div className="py-4">
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Special Instructions</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{pkg.specialInstructions}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status update */}
      {transitions.length > 0 && !isComplete && (
        <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold">Update Status</h2>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Add a note…"
            />
          </div>

          {transitions.some((t) => t.nextStatus === 'DELIVERY_ATTEMPTED') && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Failure reason</label>
                <select
                  value={failedReason}
                  onChange={(e) => setFailedReason(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select reason…</option>
                  {FAILURE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Schedule reattempt (optional)</label>
                <input
                  type="datetime-local"
                  value={reattemptAt}
                  onChange={(e) => setReattemptAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </>
          )}

          <div className="grid gap-2.5">
            {transitions.map((t) => (
              <button
                key={t.nextStatus}
                disabled={statusMutation.isPending}
                onClick={() => handleTransition(t)}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors ${t.className}`}
              >
                {t.requiresPod && <File01 className="h-4 w-4" />}
                {statusMutation.isPending ? '…' : t.label}
              </button>
            ))}
          </div>

          {transitions.some((t) => t.requiresPod) && (
            <p className="text-center text-xs text-muted-foreground">
              Marking as delivered requires proof of delivery (photo or signature)
            </p>
          )}
        </div>
      )}

      {isComplete && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-5 text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <p className="font-semibold text-green-800 dark:text-green-400">Delivery Complete</p>
          <p className="text-sm text-green-700 dark:text-green-500">Status: {STATUS_LABEL[pkg.status] ?? pkg.status}</p>
        </div>
      )}
    </div>
  );
}
