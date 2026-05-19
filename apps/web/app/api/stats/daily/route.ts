import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { Meal, serializeMeal } from '@/models/Meal';
import { Activity, serializeActivity } from '@/models/Activity';
import { WeightEntry } from '@/models/WeightEntry';
import { WaterEntry } from '@/models/WaterEntry';
import { User } from '@/models/User';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import {
  calculateBMR,
  calculateTDEE,
  suggestedDailyKcal,
  ageFromBirthDate,
  todayLocalDate,
  DEFAULT_TIMEZONE,
} from '@yemek-takip/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const user = await User.findById(auth.userId).lean();
    if (!user) return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 401);

    const { searchParams } = new URL(req.url);
    const date =
      searchParams.get('date') ??
      todayLocalDate((user.profile?.timezone as string) ?? DEFAULT_TIMEZONE);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail('VALIDATION', 'date YYYY-MM-DD formatında olmalı', 400);
    }

    const [meals, activities, waterEntries, lastWeight, dayWeight] = await Promise.all([
      Meal.find({ userId: auth.userId, localDate: date }).sort({ consumedAt: -1 }),
      Activity.find({ userId: auth.userId, localDate: date }).sort({ performedAt: -1 }),
      WaterEntry.find({ userId: auth.userId, localDate: date }),
      WeightEntry.findOne({ userId: auth.userId }).sort({ date: -1 }).lean(),
      WeightEntry.findOne({ userId: auth.userId, date }).lean(),
    ]);

    const kcalIn = meals.reduce((s, m) => s + (m.totalKcal || 0), 0);
    const kcalOut = activities.reduce(
      (s, a) => s + (a.totalKcalBurned || 0),
      0,
    );
    const waterMl = waterEntries.reduce((s, w) => s + (w.amountMl || 0), 0);

    // BMR / TDEE
    const heightCm = user.profile?.heightCm;
    const sex = user.profile?.sex as 'male' | 'female' | 'other' | undefined;
    const birthDate = user.profile?.birthDate;
    const activityLevel =
      (user.profile?.activityLevel as
        | 'sedentary'
        | 'light'
        | 'moderate'
        | 'active'
        | undefined) ?? 'sedentary';
    const weightForBmr = (dayWeight?.weightKg as number | undefined) ?? (lastWeight?.weightKg as number | undefined);

    let bmr: number | null = null;
    let tdee: number | null = null;
    if (heightCm && sex && birthDate && weightForBmr) {
      bmr = calculateBMR({
        weightKg: weightForBmr,
        heightCm,
        ageYears: ageFromBirthDate(birthDate),
        sex,
      });
      tdee = calculateTDEE(bmr, activityLevel);
    }

    const target =
      user.profile?.targetDailyKcal ?? (tdee ? suggestedDailyKcal(tdee) : null);

    return ok({
      date,
      kcalIn,
      kcalOut,
      net: kcalIn - kcalOut,
      target,
      bmr,
      tdee,
      meals: meals.map((m: any) => serializeMeal(m)),
      activities: activities.map((a: any) => serializeActivity(a)),
      waterMl,
      waterGoalMl: user.profile?.waterGoalMl ?? 2500,
      weightKg: (dayWeight?.weightKg as number | undefined) ?? null,
    });
  } catch (err) {
    return failFromError(err);
  }
}
