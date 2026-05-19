import { type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { RegisterInputSchema } from '@yemek-takip/validators';
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
    const parsed = RegisterInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const existing = await User.findOne({ email: parsed.data.email }).lean();
    if (existing) {
      return fail('EMAIL_TAKEN', 'Bu e-posta zaten kayıtlı', 409);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash,
    });

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
