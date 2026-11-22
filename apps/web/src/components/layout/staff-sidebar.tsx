'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart01,
  BookOpen01,
  Box,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard01,
  Headphones01,
  ClockRewind,
  Home01,
  LogOut01,
  MarkerPin01,
  Receipt,
  Settings01,
  Truck01,
  Users01,
  Wallet01,
  CheckDone01,
  Car01,
  Tool02,
} from '@untitled-ui/icons-react';
import { useAuth } from '@/context/auth-context';

type NavItem = { label: string; href: string; icon: any; roles?: readonly string[] };
type NavGroup = { group: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    group: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home01 },
      { label: 'Packages', href: '/packages', icon: Box },
      { label: 'Customers', href: '/customers', icon: Users01 },
      { label: 'Riders', href: '/riders', icon: Truck01, roles: ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'CEO_EXECUTIVE'] },
      { label: 'Vehicles', href: '/vehicles', icon: Car01, roles: ['ADMINISTRATOR', 'MANAGER', 'CEO_EXECUTIVE'] },
      { label: 'Maintenance', href: '/maintenance', icon: Tool02, roles: ['ADMINISTRATOR', 'MANAGER', 'CEO_EXECUTIVE'] },
      { label: 'Assignments', href: '/assignments', icon: ClipboardCheck, roles: ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'CEO_EXECUTIVE'] },
      { label: 'Live Tracking', href: '/tracking', icon: MarkerPin01, roles: ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'CEO_EXECUTIVE'] },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Payments', href: '/payments', icon: CreditCard01, roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
      { label: 'Expenses', href: '/expenses', icon: Receipt, roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
      { label: 'Payroll', href: '/payroll', icon: Wallet01, roles: ['ADMINISTRATOR', 'MANAGER', 'CEO_EXECUTIVE'] },
      { label: 'Accounting', href: '/accounting', icon: BookOpen01, roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
      { label: 'Reconciliation', href: '/reconciliation', icon: CheckDone01, roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
    ],
  },
  {
    group: 'Support',
    items: [
      { label: 'Customer Service', href: '/customer-service', icon: Headphones01, roles: ['ADMINISTRATOR', 'MANAGER', 'CUSTOMER_SERVICE', 'CEO_EXECUTIVE'] },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart01, roles: ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'] },
      { label: 'Audit Log', href: '/audit', icon: ClockRewind, roles: ['ADMINISTRATOR', 'MANAGER', 'CEO_EXECUTIVE'] },
      { label: 'Settings', href: '/settings', icon: Settings01, roles: ['ADMINISTRATOR', 'MANAGER'] },
    ],
  },
];

export function StaffSidebar({ onClose, collapsed, onCollapse }: { onClose?: () => void; collapsed?: boolean; onCollapse?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Loading…';
  const ROLE_LABELS: Record<string, string> = {
    ADMINISTRATOR: 'Administrator', MANAGER: 'Manager', DISPATCHER: 'Dispatcher',
    ACCOUNTANT: 'Accountant', RIDER: 'Rider', CEO_EXECUTIVE: 'Executive',
    CUSTOMER_SERVICE: 'Customer Service',
  };
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? (user?.role ?? '');

  return (
    <aside className={`relative flex shrink-0 flex-col bg-sidebar transition-[width] duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      {/* Logo + collapse toggle */}
      <div className="flex h-14 items-center gap-2.5 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary">
          <span className="text-xs font-black tracking-tight text-sidebar-primary-foreground">CR</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-none">
            <p className="text-sm font-bold tracking-tight text-sidebar-foreground">CityRider</p>
            <p className="text-[10px] text-sidebar-foreground/40 tracking-widest uppercase mt-0.5">Logistics</p>
          </div>
        )}
        <button
          onClick={onCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-auto shrink-0 rounded p-1 text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hidden md:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 space-y-3">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(user?.role ?? ''));
          if (!visibleItems.length) return null;
          return (
            <div key={group.group}>
              {!collapsed && (
                <p className="mb-0.5 px-3 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/35">{group.group}</p>
              )}
              {collapsed && <div className="my-1 mx-2 h-px bg-sidebar-border/40" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center rounded-md py-2 text-[13px] transition-colors ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                      }`}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <div className={`flex items-center rounded-md py-2 ${collapsed ? 'justify-center px-1' : 'gap-2.5 px-3'}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-sidebar-foreground/50">{roleLabel}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="shrink-0 rounded p-1 text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <LogOut01 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={logout}
              title="Sign out"
              className="absolute bottom-14 left-0 right-0 mx-2 flex justify-center rounded py-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut01 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

