'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField } from '@/components/ui/SelectField';

const CHANNELS = ['PHONE', 'EMAIL', 'WHATSAPP', 'IN_PERSON', 'CHAT', 'OTHER'];

const TEMPLATES = [
  {
    label: 'Delivery attempted — recipient absent',
    summary: 'Customer called to enquire about a delivery attempt. Rider was at the address but recipient was not available.',
    actionTaken: 'Confirmed delivery attempt with rider. Rescheduled re-attempt for next business day.',
    outcome: 'Rescheduled',
  },
  {
    label: 'Package in transit — customer enquiry',
    summary: 'Customer called asking for an update on their package. Package is currently in transit.',
    actionTaken: 'Checked current status in system and provided estimated delivery timeframe to customer.',
    outcome: 'Resolved — customer informed',
  },
  {
    label: 'Package delayed',
    summary: 'Customer reported that package has not arrived by expected date.',
    actionTaken: 'Investigated cause of delay. Escalated to dispatch team and provided new ETA to customer.',
    outcome: 'Pending — awaiting dispatch update',
  },
  {
    label: 'Package damaged on delivery',
    summary: 'Customer reported that the package arrived in damaged condition.',
    actionTaken: 'Documented damage claim. Advised customer to retain packaging and photos. Escalated for review.',
    outcome: 'Escalated — damage claim raised',
  },
  {
    label: 'Wrong item / wrong address delivery',
    summary: 'Customer received a package that was not intended for them, or delivery was made to the wrong address.',
    actionTaken: 'Logged the incident. Coordinated with dispatch to retrieve and re-deliver to correct address.',
    outcome: 'In progress — re-delivery arranged',
  },
  {
    label: 'Package marked delivered but not received',
    summary: 'Customer states they never received the package despite it showing as delivered in the system.',
    actionTaken: 'Reviewed delivery confirmation and rider GPS log. Raised investigation with field team.',
    outcome: 'Under investigation',
  },
  {
    label: 'Request for reschedule / change of address',
    summary: 'Customer requested a change of delivery address or preferred delivery time.',
    actionTaken: 'Updated delivery instructions in system and notified assigned rider.',
    outcome: 'Resolved — instructions updated',
  },
  {
    label: 'COD dispute / payment issue',
    summary: 'Customer queried the cash-on-delivery amount charged or reported a payment discrepancy.',
    actionTaken: 'Reviewed COD amount against waybill. Escalated to accounts team for reconciliation.',
    outcome: 'Escalated — accounts review pending',
  },
];

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
  const [showTemplates, setShowTemplates] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => api.post('/customer-service/interactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cs-interactions'] });
      qc.invalidateQueries({ queryKey: ['cs-pkg-detail'] });
      setSummary(''); setActionTaken(''); setOutcome('');
      onClose();
    },
  });

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setSummary(t.summary);
    setActionTaken(t.actionTaken);
    setOutcome(t.outcome);
    setShowTemplates(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ packageId, customerId, channel, summary, actionTaken, outcome });
  }

  if (!open) return null;

  const inp = 'flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
        {/* Template picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Use a response template
            <ChevronDown className={`h-4 w-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
          </button>
          {showTemplates && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg overflow-hidden">
              {TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted border-b last:border-0"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Channel</label>
          <SelectField value={channel} onChange={setChannel} options={CHANNELS.map((c) => ({ value: c, label: c.replace('_', ' ') }))} aria-label="Interaction channel" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Summary <span className="text-destructive normal-case font-normal">*</span></label>
          <textarea
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className={inp}
            placeholder="Describe what the customer said / asked..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Action Taken</label>
          <textarea
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            rows={2}
            className={inp}
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
