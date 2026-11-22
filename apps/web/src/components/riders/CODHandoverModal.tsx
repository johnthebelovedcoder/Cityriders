'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CurrencyDollar, AlertCircle } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

type Props = { riderId: string; riderName: string; onClose: () => void };

const inp = 'flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export function CODHandoverModal({ riderId, riderName, onClose }: Props) {
  const qc = useQueryClient();
  const [actualAmount, setActualAmount] = useState('');

  const { data: pending } = useQuery({
    queryKey: ['rider-cod-pending', riderId],
    queryFn: () => api.get(`/riders/${riderId}/cod-pending`).then((r) => r.data),
  });

  const expected = pending?.expectedAmount ?? 0;
  const actual = parseFloat(actualAmount) || 0;
  const variance = actual - expected;
  const hasVariance = actualAmount !== '' && Math.abs(variance) > 500;

  const submit = useMutation({
    mutationFn: () => api.post(`/riders/${riderId}/handover`, { actualAmount: actual }),
    onSuccess: (res) => {
      const { isFlagged, variance: v } = res.data;
      if (isFlagged) {
        toast.warning(`Handover recorded - variance of ₦${Math.abs(v).toLocaleString()} flagged for manager review`);
      } else {
        toast.success('Cash handover recorded');
      }
      qc.invalidateQueries({ queryKey: ['rider-cod-pending', riderId] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to record handover'),
  });

  return (
    <Drawer
      title="Cash Handover"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            onClick={() => submit.mutate()}
            disabled={!actualAmount || submit.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submit.isPending ? 'Saving...' : 'Record Handover'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <CurrencyDollar className="h-3.5 w-3.5 text-green-600" />
          </span>
          {riderName} - end-of-shift settlement
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected COD</p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {pending ? `₦${expected.toLocaleString()}` : '-'}
          </p>
          {pending?.packageCount != null && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pending.packageCount} delivered package{pending.packageCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Actual cash received *</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            placeholder="0.00"
            className={inp}
          />
        </div>

        {hasVariance && (
          <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${variance < 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Variance: {variance > 0 ? '+' : ''}₦{Math.abs(variance).toLocaleString()}</p>
              <p className="text-xs opacity-80">Will be flagged for manager review</p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}