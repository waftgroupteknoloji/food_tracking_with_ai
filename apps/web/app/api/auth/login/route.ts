import { type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { LoginInputSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { User, toPublicUser } from '@/models/User';
import { RefreshToken } from '@/models/RefreshToken';
import { generateRefreshToken, signAccessToken } from '@/lib/auth';
import { setAuthCookies } from '@/lib/cookies';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LoginInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const user = await User.findOne({ email: parsed.data.email });
    if (!user) {
      return fail('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı', 401);
    }
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return fail('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı', 401);
    }

    const accessToken = await signAccessToken({
      userId: String(user._id),
      email: user.email,
    });
    const refresh = generateRefreshToken();
    await RefreshToken.create({
      userId: user._id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    });

    const res = ok({
      user: toPublicUser(user),
      accessToken,
      refreshToken: refresh.raw,
    });
    setAuthCookies(res, { accessToken, refreshToken: refresh.raw });
    return res;
  } catch (err) {
    return failFromError(err);
  }
}
