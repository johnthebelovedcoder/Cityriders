'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { SelectField } from '@/components/ui/SelectField';

const STATUS_FLOW = [
  { value: 'PENDING',           label: 'Pending' },
  { value: 'COLLECTED',         label: 'Collected' },
  { value: 'RECEIVED_AT_OFFICE', label: 'Received at Office' },
  { value: 'SORTED',            label: 'Sorted' },
  { value: 'DISPATCHED',        label: 'Dispatched' },
  { value: 'OUT_FOR_DELIVERY',  label: 'Out for Delivery' },
  { value: 'DELIVERED',         label: 'Delivered' },
  { value: 'FAILED',            label: 'Failed' },
  { value: 'RESCHEDULED',       label: 'Rescheduled' },
  { value: 'ON_HOLD',           label: 'On Hold' },
  { value: 'RETURNED',          label: 'Returned' },
  { value: 'CANCELLED',         label: 'Cancelled' },
];

const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type Props = { packageId: string; currentStatus: string; onClose: () => void };

export function StatusUpdateModal({ packageId, currentStatus, onClose }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [reasonCodeId, setReasonCodeId] = useState('');
  const [reattemptAt, setReattemptAt] = useState('');

  const { data: reasonCodes = [] } = useQuery<{ id: string; label: string }[]>({
    queryKey: ['failure-reason-codes'],
    queryFn: () => api.get('/settings/failure-reason-codes').then((r) => r.data),
    staleTime: Infinity,
  });

  const update = useMutation({
    mutationFn: () => api.patch(`/packages/${packageId}/status`, {
      status,
      note: note || undefined,
      failureReasonCodeId: status === 'FAILED' ? reasonCodeId || undefined : undefined,
      reattemptAt: status === 'RESCHEDULED' ? reattemptAt || undefined : undefined,
    }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['package', packageId] });
      qc.invalidateQueries({ queryKey: ['packages'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Update failed'),
  });

  const canSubmit = status !== currentStatus && (status !== 'FAILED' || reasonCodeId);

  return (
    <Drawer
      title="Update Status"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => update.mutate()} disabled={!canSubmit || update.isPending}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">New Status</label>
          <SelectField value={status} onChange={(value) => { setStatus(value); setReasonCodeId(''); setReattemptAt(''); }} options={STATUS_FLOW.map((item) => ({ value: item.value, label: item.label }))} aria-label="New status" />
        </div>

        {status === 'FAILED' && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Failure Reason <span className="text-destructive">*</span></label>
            <SelectField value={reasonCodeId} onChange={setReasonCodeId} placeholder="Select reason…" options={reasonCodes.map((reason) => ({ value: reason.id, label: reason.label }))} aria-label="Failure reason" />
          </div>
        )}

        {status === 'RESCHEDULED' && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Re-attempt date and time</label>
            <DateTimePicker minDate={new Date().toISOString()} value={reattemptAt} onChange={setReattemptAt} aria-label="Re-attempt date and time" />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Note (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder="Internal note about this status change…" />
        </div>
      </div>
    </Drawer>
  );
}

