'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  SearchMd, Package, Users01, Truck01, XClose, ArrowRight,
  Home01, CreditCard01, Receipt, Wallet01, BookOpen01, CheckDone01,
  Headphones01, BarChart01, ClockRewind, Settings01, Car01, Tool02,
  ClipboardCheck, MarkerPin01,
} from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

type PageEntry = { label: string; description: string; href: string; icon: any; keywords: string[] };

const ALL_PAGES: PageEntry[] = [
  { label: 'Dashboard', description: 'Overview & key metrics', href: '/dashboard', icon: Home01, keywords: ['home', 'overview', 'summary', 'stats', 'metrics', 'kpi'] },
  { label: 'Packages', description: 'Manage shipments & deliveries', href: '/packages', icon: Package, keywords: ['shipments', 'deliveries', 'parcels', 'tracking', 'orders', 'logistics'] },
  { label: 'Customers', description: 'Customer & sender records', href: '/customers', icon: Users01, keywords: ['senders', 'clients', 'contacts', 'accounts', 'people'] },
  { label: 'Riders', description: 'Rider management', href: '/riders', icon: Truck01, keywords: ['drivers', 'couriers', 'dispatch', 'delivery agents', 'staff'] },
  { label: 'Vehicles', description: 'Fleet & vehicle registry', href: '/vehicles', icon: Car01, keywords: ['fleet', 'cars', 'bikes', 'motorbikes', 'trucks', 'assets'] },
  { label: 'Maintenance', description: 'Vehicle service records', href: '/maintenance', icon: Tool02, keywords: ['service', 'repair', 'oil change', 'mechanics', 'upkeep', 'schedule', 'alerts'] },
  { label: 'Assignments', description: 'Rider & package assignments', href: '/assignments', icon: ClipboardCheck, keywords: ['manifests', 'dispatch', 'allocation', 'schedule'] },
  { label: 'Live Tracking', description: 'Real-time delivery tracking', href: '/tracking', icon: MarkerPin01, keywords: ['map', 'location', 'gps', 'realtime', 'live'] },
  { label: 'Payments', description: 'Revenue & income records', href: '/payments', icon: CreditCard01, keywords: ['income', 'revenue', 'transactions', 'cod', 'collections', 'money', 'invoices', 'billing', 'receipts'] },
  { label: 'Expenses', description: 'Cost & expenditure tracking', href: '/expenses', icon: Receipt, keywords: ['costs', 'spending', 'expenditure', 'outflow', 'bills', 'fuel', 'salary'] },
  { label: 'Payroll', description: 'Staff salary & payroll', href: '/payroll', icon: Wallet01, keywords: ['salary', 'wages', 'compensation', 'staff pay', 'hr'] },
  { label: 'Accounting', description: 'Ledger & financial records', href: '/accounting', icon: BookOpen01, keywords: ['ledger', 'accounts', 'finance', 'bookkeeping', 'journal', 'profit', 'loss'] },
  { label: 'Reconciliation', description: 'Payment reconciliation', href: '/reconciliation', icon: CheckDone01, keywords: ['reconcile', 'match', 'balance', 'audit payments', 'bank'] },
  { label: 'Customer Service', description: 'Tickets & support', href: '/customer-service', icon: Headphones01, keywords: ['support', 'tickets', 'complaints', 'help', 'cs', 'queries'] },
  { label: 'Reports', description: 'Analytics & reports', href: '/reports', icon: BarChart01, keywords: ['analytics', 'charts', 'data', 'statistics', 'exports', 'performance'] },
  { label: 'Audit Log', description: 'Activity & change history', href: '/audit', icon: ClockRewind, keywords: ['history', 'logs', 'activity', 'changes', 'trail', 'events'] },
  { label: 'Settings', description: 'System configuration', href: '/settings', icon: Settings01, keywords: ['config', 'preferences', 'zones', 'pricing', 'system', 'admin'] },
];

const STATUS_DOT: Record<string, string> = {
  DELIVERED: 'bg-emerald-500',
  IN_TRANSIT: 'bg-blue-500',
  ASSIGNED: 'bg-indigo-500',
  AWAITING_ASSIGNMENT: 'bg-yellow-500',
  DELIVERY_ATTEMPTED: 'bg-orange-500',
  RETURNED: 'bg-red-500',
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-gray-400',
};

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function matchPages(query: string): PageEntry[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  return ALL_PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.includes(q)),
  ).slice(0, 5);
}

export function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debouncedQ],
    queryFn: () => api.get('/search', { params: { q: debouncedQ } }).then((r) => r.data),
    enabled: debouncedQ.length >= 2,
    staleTime: 10_000,
  });

  const packages: any[] = data?.packages ?? [];
  const customers: any[] = data?.customers ?? [];
  const riders: any[] = data?.riders ?? [];
  const matchedPages = matchPages(q);

  const pageResults = matchedPages.map((p) => ({ type: 'page' as const, label: p.label, sub: p.description, status: '', href: p.href, icon: p.icon }));
  const dataResults = [
    ...packages.map((p: any) => ({ type: 'package' as const, label: p.trackingNumber, sub: `${p.sender?.name} → ${p.recipient?.name} · ${p.destCity}`, status: p.status, href: `/packages/${p.id}`, icon: Package })),
    ...customers.map((c: any) => ({ type: 'customer' as const, label: c.name, sub: c.phone, status: c.status, href: `/customers/${c.id}`, icon: Users01 })),
    ...riders.map((r: any) => ({ type: 'rider' as const, label: `${r.user.firstName} ${r.user.lastName}`, sub: r.user.phone ?? r.riderId, status: r.status, href: `/riders/${r.id}`, icon: Truck01 })),
  ];
  const allResults = [...pageResults, ...dataResults];

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, allResults.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === 'Enter' && allResults[cursor]) { navigate(allResults[cursor].href); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, allResults, cursor, navigate, onClose]);

  if (!open) return null;

  function Section({ title, items, startIdx }: { title: string; items: typeof allResults; startIdx: number }) {
    if (!items.length) return null;
    return (
      <div>
        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
        {items.map((item, i) => {
          const idx = startIdx + i;
          const Icon = item.icon;
          const isPage = item.type === 'page';
          return (
            <button
              key={item.href}
              onMouseEnter={() => setCursor(idx)}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${cursor === idx ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isPage ? 'bg-primary/10' : 'bg-muted'}`}>
                <Icon className={`h-3.5 w-3.5 ${isPage ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
              </div>
              {item.status ? (
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[item.status] ?? 'bg-gray-300'}`} />
              ) : null}
              {cursor === idx && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    );
  }

  const pageEnd = pageResults.length;
  const pkgEnd = pageEnd + packages.length;
  const custEnd = pkgEnd + customers.length;

  const hasPageResults = pageResults.length > 0;
  const hasDataResults = debouncedQ.length >= 2 && !isFetching && dataResults.length > 0;
  const hasResults = allResults.length > 0;
  const showEmpty = q.length >= 1 && !isFetching && !hasResults;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <SearchMd className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            placeholder="Search pages, packages, customers, riders…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground">
              <XClose className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-1">
          {!q && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Search pages, packages, customers or riders
            </p>
          )}
          {isFetching && debouncedQ.length >= 2 && !hasPageResults && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</p>
          )}
          {showEmpty && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No results for "{q}"</p>
          )}

          {hasPageResults && (
            <Section title="Pages" items={allResults.slice(0, pageEnd)} startIdx={0} />
          )}
          {hasDataResults && (
            <>
              {packages.length > 0 && <Section title="Packages" items={allResults.slice(pageEnd, pkgEnd)} startIdx={pageEnd} />}
              {customers.length > 0 && <Section title="Customers" items={allResults.slice(pkgEnd, custEnd)} startIdx={pkgEnd} />}
              {riders.length > 0 && <Section title="Riders" items={allResults.slice(custEnd)} startIdx={custEnd} />}
            </>
          )}
          {/* Still loading data results but pages already shown */}
          {isFetching && hasPageResults && debouncedQ.length >= 2 && (
            <p className="px-4 py-2 text-center text-xs text-muted-foreground">Searching records…</p>
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5 font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
