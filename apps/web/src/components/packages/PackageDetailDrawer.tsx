'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MarkerPin01, ArrowRight, Package, Scale01, CurrencyDollar, Clock, CheckCircle, AlertCircle, XClose, RefreshCcw01, Printer } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { StatusUpdateModal } from '@/components/packages/StatusUpdateModal';
import { DeliveryResolutionModal } from '@/components/packages/DeliveryResolutionModal';
import { useAuth } from '@/context/auth-context';
import { SelectField } from '@/components/ui/SelectField';

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

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  DELIVERED: CheckCircle,
  DELIVERY_ATTEMPTED: AlertCircle,
};

function StatusTimeline({ history }: { history: any[] }) {
  if (!history?.length) return <p className="text-sm text-muted-foreground">No history</p>;
  return (
    <ol className="relative space-y-0">
      {history.map((ev: any, i: number) => {
        const isLast = i === history.length - 1;
        const Icon = STATUS_ICON[ev.status] ?? Package;
        return (
          <li key={ev.id ?? i} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && <span className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />}
            <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${i === 0 ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
              {i === 0 ? (
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </span>
            <div className="pt-0.5">
              <p className={`text-sm font-medium ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {ev.status?.replace(/_/g, ' ')}
              </p>
              {ev.note && <p className="text-xs text-muted-foreground">{ev.note}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {new Date(ev.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type Props = { packageId: string; onClose: () => void };

export function PackageDetailDrawer({ packageId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [resolutionDismissed, setResolutionDismissed] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState('OUT_FOR_DELIVERY');
  const [correctionReason, setCorrectionReason] = useState('');

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package', packageId],
    queryFn: () => api.get(`/packages/${packageId}`).then((r) => r.data),
  });

  const { data: activeRiders } = useQuery({
    queryKey: ['riders-active'],
    queryFn: () => api.get('/riders/active').then((r) => r.data),
    enabled: showAssignModal,
  });

  const assignMutation = useMutation({
    mutationFn: ({ riderId }: { riderId: string }) =>
      api.post(`/packages/${packageId}/assign`, { riderId }),
    onSuccess: () => {
      toast.success('Rider assigned');
      qc.invalidateQueries({ queryKey: ['package', packageId] });
      qc.invalidateQueries({ queryKey: ['packages'] });
      setShowAssignModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Assignment failed'),
  });

  const correctOutcome = useMutation({
    mutationFn: () => api.post(`/packages/${packageId}/delivery-corrections`, { status: correctionStatus, reason: correctionReason }),
    onSuccess: () => {
      toast.success('Delivery outcome correction recorded');
      qc.invalidateQueries({ queryKey: ['package', packageId] });
      qc.invalidateQueries({ queryKey: ['packages'] });
      setShowCorrection(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Could not correct delivery outcome'),
  });

  useEffect(() => {
    if (pkg?.status === 'DELIVERY_ATTEMPTED') setShowResolution(true);
  }, [pkg?.status]);

  const status = pkg?.status as string | undefined;
  const activeAssignment = pkg?.assignments?.find((a: any) => a.isActive);
  const terminal = status && ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(status);

  return (
    <>
      <Drawer
        title={
          pkg ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold">{pkg.trackingNumber}</span>
              {status && (
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          ) : 'Package Details'
        }
        width="2xl"
        onClose={onClose}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
        )}

        {pkg && (
          <div className="space-y-5">
            {/* Print waybill link */}
            <a
              href={`/packages/${packageId}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              <Printer className="h-4 w-4 shrink-0" />
              Print Waybill / Save PDF
            </a>

            {status === 'DELIVERED' && ['ADMINISTRATOR', 'MANAGER'].includes(user?.role ?? '') && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                {!showCorrection ? (
                  <button type="button" onClick={() => setShowCorrection(true)} className="text-sm font-semibold text-amber-900">Correct an erroneous delivery outcome</button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-900">Authorized correction</p>
                    <SelectField value={correctionStatus} onChange={setCorrectionStatus} aria-label="Corrected delivery status" options={['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'FAILED', 'RESCHEDULED', 'RETURNED'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))} />
                    <textarea required value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} rows={2} placeholder="Explain why the completed outcome is being corrected" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCorrection(false)} className="rounded-md border px-3 py-1.5 text-xs">Cancel</button><button type="button" disabled={!correctionReason.trim() || correctOutcome.isPending} onClick={() => correctOutcome.mutate()} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save correction</button></div>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Attempted banner */}
            {status === 'DELIVERY_ATTEMPTED' && resolutionDismissed && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-orange-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  This package needs a resolution - it was not delivered.
                </div>
                <button
                  onClick={() => { setResolutionDismissed(false); setShowResolution(true); }}
                  className="shrink-0 rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700"
                >
                  Resolve now
                </button>
              </div>
            )}

            {/* Route card */}
            <div className="rounded-md border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Route</h3>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MarkerPin01 className="h-3 w-3 text-green-600" /> Origin
                  </div>
                  <p className="font-medium text-sm">{pkg.sender?.name ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">{pkg.originStreet}</p>
                  <p className="text-xs text-muted-foreground">{pkg.originCity}</p>
                  <p className="text-xs text-muted-foreground">{pkg.sender?.phone}</p>
                </div>
                <div className="flex shrink-0 items-center pt-5">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <div className="flex-1 space-y-0.5 text-right">
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    Destination <MarkerPin01 className="h-3 w-3 text-red-500" />
                  </div>
                  <p className="font-medium text-sm">{pkg.recipient?.name ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">{pkg.destStreet}</p>
                  <p className="text-xs text-muted-foreground">{pkg.destCity}</p>
                  <p className="text-xs text-muted-foreground">{pkg.recipient?.phone}</p>
                </div>
              </div>
              {pkg.recipient?.deliveryNotes && (
                <p className="mt-3 border-t pt-3 text-xs italic text-muted-foreground">
                  Note: {pkg.recipient.deliveryNotes}
                </p>
              )}
            </div>

            {/* Package details */}
            <div className="rounded-md border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package Details</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm font-medium">{pkg.description ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Scale01 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="text-sm font-medium">{pkg.weight ? `${pkg.weight} kg` : '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <CurrencyDollar className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Fee</p>
                    <p className="text-sm font-medium tabular-nums">{pkg.deliveryFee ? `₦${Number(pkg.deliveryFee).toLocaleString()}` : '-'}</p>
                  </div>
                </div>
              </div>
              {pkg.specialInstructions && (
                <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <strong>Special Instructions:</strong> {pkg.specialInstructions}
                </div>
              )}
            </div>

            {/* Rider + actions */}
            <div className="rounded-md border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned Rider</h3>
              {activeAssignment ? (
                <div className="space-y-1 mb-3">
                  <p className="font-medium text-sm">{activeAssignment.rider.user.firstName} {activeAssignment.rider.user.lastName}</p>
                  <p className="text-xs text-muted-foreground">{activeAssignment.rider.user.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    <Clock className="inline h-2.5 w-2.5 mr-1" />
                    Assigned {new Date(activeAssignment.assignedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground">No rider assigned</p>
              )}
              {!terminal && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex-1 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {activeAssignment ? 'Reassign Rider' : 'Assign Rider'}
                  </button>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"
                  >
                    <RefreshCcw01 className="h-3 w-3" /> Update Status
                  </button>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-md border bg-card p-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status History</h3>
              <StatusTimeline history={pkg.statusHistory} />
            </div>
          </div>
        )}
      </Drawer>

      {showStatusModal && status && (
        <StatusUpdateModal packageId={packageId} currentStatus={status} onClose={() => setShowStatusModal(false)} />
      )}

      {showResolution && pkg && (
        <DeliveryResolutionModal
          packageId={packageId}
          trackingNumber={pkg.trackingNumber}
          onClose={() => { setShowResolution(false); setResolutionDismissed(true); }}
        />
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Assign Rider</h2>
              <button onClick={() => setShowAssignModal(false)} className="rounded-md p-1 hover:bg-muted text-muted-foreground">
                <XClose className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {!activeRiders && <p className="text-sm text-muted-foreground">Loading riders...</p>}
              {activeRiders?.map((rider: any) => (
                <label key={rider.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="rider"
                    value={rider.id}
                    checked={selectedRiderId === rider.id}
                    onChange={() => setSelectedRiderId(rider.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{rider.user.firstName} {rider.user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{rider.vehicleType ?? 'Rider'} - {rider.user.phone}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={!selectedRiderId || assignMutation.isPending}
                onClick={() => assignMutation.mutate({ riderId: selectedRiderId })}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
