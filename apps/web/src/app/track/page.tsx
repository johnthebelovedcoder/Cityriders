'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const STATUS_ORDER = ['REGISTERED', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED', 'DELIVERED'];
const TERMINAL = { RETURNED: 'Returned to sender', CANCELLED: 'Cancelled' };

function StepIcon({ done, current }: { done: boolean; current: boolean }) {
  if (done || current) {
    return (
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${done ? 'bg-green-500' : 'bg-primary'}`}>
        {done ? 'âœ“' : 'â—'}
      </span>
    );
  }
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background" />;
}

export default function TrackPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.get(`/track/${input.trim().toUpperCase()}`);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Tracking number not found. Please check and try again.' : 'Could not fetch tracking info. Try again later.');
    } finally {
      setLoading(false);
    }
  }

  const currentIdx = result ? STATUS_ORDER.indexOf(result.status) : -1;
  const isTerminal = result && Object.keys(TERMINAL).includes(result.status);

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">CR</span>
            </div>
            <span className="font-semibold">CityRider</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Track Your Package</h1>
            <p className="mt-2 text-muted-foreground">Enter your tracking number to get the latest status update</p>
          </div>

          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. CRD-XXXXXXXXXX"
                className="flex h-12 flex-1 rounded-md border border-input bg-background px-4 font-mono text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? '…' : 'Track'}
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
            )}

            {result && (
              <div className="mt-6 rounded-lg border p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-semibold">{result.trackingNumber}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${result.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : isTerminal ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {(TERMINAL as any)[result.status] ?? result.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {result.destCity && (
                  <p className="text-sm text-muted-foreground">Destination: {result.destCity}, {result.destCountry}</p>
                )}

                <hr />

                <div className="space-y-3">
                  {result.statusHistory?.map((event: any, i: number) => {
                    const idx = STATUS_ORDER.indexOf(event.status);
                    const isCurrent = i === result.statusHistory.length - 1;
                    const isDone = !isCurrent && idx >= 0;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <StepIcon done={isDone} current={isCurrent} />
                          {i < result.statusHistory.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-muted" />
                          )}
                        </div>
                        <div className={`pb-3 ${isCurrent ? '' : 'text-muted-foreground'}`}>
                          <p className={`text-sm font-medium ${isCurrent ? 'text-foreground' : ''}`}>
                            {event.status.replace(/_/g, ' ')}
                          </p>
                          {event.note && <p className="text-xs">{event.note}</p>}
                          <p className="text-xs">{new Date(event.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Your tracking number was provided at the time of dispatch. Contact the sender if you need help.
          </p>
        </div>
      </main>
    </div>
  );
}

