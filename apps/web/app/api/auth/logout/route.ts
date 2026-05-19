import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { RefreshToken } from '@/models/RefreshToken';
import { hashRefreshToken } from '@/lib/auth';
import { REFRESH_COOKIE, clearAuthCookies } from '@/lib/cookies';
import { ok, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const fromCookie = req.cookies.get(REFRESH_COOKIE)?.value;
    let fromBody: string | undefined;
    try {
      const body = await req.json();
      fromBody = body?.refreshToken;
    } catch {
      // ignore
    }
    const raw = fromBody || fromCookie;

    if (raw) {
      await connectMongo();
      await RefreshToken.updateOne(
        { tokenHash: hashRefreshToken(raw) },
        { $set: { revokedAt: new Date() } },
      );
    }

    const res = ok({ ok: true });
    clearAuthCookies(res);
    return res;
  } catch (err) {
    return failFromError(err);
  }
}
