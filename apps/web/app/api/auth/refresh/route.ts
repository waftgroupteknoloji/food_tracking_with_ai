import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { RefreshToken } from '@/models/RefreshToken';
import { User } from '@/models/User';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '@/lib/auth';
import { REFRESH_COOKIE, setAuthCookies } from '@/lib/cookies';
import { ok, fail, failFromError } from '@/lib/api-response';

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
    if (!raw) {
      return fail('NO_REFRESH', 'Refresh token gerekli', 401);
    }

    await connectMongo();
    const hash = hashRefreshToken(raw);
    const existing = await RefreshToken.findOne({ tokenHash: hash });
    if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
      return fail('INVALID_REFRESH', 'Refresh token geçersiz', 401);
    }

    const user = await User.findById(existing.userId).lean();
    if (!user) {
      return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 401);
    }

    // Rotate: eski revoke, yeni oluştur
    existing.revokedAt = new Date();
    await existing.save();

    const newRefresh = generateRefreshToken();
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newRefresh.hash,
      expiresAt: newRefresh.expiresAt,
    });

    const accessToken = await signAccessToken({
      userId: String(user._id),
      email: user.email,
    });

    const res = ok({ accessToken, refreshToken: newRefresh.raw });
    setAuthCookies(res, { accessToken, refreshToken: newRefresh.raw });
    return res;
  } catch (err) {
    return failFromError(err);
  }
}
