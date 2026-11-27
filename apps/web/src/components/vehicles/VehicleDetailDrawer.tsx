'use client';

import { Car01, AlertTriangle } from '@untitled-ui/icons-react';
import { Drawer } from '@/components/ui/Drawer';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

interface Props {
  vehicle: any;
  onClose: () => void;
}

export function VehicleDetailDrawer({ vehicle: v, onClose }: Props) {
  const insExpired = v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date();
  const inspExpired = v.inspectionExpiry && new Date(v.inspectionExpiry) < new Date();

  return (
    <Drawer title="Vehicle Details" onClose={onClose} width="md">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/20 px-5 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Car01 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-mono text-lg font-bold tracking-wide">{v.plateNumber}</p>
            <p className="text-sm text-muted-foreground">{v.year} {v.make} {v.model}</p>
          </div>
          <span className={`ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {v.status?.replace('_', ' ')}
          </span>
        </div>

        {/* Details */}
        <div className="rounded-lg border px-4">
          <Row label="Type" value={v.type} />
          <Row label="Make / Model" value={`${v.make} ${v.model}`} />
          <Row label="Year" value={v.year} />
          <Row label="Odometer" value={v.odometerKm != null ? `${Number(v.odometerKm).toLocaleString()} km` : undefined} />
          <Row
            label="Assigned Rider"
            value={
              v.assignedRider
                ? `${v.assignedRider.user.firstName} ${v.assignedRider.user.lastName}`
                : <span className="text-muted-foreground">Unassigned</span>
            }
          />
        </div>

        {/* Compliance */}
        <div className="rounded-lg border px-4">
          <div className="border-b py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance</p>
          </div>
          <Row
            label="Insurance Expiry"
            value={
              v.insuranceExpiry
                ? <span className={insExpired ? 'font-semibold text-destructive' : ''}>
                    {new Date(v.insuranceExpiry).toLocaleDateString()}
                    {insExpired && ' ⚠ Expired'}
                  </span>
                : undefined
            }
          />
          <Row
            label="Inspection Expiry"
            value={
              v.inspectionExpiry
                ? <span className={inspExpired ? 'font-semibold text-destructive' : ''}>
                    {new Date(v.inspectionExpiry).toLocaleDateString()}
                    {inspExpired && ' ⚠ Expired'}
                  </span>
                : undefined
            }
          />
        </div>

        {/* Notes */}
        {v.notes && (
          <div className="rounded-lg border p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap text-sm">{v.notes}</p>
          </div>
        )}

        {/* Expiry alerts */}
        {(insExpired || inspExpired) && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              {[insExpired && 'Insurance', inspExpired && 'Inspection'].filter(Boolean).join(' and ')} {insExpired && inspExpired ? 'are' : 'is'} expired. Update the vehicle record to renew.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
