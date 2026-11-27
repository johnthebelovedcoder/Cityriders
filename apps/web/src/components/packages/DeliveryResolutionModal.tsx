'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDate, ArrowLeft, MessageAlertCircle } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

type Option = 'reschedule' | 'return' | 'escalate' | null;

type Props = {
  packageId: string;
  trackingNumber: string;
  onClose: () => void;
};

const inp = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function DeliveryResolutionModal({ packageId, trackingNumber, onClose }: Props) {
  const qc = useQueryClient();
  const [chosen, setChosen] = useState<Option>(null);
  const [reattemptAt, setReattemptAt] = useState('');
  const [note, setNote] = useState('');

  const resolve = useMutation({
    mutationFn: (body: { status: string; note?: string; reattemptAt?: string }) =>
      api.patch(`/packages/${packageId}/status`, body),
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        RESCHEDULED: 'Rescheduled for re-delivery',
        RETURNED: 'Marked for return to hub',
        ON_HOLD: 'Escalated to customer service',
      };
      toast.success(labels[vars.status] ?? 'Status updated');
      qc.invalidateQueries({ queryKey: ['package', packageId] });
      qc.invalidateQueries({ queryKey: ['packages'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Update failed'),
  });

  function submit() {
    if (!chosen) return;
    if (chosen === 'reschedule') {
      resolve.mutate({ status: 'RESCHEDULED', reattemptAt: reattemptAt || undefined, note: note || undefined });
    } else if (chosen === 'return') {
      resolve.mutate({ status: 'RETURNED', note: note || undefined });
    } else {
      resolve.mutate({ status: 'ON_HOLD', note: note || undefined });
    }
  }

  const canSubmit = chosen && (chosen !== 'reschedule' || reattemptAt);

  return (
    <Drawer
      title="Delivery Not Completed"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Decide later</button>
          <button
            onClick={submit}
            disabled={!canSubmit || resolve.isPending}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {resolve.isPending ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      }
    >
      <div className="space-y-2.5">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{trackingNumber}</span>
          {' - choose what happens next'}
        </p>
          {[
            {
              id: 'reschedule' as const,
              icon: CalendarDate,
              iconCls: 'text-blue-600',
              bgCls: 'bg-blue-50',
              label: 'Reschedule delivery',
              desc: 'Re-attempt on another date',
            },
            {
              id: 'return' as const,
              icon: ArrowLeft,
              iconCls: 'text-red-600',
              bgCls: 'bg-red-50',
              label: 'Return to hub',
              desc: 'Send the package back to the warehouse',
            },
            {
              id: 'escalate' as const,
              icon: MessageAlertCircle,
              iconCls: 'text-amber-600',
              bgCls: 'bg-amber-50',
              label: 'Escalate to customer service',
              desc: 'Flag for follow-up with the recipient',
            },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = chosen === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChosen(opt.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/60'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${opt.bgCls}`}>
                  <Icon className={`h-4 w-4 ${opt.iconCls}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            );
          })}

          {/* Conditional extra fields */}
          {chosen === 'reschedule' && (
            <div className="space-y-1 pt-1">
              <label className="text-sm font-medium">Re-attempt date and time <span className="text-destructive">*</span></label>
              <DateTimePicker minDate={new Date().toISOString()} value={reattemptAt} onChange={setReattemptAt} aria-label="Re-attempt date and time" />
            </div>
          )}

          <div className="space-y-1 pt-1">
            <label className="text-sm font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={
                chosen === 'return' ? 'Reason for return' :
                chosen === 'escalate' ? 'Describe what happened for customer service' :
                'Additional context'
              }
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>
    </Drawer>
  );
}
