import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken, type AccessTokenPayload } from './auth';
import { ACCESS_COOKIE } from './cookies';

/**
 * API route handler'larda kullan: önce Bearer header (mobil), yoksa cookie (web) bakar.
 */
export async function getUserFromRequest(
  req: NextRequest,
): Promise<AccessTokenPayload | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) return payload;
    }
  }
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (cookie) return verifyAccessToken(cookie);
  return null;
}

/**
 * Server components/pages için (App Router): sadece cookie bakar.
 */
export async function getUserFromCookies(): Promise<AccessTokenPayload | null> {
  const c = await cookies();
  const token = c.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
