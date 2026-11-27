'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

function AcceptInviteForm() {
  const params = useSearchParams();
  const { acceptInvite } = useAuth();
  const rawToken = params.get('token') ?? '';

  let tokenData: { customerId?: string; email?: string; name?: string; exp?: number } = {};
  try { tokenData = JSON.parse(atob(decodeURIComponent(rawToken))); } catch {}

  const isExpired = tokenData.exp ? tokenData.exp < Date.now() : false;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!rawToken || !tokenData.email) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-2xl mb-2">🔗</p>
        <h2 className="text-lg font-semibold mb-1">Invalid invite link</h2>
        <p className="text-sm text-muted-foreground">This link is missing required information. Please ask staff to resend the invite.</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-2xl mb-2">⏰</p>
        <h2 className="text-lg font-semibold mb-1">Invite link expired</h2>
        <p className="text-sm text-muted-foreground">This link was valid for 48 hours. Please ask staff to send a new invite.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-2xl mb-2">✅</p>
        <h2 className="text-lg font-semibold mb-1">Account created!</h2>
        <p className="text-sm text-muted-foreground">Redirecting you to the portal…</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      setDone(true);
      await acceptInvite(rawToken, password);
    } catch (err: any) {
      setDone(false);
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inp = 'flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-8 shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-bold">Create your account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome, <span className="font-medium text-foreground">{tokenData.name ?? 'there'}</span>! Set a password to access the CityRider customer portal.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide">Email</label>
        <input disabled value={tokenData.email} className={`${inp} opacity-60 cursor-not-allowed`} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          className={inp}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide">Confirm password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          className={inp}
        />
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? 'Creating account…' : 'Create account & go to portal'}
      </button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl mb-3">C</div>
          <h1 className="text-2xl font-bold">CityRider Portal</h1>
          <p className="text-sm text-muted-foreground">Customer self-service portal</p>
        </div>
        <Suspense fallback={<div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
