'use client';

import { useState, useEffect } from 'react';
import { StaffSidebar } from './staff-sidebar';
import { StaffHeader } from './staff-header';
import { StaffBottomNav } from './staff-bottom-nav';
import { GlobalSearch } from './GlobalSearch';

function DemoBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    try { setDemo(localStorage.getItem('cr_mock_mode') === '1'); } catch {}
  }, []);
  if (!demo) return null;
  return (
    <div className="shrink-0 flex items-center justify-between bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-900">
      <span>Demo Mode - data shown is not real</span>
      <button
        onClick={() => {
          try { localStorage.removeItem('cr_mock_mode'); localStorage.removeItem('cr_access_token'); } catch {}
          window.location.href = '/login';
        }}
        className="rounded px-2 py-0.5 hover:bg-amber-500"
      >
        Exit Demo
      </button>
    </div>
  );
}

export function StaffLayoutClient({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('cr_sidebar_collapsed') === '1'; } catch { return false; }
  });

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('cr_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-svh overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless mobileOpen, shown at md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform md:static md:translate-x-0 md:flex ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <StaffSidebar onClose={() => setMobileOpen(false)} collapsed={collapsed} onCollapse={toggleCollapse} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StaffHeader onMenuToggle={() => setMobileOpen((o) => !o)} onSearchOpen={() => setSearchOpen(true)} />
        <DemoBanner />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <StaffBottomNav />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

