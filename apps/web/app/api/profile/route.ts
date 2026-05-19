import { type NextRequest } from 'next/server';
import { UpdateProfileInputSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { User, toPublicUser } from '@/models/User';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = UpdateProfileInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const user = await User.findById(auth.userId);
    if (!user) return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 404);

    if (parsed.data.displayName !== undefined) {
      user.displayName = parsed.data.displayName;
    }
    user.profile = {
      heightCm: parsed.data.heightCm ?? user.profile?.heightCm,
      birthDate: parsed.data.birthDate ?? user.profile?.birthDate,
      sex: parsed.data.sex ?? user.profile?.sex,
      goalWeightKg: parsed.data.goalWeightKg ?? user.profile?.goalWeightKg,
      activityLevel: parsed.data.activityLevel ?? user.profile?.activityLevel,
      targetDailyKcal: parsed.data.targetDailyKcal ?? user.profile?.targetDailyKcal,
      waterGoalMl: parsed.data.waterGoalMl ?? user.profile?.waterGoalMl ?? 2500,
      timezone: parsed.data.timezone ?? user.profile?.timezone ?? 'Europe/Istanbul',
    } as any;

    await user.save();
    return ok(toPublicUser(user));
  } catch (err) {
    return failFromError(err);
  }
}
