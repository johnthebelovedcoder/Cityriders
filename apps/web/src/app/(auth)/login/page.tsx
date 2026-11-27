'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Package, Truck01, MarkerPin01, ArrowRight, Shield01, ChevronLeft } from '@untitled-ui/icons-react';
import { useAuth } from '@/context/auth-context';

function LogisticsPanel() {
  return (
    <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12"
      style={{ background: 'linear-gradient(145deg, #2A2522 0%, #3d1a16 50%, #AE1805 100%)' }}>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(#FFB217 1px, transparent 1px), linear-gradient(90deg, #FFB217 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Road network SVG */}
      <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 700 800" preserveAspectRatio="xMidYMid slice" fill="none">
        <line x1="0" y1="200" x2="700" y2="200" stroke="#FFB217" strokeWidth="1.5" />
        <line x1="0" y1="400" x2="700" y2="400" stroke="#FFB217" strokeWidth="1.5" />
        <line x1="0" y1="600" x2="700" y2="600" stroke="#FFB217" strokeWidth="1" />
        <line x1="150" y1="0" x2="150" y2="800" stroke="#FFB217" strokeWidth="1.5" />
        <line x1="350" y1="0" x2="350" y2="800" stroke="#FFB217" strokeWidth="1.5" />
        <line x1="550" y1="0" x2="550" y2="800" stroke="#FFB217" strokeWidth="1" />
        <line x1="0" y1="0" x2="700" y2="800" stroke="#FFC653" strokeWidth="0.5" strokeDasharray="8 16" />
        <line x1="700" y1="0" x2="0" y2="800" stroke="#FFC653" strokeWidth="0.5" strokeDasharray="8 16" />
        <circle cx="150" cy="200" r="6" fill="#FFB217" />
        <circle cx="350" cy="400" r="10" fill="#FFB217" />
        <circle cx="550" cy="200" r="6" fill="#FFB217" />
        <circle cx="150" cy="600" r="6" fill="#FFB217" />
        <circle cx="550" cy="600" r="6" fill="#FFB217" />
        <circle cx="350" cy="200" r="4" fill="#FFC653" />
        <circle cx="350" cy="600" r="4" fill="#FFC653" />
      </svg>

      {/* City skyline */}
      <svg className="absolute bottom-0 left-0 right-0 w-full opacity-20" viewBox="0 0 700 220" preserveAspectRatio="none" fill="#AE1805">
        <rect x="0" y="80" width="60" height="140" />
        <rect x="10" y="40" width="40" height="40" />
        <rect x="70" y="100" width="50" height="120" />
        <rect x="80" y="70" width="30" height="30" />
        <rect x="130" y="60" width="45" height="160" />
        <rect x="140" y="20" width="25" height="40" />
        <rect x="185" y="90" width="55" height="130" />
        <rect x="250" y="50" width="40" height="170" />
        <rect x="260" y="10" width="20" height="40" />
        <rect x="300" y="80" width="50" height="140" />
        <rect x="360" y="40" width="60" height="180" />
        <rect x="375" y="5" width="30" height="35" />
        <rect x="430" y="70" width="45" height="150" />
        <rect x="485" y="55" width="55" height="165" />
        <rect x="500" y="20" width="25" height="35" />
        <rect x="550" y="90" width="50" height="130" />
        <rect x="610" y="65" width="45" height="155" />
        <rect x="665" y="85" width="35" height="135" />
        <rect x="0" y="200" width="700" height="20" />
      </svg>

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: '#FFB217' }}>
          <span className="text-base font-black" style={{ color: '#2A2522' }}>CR</span>
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#FFB217' }}>CityRider Logistics</p>
      </div>

      {/* Headline */}
      <div className="relative z-10 space-y-6">
        <div className="space-y-3">
          <h2 className="text-4xl font-black leading-tight text-white">
            Delivering cities.<br />
            <span style={{ color: '#FFB217' }}>On time.</span>
          </h2>
          <p className="leading-relaxed max-w-sm text-sm" style={{ color: '#D8CFC4' }}>
            Real-time logistics management for urban delivery operations. Track every package from pickup to door.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { icon: Package, text: 'Register and track packages in real time' },
            { icon: Truck01, text: 'Assign riders and monitor deliveries' },
            { icon: MarkerPin01, text: 'Live route visibility and status updates' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'rgba(255,178,23,0.2)', border: '1px solid rgba(255,178,23,0.3)' }}>
                <Icon className="h-4 w-4" style={{ color: '#FFB217' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: '#D8CFC4' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-xs" style={{ color: '#6B625A' }}>
        &copy; {new Date().getFullYear()} CityRider Logistics. All rights reserved.
      </div>
    </div>
  );
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 600; // 10 minutes

function LoginForm() {
  const { login, verifyTotp, enterDemoMode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [totpCode, setTotpCode] = useState('');

  const redirect = searchParams.get('redirect') || '/dashboard';
  const isLocked = lockedUntil !== null && countdown > 0;

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailCount(0);
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  function formatCountdown(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result && 'requires2FA' in result) {
        setStep('totp');
      } else if (result && 'role' in result) {
        const dest = result.role === 'RIDER' ? '/deliveries' : result.role === 'CUSTOMER' ? '/portal' : redirect;
        router.push(dest);
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Invalid email or password';
      const isRateLimited = err?.response?.status === 429 || msg.toLowerCase().includes('too many');
      const newCount = failCount + 1;
      if (isRateLimited || newCount >= MAX_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_SECONDS * 1000);
        setLockedUntil(until);
        setCountdown(LOCKOUT_SECONDS);
        setError('');
      } else {
        setFailCount(newCount);
        const remaining = MAX_ATTEMPTS - newCount;
        setError(`${msg}${remaining <= 2 ? ` — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining` : ''}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyTotp(totpCode);
      router.push(redirect !== '/dashboard' ? redirect : '/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'totp') {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield01 className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground">Open your authenticator app and enter the 6-digit code</p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex h-14 w-full rounded-lg border border-input bg-background px-4 text-center text-2xl font-mono tracking-[0.4em] placeholder:text-muted-foreground/40 placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setStep('password'); setTotpCode(''); setError(''); }}
            className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to sign in
          </button>

          <div className="rounded-lg border bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Demo mode</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Enter any 6-digit code, e.g. <span className="font-mono font-bold">123456</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Mobile logo */}
        <div className="flex justify-center lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-sm font-black text-primary-foreground">CR</span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your CityRider account</p>
        </div>

        {isLocked && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-center">
            <p className="text-sm font-semibold text-destructive">Too many failed attempts</p>
            <p className="mt-1 text-xs text-destructive/80">Please try again in <span className="font-mono font-bold">{formatCountdown(countdown)}</span></p>
          </div>
        )}

        {!isLocked && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email address</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cityrider.com"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : isLocked ? `Locked — ${formatCountdown(countdown)}` : (
              <>Sign In <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <div className="rounded-lg border bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Try Demo Mode</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mb-3">Loads realistic sample data instantly, no backend needed.</p>
          <button
            type="button"
            onClick={enterDemoMode}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-amber-400 bg-amber-400/20 text-xs font-bold text-amber-700 hover:bg-amber-400/30 dark:text-amber-400"
          >
            Enter Demo Mode
          </button>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-amber-600 dark:text-amber-500">Real credentials</summary>
            <div className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              <p><span className="font-medium">Admin:</span> admin@cityrider.com / admin123 <span className="opacity-70">(2FA: any 6 digits)</span></p>
              <p><span className="font-medium">Dispatcher:</span> dispatcher@cityrider.com / dispatch123</p>
              <p><span className="font-medium">Rider:</span> rider1@cityrider.com / rider123</p>
              <p><span className="font-medium">Customer:</span> customer@demo.com / customer123</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh">
      <LogisticsPanel />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}