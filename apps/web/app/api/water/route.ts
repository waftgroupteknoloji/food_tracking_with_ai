import { type NextRequest } from 'next/server';
import { CreateWaterInputSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { WaterEntry, serializeWaterEntry } from '@/models/WaterEntry';
import { User } from '@/models/User';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { bumpStreak } from '@/lib/streak';
import { ok, fail, failFromError } from '@/lib/api-response';
import { toLocalDate, DEFAULT_TIMEZONE, todayLocalDate } from '@yemek-takip/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = CreateWaterInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const user = await User.findById(auth.userId);
    if (!user) return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 401);

    const now = new Date();
    const localDate = toLocalDate(now, user.profile?.timezone ?? DEFAULT_TIMEZONE);

    const created = await WaterEntry.create({
      userId: user._id,
      localDate,
      amountMl: parsed.data.amountMl,
      loggedAt: now,
    });

    await bumpStreak(auth.userId, localDate);
    return ok(serializeWaterEntry(created));
  } catch (err) {
    return failFromError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? todayLocalDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail('VALIDATION', 'date YYYY-MM-DD formatında olmalı', 400);
    }
    const entries = await WaterEntry.find({
      userId: auth.userId,
      localDate: date,
    }).sort({ loggedAt: -1 }).lean();

    const totalMl = entries.reduce(
      (sum, e) => sum + ((e.amountMl as number) || 0),
      0,
    );
    return ok({
      totalMl,
      entries: entries.map((e: any) => serializeWaterEntry(e)),
    });
  } catch (err) {
    return failFromError(err);
  }
}
