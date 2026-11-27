'use client';

import { Eye, Paperclip } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

const TYPE_BADGE: Record<string, string> = {
  DeliveryFee: 'bg-blue-100 text-blue-700',
  Credit: 'bg-purple-100 text-purple-700',
  RiderRemittance: 'bg-amber-100 text-amber-700',
  Refund: 'bg-red-100 text-red-700',
};
const STATUS_BADGE: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Failed: 'bg-red-100 text-red-700',
  Refunded: 'bg-gray-100 text-gray-500',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right font-medium">{value ?? '—'}</span>
    </div>
  );
}

interface Props {
  payment: any;
  onClose: () => void;
}

export function PaymentDetailDrawer({ payment: p, onClose }: Props) {
  const typeBadge = TYPE_BADGE[p.type] ?? 'bg-gray-100 text-gray-700';
  const statusBadge = STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-700';
  const entity = p.customer?.name ?? (p.rider?.user ? `${p.rider.user.firstName} ${p.rider.user.lastName}` : null);

  async function viewReceipt() {
    try {
      const { data } = await api.get(`/payments/${p.id}/receipt`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      window.alert('Could not open payment receipt');
    }
  }

  return (
    <Drawer title="Payment Details" onClose={onClose} width="md">
      <div className="space-y-5">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeBadge}`}>
            {p.type?.replace(/([a-z])([A-Z])/g, '$1 $2')}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
            {p.status}
          </span>
        </div>

        {/* Amount hero */}
        <div className="rounded-xl bg-muted/40 px-5 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">₦{Number(p.amount).toLocaleString()}</p>
        </div>

        {/* Details */}
        <div className="rounded-lg border px-4">
          <Row label="Method" value={p.method} />
          <Row label="Reference" value={p.reference ? <span className="font-mono text-xs">{p.reference}</span> : undefined} />
          {entity && <Row label="Entity" value={entity} />}
          {p.package?.trackingNumber && (
            <Row
              label="Package"
              value={
                <a href={`/packages?detail=${p.package.id ?? ''}`} className="font-mono text-xs text-primary hover:underline">
                  {p.package.trackingNumber}
                </a>
              }
            />
          )}
          <Row
            label="Date"
            value={new Date(p.paymentDate ?? p.createdAt).toLocaleString()}
          />
          {p.notes && <Row label="Notes" value={<span className="text-left">{p.notes}</span>} />}
        </div>

        {/* Receipt */}
        {p.hasReceipt && (
          <button
            type="button"
            onClick={viewReceipt}
            className="flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            View attached proof of payment
            <Eye className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </Drawer>
  );
}
