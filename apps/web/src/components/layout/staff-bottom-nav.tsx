'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart01,
  BookOpen01,
  Box,
  CheckDone01,
  ClipboardCheck,
  CreditCard01,
  Grid01,
  Headphones01,
  ClockRewind,
  Home01,
  MarkerPin01,
  Receipt,
  Settings01,
  Truck01,
  Users01,
  Wallet01,
  XClose,
} from '@untitled-ui/icons-react';
import { useAuth } from '@/context/auth-context';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: Home01 },
  { label: 'Packages',  href: '/packages',  icon: Box },
  { label: 'Customers', href: '/customers', icon: Users01 },
  { label: 'Riders',       href: '/riders',       icon: Truck01,       roles: ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'CEO_EXECUTIVE'] },
  { label: 'Assignments',  href: '/assignments',  icon: ClipboardCheck, roles: ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'CEO_EXECUTIVE'] },
  { label: 'Payments',     href: '/payments',     icon: CreditCard01,  roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
  { label: 'Expenses',     href: '/expenses',     icon: Receipt,       roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
  { label: 'Payroll',      href: '/payroll',      icon: Wallet01,      roles: ['ADMINISTRATOR', 'MANAGER', 'CEO_EXECUTIVE'] },
  { label: 'Accounting',   href: '/accounting',   icon: BookOpen01,    roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
  { label: 'Cust. Service',href: '/customer-service', icon: Headphones01, roles: ['ADMINISTRATOR', 'MANAGER', 'CUSTOMER_SERVICE', 'CEO_EXECUTIVE'] },
  { label: 'Live Tracking',href: '/tracking',     icon: MarkerPin01,   roles: ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'CEO_EXECUTIVE'] },
  { label: 'Reports',      href: '/reports',      icon: BarChart01,    roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
  { label: 'Reconcile',    href: '/reconciliation', icon: CheckDone01,   roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
  { label: 'Audit Log',    href: '/audit',        icon: ClockRewind,   roles: ['ADMINISTRATOR', 'MANAGER', 'CEO_EXECUTIVE'] },
  { label: 'Settings',     href: '/settings',     icon: Settings01,    roles: ['ADMINISTRATOR', 'MANAGER'] },
];

function isActive(href: string, pathname: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
}

export function StaffBottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const visible = NAV_ITEMS.filter(
    (item) => !('roles' in item) || (item.roles as string[]).includes(user?.role ?? ''),
  );

  const primary = visible.slice(0, 4);
  const overflow = visible.slice(4);
  const moreActive = overflow.some((item) => isActive(item.href, pathname));

  return (
    <>
      {/* More overlay panel */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-16 inset-x-0 z-50 rounded-t-2xl border-t bg-card shadow-2xl md:hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-semibold">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-md p-1.5 hover:bg-muted transition-colors"
              >
                <XClose className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-3 pb-5">
              {overflow.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center text-[10px] font-medium leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-card md:hidden safe-bottom">
        <div className="flex">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              moreActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Grid01 className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
