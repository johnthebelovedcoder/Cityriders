'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

const CHANNELS = ['PHONE', 'EMAIL', 'WHATSAPP', 'IN_PERSON', 'CHAT', 'OTHER'];

interface Props {
  open: boolean;
  onClose: () => void;
  packageId?: string;
  customerId: string;
}

export default function LogInteractionDrawer({ open, onClose, packageId, customerId }: Props) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState('PHONE');
  const [summary, setSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [outcome, setOutcome] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => api.post('/customer-service/interactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cs-interactions'] });
      qc.invalidateQueries({ queryKey: ['cs-pkg-detail'] });
      setSummary(''); setActionTaken(''); setOutcome('');
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ packageId, customerId, channel, summary, actionTaken, outcome });
  }

  if (!open) return null;
  return (
    <Drawer
      title="Log Interaction"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            type="submit"
            form="log-interaction-form"
            disabled={isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Log Interaction'}
          </button>
        </div>
      }
    >
      <form id="log-interaction-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CHANNELS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Summary <span className="text-destructive normal-case font-normal">*</span></label>
          <textarea
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Describe what the customer said / asked..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Action Taken</label>
          <textarea
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            rows={2}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="What did you do to resolve it?"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Outcome</label>
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Resolved, Pending, Escalated..."
          />
        </div>
      </form>
    </Drawer>
  );
}
