'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const RECIPIENT_EVENTS = [
  { key: 'BOOKING_CONFIRMED',  label: 'Booking Confirmed' },
  { key: 'RIDER_ASSIGNED',     label: 'Rider Assigned' },
  { key: 'OUT_FOR_DELIVERY',   label: 'Out for Delivery' },
  { key: 'DELIVERY_ATTEMPTED', label: 'Delivery Attempted' },
  { key: 'DELIVERED',          label: 'Delivered' },
] as const;

const STAFF_EVENTS = [
  { key: 'ASSIGNMENT_CREATED', label: 'New Assignment' },
  { key: 'STATUS_CHANGED',     label: 'Status Changed' },
  { key: 'COD_ALERT',          label: 'COD Alert' },
  { key: 'EXPENSE_ALERT',      label: 'Expense Alert' },
] as const;

const CHANNELS = [
  { key: 'sms',   label: 'SMS' },
  { key: 'email', label: 'Email' },
  { key: 'inApp', label: 'In-App' },
] as const;

const STAFF_ROLES = [
  { key: 'MANAGER',    label: 'Manager' },
  { key: 'DISPATCHER', label: 'Dispatcher' },
  { key: 'ACCOUNTANT', label: 'Accountant' },
] as const;

const DEFAULT_RULES = {
  recipient: {
    BOOKING_CONFIRMED:  { sms: true,  email: true,  inApp: false },
    RIDER_ASSIGNED:     { sms: false, email: false, inApp: true  },
    OUT_FOR_DELIVERY:   { sms: true,  email: false, inApp: true  },
    DELIVERY_ATTEMPTED: { sms: true,  email: true,  inApp: true  },
    DELIVERED:          { sms: true,  email: true,  inApp: false },
  },
  staff: {
    ASSIGNMENT_CREATED: { MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false },
    STATUS_CHANGED:     { MANAGER: false, DISPATCHER: true,  ACCOUNTANT: false },
    COD_ALERT:          { MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true  },
    EXPENSE_ALERT:      { MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true  },
  },
};

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={`inline-flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
        checked ? 'border-primary bg-primary' : 'border-border bg-background hover:border-primary/50'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 10" className="h-3 w-3 fill-none stroke-primary-foreground" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 5L4.5 8.5 10.5 1.5" />
        </svg>
      )}
    </button>
  );
}

export function NotificationsSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [expenseThreshold, setExpenseThreshold] = useState('');
  const [creditThreshold, setCreditThreshold] = useState('');
  const [rules, setRules] = useState<typeof DEFAULT_RULES>(DEFAULT_RULES);

  useEffect(() => {
    if (!settings) return;
    setSmsEnabled(settings.smsEnabled ?? false);
    setExpenseThreshold(String(settings.expenseApprovalThreshold ?? ''));
    setCreditThreshold(String(settings.lowCreditThreshold ?? ''));
    if (settings.notificationRules) setRules(settings.notificationRules);
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/settings', {
        smsEnabled,
        expenseApprovalThreshold: parseFloat(expenseThreshold),
        lowCreditThreshold: parseFloat(creditThreshold),
        notificationRules: rules,
      }),
    onSuccess: () => {
      toast.success('Notification settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  function toggleRecipient(event: string, channel: string) {
    setRules((r) => ({
      ...r,
      recipient: {
        ...r.recipient,
        [event]: {
          ...(r.recipient as any)[event],
          [channel]: !(r.recipient as any)[event]?.[channel],
        },
      },
    }));
  }

  function toggleStaff(event: string, role: string) {
    setRules((r) => ({
      ...r,
      staff: {
        ...r.staff,
        [event]: {
          ...(r.staff as any)[event],
          [role]: !(r.staff as any)[event]?.[role],
        },
      },
    }));
  }

  if (!settings) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Define which events trigger which channels for recipients and staff. Changes take effect immediately on save.
        </p>
      </div>

      {/* Recipient notification matrix */}
      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Recipient Notifications</h3>
          <p className="text-xs text-muted-foreground">Channels triggered for each delivery event — sent to the package recipient</p>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-1/2">Event</th>
                {CHANNELS.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {RECIPIENT_EVENTS.map(({ key, label }) => (
                <tr key={key} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  {CHANNELS.map(({ key: ch }) => (
                    <td key={ch} className="px-4 py-3 text-center">
                      <Checkbox
                        checked={(rules.recipient as any)[key]?.[ch] ?? false}
                        onToggle={() => toggleRecipient(key, ch)}
                        label={`${label} via ${ch}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          SMS requires the gateway to be enabled below. Email requires SMTP configuration in infrastructure settings.
        </p>
      </section>

      {/* Staff alert matrix */}
      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Staff Alerts</h3>
          <p className="text-xs text-muted-foreground">In-app notifications per role for operational events</p>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-1/2">Event</th>
                {STAFF_ROLES.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {STAFF_EVENTS.map(({ key, label }) => (
                <tr key={key} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  {STAFF_ROLES.map(({ key: role }) => (
                    <td key={role} className="px-4 py-3 text-center">
                      <Checkbox
                        checked={(rules.staff as any)[key]?.[role] ?? false}
                        onToggle={() => toggleStaff(key, role)}
                        label={`${label} for ${role}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* General / thresholds */}
      <section className="space-y-4">
        <h3 className="font-medium">General</h3>

        <div className="max-w-lg space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h4 className="mb-3 text-sm font-medium">SMS Gateway</h4>
            <label className="flex cursor-pointer items-center gap-3">
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${smsEnabled ? 'bg-primary' : 'bg-muted'}`}
                onClick={() => setSmsEnabled((v) => !v)}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${smsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm">{smsEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Master switch for all SMS channels. Requires Africa's Talking integration.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h4 className="text-sm font-medium">Approval Thresholds</h4>
            <div className="space-y-1">
              <label className="text-sm font-medium">Expense approval threshold (NGN)</label>
              <input
                type="number"
                value={expenseThreshold}
                onChange={(e) => setExpenseThreshold(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Expenses above this amount require manager approval</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Low credit balance alert (NGN)</label>
              <input
                type="number"
                value={creditThreshold}
                onChange={(e) => setCreditThreshold(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Alert when a customer's credit balance falls below this amount</p>
            </div>
          </div>
        </div>
      </section>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
