'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Package, LayoutAlt01, LogOut01, ChevronLeft, ChevronRight, File01 } from '@untitled-ui/icons-react';
import { useAuth } from '@/context/auth-context';

const NAV = [
  { href: '/portal', label: 'Dashboard', icon: LayoutAlt01 },
  { href: '/portal/packages', label: 'My Packages', icon: Package },
  { href: '/portal/invoices', label: 'Invoices', icon: File01 },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('cr_portal_sidebar_collapsed') === '1'; } catch { return false; }
  });

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('cr_portal_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'CUSTOMER')) {
      router.replace('/login?from=/portal');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return <div className="flex h-svh items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="flex h-svh overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className={`hidden sm:flex shrink-0 flex-col border-r bg-card transition-[width] duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
        <div className="flex h-14 items-center border-b px-3 gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">CR</div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-none">CityRider</p>
              <p className="text-[10px] text-muted-foreground">Customer Portal</p>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2">
          {!collapsed && (
            <div className="mb-1 px-3 py-1">
              <p className="text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign out"
            className={`flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'}`}
          >
            <LogOut01 className="h-4 w-4 shrink-0" />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b bg-card px-6">
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user.firstName}</span>
          </p>
        </header>
        <main className="flex-1 overflow-y-auto p-6 pb-20 sm:pb-6">{children}</main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card sm:hidden">
        <div className="flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

