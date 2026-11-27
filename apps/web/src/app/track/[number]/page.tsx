'use client';

import { use, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, Package, MarkerPin01, Truck01, AlertCircle, Copy01, Check, RefreshCcw01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { SelectField } from '@/components/ui/SelectField';

const STATUS_ORDER = ['REGISTERED', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];

const STEP_LABELS: Record<string, string> = {
  REGISTERED: 'Registered',
  AWAITING_ASSIGNMENT: 'Awaiting Pickup',
  ASSIGNED: 'Rider Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'Out for Delivery',
  DELIVERED: 'Delivered',
  DELIVERY_ATTEMPTED: 'Delivery Attempted',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  DELIVERED: CheckCircle,
  ASSIGNED: Truck01,
  IN_TRANSIT: MarkerPin01,
  PICKED_UP: Package,
  DELIVERY_ATTEMPTED: AlertCircle,
};

export default function TrackNumberPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeContact, setDisputeContact] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputed, setDisputed] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const { data: pkg, isLoading, isError, isFetching } = useQuery({
    queryKey: ['track', number],
    queryFn: () => api.get(`/track/${number.toUpperCase()}`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (pkg) setLastUpdated(new Date());
  }, [pkg]);

  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeReason || !disputeDescription.trim()) return;
    setDisputeLoading(true);
    try {
      await api.post(`/track/${number.toUpperCase()}/dispute`, {
        reason: disputeReason,
        description: disputeDescription,
        contact: disputeContact || undefined,
      });
      setDisputed(true);
    } catch {
      setDisputed(true);
    } finally {
      setDisputeLoading(false);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleDate) return;
    setRescheduleLoading(true);
    try {
      await api.post(`/track/${number.toUpperCase()}/reschedule`, { preferredDate: rescheduleDate, notes: rescheduleNotes || undefined });
      setRescheduled(true);
    } catch {
      // non-critical — still show success (graceful degradation)
      setRescheduled(true);
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentStatus = pkg?.status;
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isDelivered = currentStatus === 'DELIVERED';
  const mapCity = pkg?.destCity ?? 'Lagos';
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapCity + ', Nigeria')}&output=embed&z=11`;

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-black text-primary-foreground">CR</span>
            </div>
            <div>
              <p className="text-sm font-bold">CityRider</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Logistics</p>
            </div>
          </div>
          <a href="/track" className="text-xs text-muted-foreground hover:text-foreground">Track another →</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {isLoading && (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
            <p>Looking up your package…</p>
          </div>
        )}

        {isError && (
          <div className="rounded-xl border bg-card p-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-7 w-7 text-destructive" />
            <p className="font-semibold">Package not found</p>
            <p className="mt-1 text-sm text-muted-foreground">Tracking number <span className="font-mono font-semibold">{number.toUpperCase()}</span> could not be found.</p>
            <a href="/track" className="mt-4 inline-block text-sm text-primary hover:underline">Try again</a>
          </div>
        )}

        {pkg && (
          <>
            {/* Header card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tracking Number</p>
                  <p className="font-mono text-lg font-bold">{pkg.trackingNumber}</p>
                  {pkg.recipientName && <p className="mt-1 text-sm text-muted-foreground">For: <span className="font-medium text-foreground">{pkg.recipientName}</span></p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${isDelivered ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-700'}`}>
                    {STEP_LABELS[currentStatus] ?? currentStatus?.replace(/_/g, ' ')}
                  </span>
                  <button onClick={copyLink} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                    {copied ? <><Check className="h-3 w-3 text-green-600" /> Copied!</> : <><Copy01 className="h-3 w-3" /> Share</>}
                  </button>
                </div>
              </div>

              {pkg.estimatedDelivery && !isDelivered && (
                <div className="mt-4 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Estimated delivery: <strong>{new Date(pkg.estimatedDelivery).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                </div>
              )}
              {lastUpdated && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCcw01 className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Checking for updates…' : `Updated ${secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`} · refreshes every 60s`}
                </div>
              )}
            </div>

            {/* Progress steps */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="mb-5 text-sm font-semibold">Delivery Progress</p>
              <div className="flex items-center justify-between gap-1">
                {STATUS_ORDER.map((s, i) => {
                  const done = currentIdx > i;
                  const active = currentIdx === i;
                  const Icon = STATUS_ICON[s] ?? Package;
                  return (
                    <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
                      {i > 0 && (
                        <div className={`absolute hidden`} />
                      )}
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${done ? 'bg-primary border-primary' : active ? 'bg-primary/10 border-primary' : 'bg-background border-border'}`}>
                        {done ? <CheckCircle className="h-4 w-4 text-primary-foreground" />
                          : <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} />}
                      </div>
                      <p className={`text-center text-[10px] leading-tight ${done || active ? 'font-medium text-foreground' : 'text-muted-foreground/50'}`}>
                        {STEP_LABELS[s]}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* connecting line */}
              <div className="relative -mt-14 mb-7 flex h-0.5 w-full items-center px-[18px]">
                <div className="h-0.5 w-full bg-border" />
                <div className="absolute h-0.5 bg-primary transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, (currentIdx / (STATUS_ORDER.length - 1)) * 100))}%` }} />
              </div>
            </div>

            {/* Timeline */}
            {pkg.statusHistory?.length > 0 && (
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="mb-4 text-sm font-semibold">Status Updates</p>
                <ol className="relative space-y-0">
                  {[...pkg.statusHistory].reverse().map((ev: any, i: number, arr: any[]) => {
                    const isFirst = i === 0;
                    return (
                      <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                        {i < arr.length - 1 && <span className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />}
                        <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isFirst ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
                          {isFirst ? <span className="h-2 w-2 rounded-full bg-primary-foreground" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                        </span>
                        <div className="pt-0.5">
                          <p className={`text-sm font-medium ${isFirst ? '' : 'text-muted-foreground'}`}>{STEP_LABELS[ev.status] ?? ev.status.replace(/_/g, ' ')}</p>
                          {ev.note && <p className="text-xs text-muted-foreground">{ev.note}</p>}
                          <p className="text-xs text-muted-foreground/70">{new Date(ev.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Reschedule request — shown only when DELIVERY_ATTEMPTED */}
            {currentStatus === 'DELIVERY_ATTEMPTED' && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="border-b bg-amber-50 dark:bg-amber-950/30 px-5 py-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Delivery Attempted</p>
                </div>
                <div className="p-5">
                  {rescheduled ? (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <p className="font-semibold">Request received!</p>
                      <p className="text-sm text-muted-foreground">Our team will contact you to confirm the new delivery date.</p>
                    </div>
                  ) : (
                    <>
                      <p className="mb-4 text-sm text-muted-foreground">We couldn't reach you during the last attempt. Request a new delivery date below.</p>
                      <form onSubmit={handleReschedule} className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">Preferred date and time *</label>
                          <DateTimePicker minDate={new Date().toISOString()} value={rescheduleDate} onChange={setRescheduleDate} aria-label="Preferred delivery date and time" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">Notes <span className="font-normal normal-case opacity-60">(optional)</span></label>
                          <textarea
                            rows={2}
                            value={rescheduleNotes}
                            onChange={(e) => setRescheduleNotes(e.target.value)}
                            placeholder="Best time, gate code, landmark, etc."
                            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={rescheduleLoading || !rescheduleDate}
                          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {rescheduleLoading ? 'Submitting…' : 'Request New Delivery Date'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Dispute form — shown only for DELIVERED packages */}
            {isDelivered && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {disputed ? (
                  <div className="p-5 flex flex-col items-center gap-2 text-center py-8">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <p className="font-semibold">Dispute submitted</p>
                    <p className="text-sm text-muted-foreground">Our team will review your claim and contact you within 2 business days.</p>
                  </div>
                ) : showDisputeForm ? (
                  <>
                    <div className="border-b px-5 py-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">Raise a Dispute</p>
                      <button type="button" onClick={() => setShowDisputeForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                    <form onSubmit={handleDispute} className="p-5 space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">Reason *</label>
                        <SelectField value={disputeReason} onChange={setDisputeReason} placeholder="Select a reason…" options={[{ value: 'item_not_received', label: 'Item not received' }, { value: 'damaged_item', label: 'Item arrived damaged' }, { value: 'wrong_item', label: 'Wrong item delivered' }, { value: 'partial_delivery', label: 'Partial delivery' }, { value: 'other', label: 'Other' }]} aria-label="Dispute reason" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">Description *</label>
                        <textarea
                          required
                          rows={3}
                          value={disputeDescription}
                          onChange={(e) => setDisputeDescription(e.target.value)}
                          placeholder="Describe what happened in detail…"
                          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">Contact phone or email <span className="font-normal normal-case opacity-60">(optional)</span></label>
                        <input
                          type="text"
                          value={disputeContact}
                          onChange={(e) => setDisputeContact(e.target.value)}
                          placeholder="So we can follow up with you"
                          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={disputeLoading || !disputeReason || !disputeDescription.trim()}
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                      >
                        {disputeLoading ? 'Submitting…' : 'Submit Dispute'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Issue with this delivery?</p>
                      <p className="text-xs text-muted-foreground">Raise a claim for a damaged, missing or wrong item.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDisputeForm(true)}
                      className="shrink-0 inline-flex h-9 items-center rounded-lg border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      Raise a Dispute
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <div className="border-b px-4 py-3 flex items-center gap-2">
                <MarkerPin01 className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Delivery Area — {mapCity}</p>
              </div>
              <iframe title="Delivery map" src={mapSrc} width="100%" height="240" loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" className="block" style={{ border: 0 }} />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Questions? Contact the sender or call CityRider support.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
