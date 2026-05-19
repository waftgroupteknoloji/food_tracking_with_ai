import type { NextResponse } from 'next/server';
import { ACCESS_TOKEN_TTL } from './jwt-edge';

export const ACCESS_COOKIE = 'yt_access';
export const REFRESH_COOKIE = 'yt_refresh';

const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 gün

export interface SetTokensCookieOptions {
  accessToken: string;
  refreshToken: string;
}

export function setAuthCookies(res: NextResponse, opts: SetTokensCookieOptions) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;

  res.cookies.set(ACCESS_COOKIE, opts.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL,
    ...(domain ? { domain } : {}),
  });
  res.cookies.set(REFRESH_COOKIE, opts.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL,
    ...(domain ? { domain } : {}),
  });
}

export function clearAuthCookies(res: NextResponse) {
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
  res.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    path: '/api/auth',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}
