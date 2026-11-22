'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell01, Package, Truck01, CheckCircle, TrendUp01, AlertCircle, XClose, Menu01, SearchMd } from '@untitled-ui/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/packages': 'Packages',
  '/customers': 'Customers',
  '/riders': 'Riders',
  '/assignments': 'Assignments',
  '/payments': 'Payments',
  '/expenses': 'Expenses',
  '/payroll': 'Payroll',
  '/accounting': 'Accounting',
  '/tracking': 'Live Tracking',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/users': 'Users',
};

const ACTIVITY_ICON: Record<string, { icon: typeof CheckCircle; cls: string }> = {
  DELIVERED:          { icon: CheckCircle, cls: 'text-green-600' },
  ASSIGNED:           { icon: Truck01,     cls: 'text-blue-600' },
  IN_TRANSIT:         { icon: TrendUp01,   cls: 'text-amber-600' },
  PICKED_UP:          { icon: TrendUp01,   cls: 'text-indigo-600' },
  REGISTERED:         { icon: Package,     cls: 'text-gray-500' },
  DELIVERY_ATTEMPTED: { icon: AlertCircle, cls: 'text-orange-500' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    staleTime: 30_000,
  });

  const activities: any[] = stats?.recentActivity ?? [];
  const unread = activities.filter((a) => !read.has(a.id)).length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function markAllRead() {
    setRead(new Set(activities.map((a) => a.id)));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
      >
        <Bell01 className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y">
            {activities.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</p>
            )}
            {activities.map((ev) => {
              const isUnread = !read.has(ev.id);
              const def = ACTIVITY_ICON[ev.type] ?? { icon: Package, cls: 'text-gray-500' };
              const Icon = def.icon;
              return (
                <Link
                  key={ev.id}
                  href={`/packages/${ev.packageId}`}
                  onClick={() => { setRead((s) => new Set([...s, ev.id])); setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors ${isUnread ? 'bg-primary/[0.03]' : ''}`}
                >
                  <div className={`mt-0.5 shrink-0 ${def.cls}`}><Icon className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className={`leading-snug ${isUnread ? 'font-medium' : 'text-muted-foreground'}`}>{ev.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(ev.time)}</p>
                  </div>
                  {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>

          <div className="border-t px-4 py-2.5">
            <Link href="/packages" onClick={() => setOpen(false)} className="block text-center text-xs text-primary hover:underline">
              View all packages ->
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function StaffHeader({ onMenuToggle, onSearchOpen }: { onMenuToggle?: () => void; onSearchOpen?: () => void }) {
  const pathname = usePathname();
  const segment = '/' + (pathname.split('/')[1] ?? '');
  const pageLabel = ROUTE_LABELS[segment] ?? 'CityRider';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="hidden"
        >
          <Menu01 className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Search bar trigger */}
        <button
          onClick={onSearchOpen}
          className="hidden sm:flex h-8 items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors min-w-[200px]"
        >
          <SearchMd className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left text-xs">Search…</span>
          <kbd className="hidden md:inline-flex h-5 items-center rounded border bg-background px-1.5 text-[10px] font-medium">⌘K</kbd>
        </button>
        {/* Mobile search icon */}
        <button
          onClick={onSearchOpen}
          aria-label="Search"
          className="sm:hidden flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
        >
          <SearchMd className="h-4 w-4" />
        </button>
        <Link
          href="/packages?new=1"
          className="hidden sm:inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Package
        </Link>
        <NotificationBell />
      </div>
    </header>
  );
}

