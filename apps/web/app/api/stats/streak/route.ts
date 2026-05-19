import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { User } from '@/models/User';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import { effectiveStreak, todayLocalDate, DEFAULT_TIMEZONE } from '@yemek-takip/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);
    await connectMongo();
    const user = await User.findById(auth.userId).lean();
    if (!user) return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 401);

    const state = {
      current: (user.streak?.current as number | undefined) ?? 0,
      longest: (user.streak?.longest as number | undefined) ?? 0,
      lastLogDate: (user.streak?.lastLogDate as string | null | undefined) ?? null,
    };
    const today = todayLocalDate(user.profile?.timezone ?? DEFAULT_TIMEZONE);
    const current = effectiveStreak(state, today);

    return ok({ current, longest: state.longest, lastLogDate: state.lastLogDate });
  } catch (err) {
    return failFromError(err);
  }
}
