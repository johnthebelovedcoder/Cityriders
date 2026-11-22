import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/track'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/_next') || pathname === '/') {
    return NextResponse.next();
  }

  const session = request.cookies.get('cr_session')?.value;
  const role = request.cookies.get('cr_role')?.value;

  // Not authenticated → redirect to login
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Rider trying to access staff portal
  if (role === 'RIDER' && pathname.startsWith('/dashboard') || role === 'RIDER' && !pathname.startsWith('/deliveries') && !pathname.startsWith('/track')) {
    return NextResponse.redirect(new URL('/deliveries', request.url));
  }

  // Staff trying to access rider portal
  if (role && role !== 'RIDER' && pathname.startsWith('/deliveries')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
