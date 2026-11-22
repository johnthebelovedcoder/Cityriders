'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

interface Props {
  open: boolean;
  onClose: () => void;
  packageId?: string;
  customerId?: string;
}

export default function EscalateModal({ open, onClose, packageId, customerId }: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [requestedAction, setRequestedAction] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => api.post('/customer-service/escalations', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cs-escalations'] });
      qc.invalidateQueries({ queryKey: ['cs-pkg-detail'] });
      setReason(''); setRequestedAction('');
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ packageId, customerId, reason, priority, requestedAction });
  }

  if (!open) return null;
  return (
    <Drawer
      title="Escalate Issue"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={handleSubmit as any}
            disabled={isPending}
            className="flex-1 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
          >
            {isPending ? 'Escalating…' : 'Escalate'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Reason <span className="text-destructive">*</span></label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Describe the issue that needs escalation..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  priority === p
                    ? p === 'URGENT' ? 'border-destructive bg-destructive/10 text-destructive'
                      : p === 'HIGH' ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                      : 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Requested Action <span className="text-destructive">*</span></label>
          <input
            required
            value={requestedAction}
            onChange={(e) => setRequestedAction(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="e.g. Contact rider, Issue refund, Re-dispatch..."
          />
        </div>
      </form>
    </Drawer>
  );
}

