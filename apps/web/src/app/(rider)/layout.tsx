'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Package, LogOut01, ChevronLeft } from '@untitled-ui/icons-react';

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'RIDER')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { api.patch('/riders/me/location', { latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => {}); },
        () => {},
      );
    };
    push();
    const id = setInterval(push, 30_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading || !user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="min-h-svh bg-gray-50 dark:bg-gray-950">
      {/* Mobile-first sticky header */}
      <header className="sticky top-0 z-50 border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-black text-primary-foreground">CR</span>
            </div>
            <div className="leading-none">
              <p className="text-sm font-bold">CityRider</p>
              <p className="text-[10px] text-muted-foreground">Rider App</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut01 className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-gray-900 sm:hidden">
        <div className="flex">
          <a href="/deliveries" className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-primary">
            <Package className="h-5 w-5" />
            Deliveries
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 pb-20 pt-5 sm:pb-6">{children}</main>
    </div>
  );
}
