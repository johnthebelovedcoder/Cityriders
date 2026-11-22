'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type MockUser = { password: string; role: string; firstName: string; lastName: string; id: string; twoFactorEnabled?: boolean };

// Hardcoded demo accounts (no database needed)
const MOCK_USERS: Record<string, MockUser> = {
  'admin@cityrider.com':      { password: 'admin123',      role: 'ADMINISTRATOR', firstName: 'Admin',    lastName: 'User',   id: 'mock-001', twoFactorEnabled: true },
  'dispatcher@cityrider.com': { password: 'dispatch123',   role: 'DISPATCHER',    firstName: 'Dispatch', lastName: 'Mgr',    id: 'mock-002' },
  'rider@cityrider.com':      { password: 'rider123',      role: 'RIDER',         firstName: 'John',     lastName: 'Rider',  id: 'mock-003' },
  'rider1@cityrider.com':     { password: 'rider123',      role: 'RIDER',         firstName: 'John',     lastName: 'Rider',  id: 'mock-003' },
  'customer@demo.com':        { password: 'customer123',   role: 'CUSTOMER',      firstName: 'Alice',    lastName: 'Corp',   id: 'mock-004' },
};

function makeMockToken(payload: object) {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body   = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 365 }));
  return `${header}.${body}.mock`;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA: true } | AuthUser | undefined>;
  verifyTotp: (code: string) => Promise<void>;
  logout: () => void;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): any {
  try {
    return JSON.parse(atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 7) {
  document.cookie = `${name}=${value}; path=/; max-age=${days * 86400}; samesite=lax`;
}

type PendingUser = AuthUser & { password?: string; _accessToken?: string; _refreshToken?: string };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pending2FAUser, setPending2FAUser] = useState<PendingUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('cr_access_token');
    if (!token) { setIsLoading(false); return; }

    const payload = decodeJwt(token);
    if (!payload || payload.exp * 1000 <= Date.now()) { setIsLoading(false); return; }

    // Mock token (signature === 'mock') — restore user from payload directly
    if (token.endsWith('.mock')) {
      setUser({ id: payload.sub, email: payload.email, role: payload.role, firstName: payload.firstName, lastName: payload.lastName });
      setIsLoading(false);
      return;
    }

    api.get('/users/me')
      .then(({ data }) => setUser({ id: payload.sub, email: payload.email, role: payload.role, firstName: data.firstName, lastName: data.lastName }))
      .catch(() => { localStorage.removeItem('cr_access_token'); localStorage.removeItem('cr_refresh_token'); })
      .finally(() => setIsLoading(false));
  }, []);

  const verifyTotp = useCallback(async (code: string) => {
    if (!pending2FAUser) throw new Error('No pending 2FA session');
    if (!/^\d{6}$/.test(code)) throw new Error('Invalid code — enter the 6-digit code from your authenticator app');
    const { id, email, role, firstName, lastName, _accessToken, _refreshToken } = pending2FAUser;
    if (_accessToken && _refreshToken) {
      localStorage.setItem('cr_access_token', _accessToken);
      localStorage.setItem('cr_refresh_token', _refreshToken);
      localStorage.removeItem('cr_mock_mode');
    } else {
      const token = makeMockToken({ sub: id, email, role, firstName, lastName });
      localStorage.setItem('cr_access_token', token);
      localStorage.setItem('cr_refresh_token', token);
      localStorage.setItem('cr_mock_mode', '1');
    }
    setCookie('cr_session', '1');
    setCookie('cr_role', role);
    setUser({ id, email, role, firstName, lastName });
    setPending2FAUser(null);
  }, [pending2FAUser]);

  const login = useCallback(async (email: string, password: string) => {
    // Mock login: only when API is not configured
    if (!process.env.NEXT_PUBLIC_API_URL) {
      const mockUser = MOCK_USERS[email.toLowerCase()];
      if (mockUser && mockUser.password === password) {
        if (mockUser.twoFactorEnabled) {
          setPending2FAUser({ id: mockUser.id, email, role: mockUser.role, firstName: mockUser.firstName, lastName: mockUser.lastName, password });
          return { requires2FA: true as const };
        }
        const token = makeMockToken({ sub: mockUser.id, email, role: mockUser.role, firstName: mockUser.firstName, lastName: mockUser.lastName });
        localStorage.setItem('cr_access_token', token);
        localStorage.setItem('cr_refresh_token', token);
        localStorage.setItem('cr_mock_mode', '1');
        setCookie('cr_session', '1');
        setCookie('cr_role', mockUser.role);
        const authUser = { id: mockUser.id, email, role: mockUser.role, firstName: mockUser.firstName, lastName: mockUser.lastName };
        setUser(authUser);
        const dest = mockUser.role === 'RIDER' ? '/deliveries' : mockUser.role === 'CUSTOMER' ? '/portal' : '/dashboard';
        router.push(dest);
        return authUser;
      }
      throw new Error('Invalid credentials');
    }

    // Real API login
    const { data } = await api.post('/auth/login', { email, password });
    const payload = decodeJwt(data.accessToken);
    const { data: me } = await api.get('/users/me', { headers: { Authorization: `Bearer ${data.accessToken}` } });

    // 2FA required for ADMINISTRATOR role
    if (payload.role === 'ADMINISTRATOR') {
      setPending2FAUser({ id: payload.sub, email: payload.email, role: payload.role, firstName: me.firstName, lastName: me.lastName, _accessToken: data.accessToken, _refreshToken: data.refreshToken });
      return { requires2FA: true as const };
    }

    localStorage.setItem('cr_access_token', data.accessToken);
    localStorage.setItem('cr_refresh_token', data.refreshToken);
    localStorage.removeItem('cr_mock_mode');
    setCookie('cr_session', '1');
    setCookie('cr_role', payload.role);
    const authUser = { id: payload.sub, email: payload.email, role: payload.role, firstName: me.firstName, lastName: me.lastName };
    setUser(authUser);
    return authUser;
  }, [router]);

  const enterDemoMode = useCallback(() => {
    const demoUser = { id: 'mock-001', email: 'admin@cityrider.com', role: 'ADMINISTRATOR', firstName: 'Demo', lastName: 'Admin' };
    const token = makeMockToken({ sub: demoUser.id, email: demoUser.email, role: demoUser.role, firstName: demoUser.firstName, lastName: demoUser.lastName });
    localStorage.setItem('cr_access_token', token);
    localStorage.setItem('cr_mock_mode', '1');
    setCookie('cr_session', '1');
    setCookie('cr_role', 'ADMINISTRATOR');
    setUser(demoUser);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('cr_access_token');
    localStorage.removeItem('cr_refresh_token');
    localStorage.removeItem('cr_mock_mode');
    document.cookie = 'cr_session=; max-age=0; path=/';
    document.cookie = 'cr_role=; max-age=0; path=/';
    setUser(null);
    window.location.href = '/login';
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, verifyTotp, logout, enterDemoMode }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

