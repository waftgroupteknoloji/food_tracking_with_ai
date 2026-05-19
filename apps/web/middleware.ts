import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt-edge';
import { ACCESS_COOKIE } from '@/lib/cookies';

const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/history', '/weight', '/add', '/settings', '/meal', '/activity'];
const AUTH_PAGES = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.delete('next');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/history/:path*',
    '/weight/:path*',
    '/add/:path*',
    '/settings/:path*',
    '/meal/:path*',
    '/activity/:path*',
    '/login',
    '/register',
  ],
};
