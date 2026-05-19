import { type NextRequest } from 'next/server';
import { CreateWeightInputSchema, WeightPeriodSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { WeightEntry, serializeWeightEntry } from '@/models/WeightEntry';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { bumpStreak } from '@/lib/streak';
import { ok, fail, failFromError } from '@/lib/api-response';
import { addDaysToLocal, todayLocalDate } from '@yemek-takip/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = CreateWeightInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const updated = await WeightEntry.findOneAndUpdate(
      { userId: auth.userId, date: parsed.data.date },
      {
        $set: {
          weightKg: parsed.data.weightKg,
          photoUrl: parsed.data.photoUrl ?? null,
          photoKey: parsed.data.photoKey ?? null,
          note: parsed.data.note,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (!updated) return fail('INTERNAL', 'Kayıt oluşturulamadı', 500);

    await bumpStreak(auth.userId, parsed.data.date);

    return ok(serializeWeightEntry(updated));
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
    const period = WeightPeriodSchema.parse(searchParams.get('period') ?? 'month');

    const today = todayLocalDate();
    let fromDate: string | null = null;
    if (period === 'week') fromDate = addDaysToLocal(today, -7);
    else if (period === 'month') fromDate = addDaysToLocal(today, -31);
    else if (period === 'year') fromDate = addDaysToLocal(today, -365);

    const filter: Record<string, unknown> = { userId: auth.userId };
    if (fromDate) filter.date = { $gte: fromDate };

    const entries = await WeightEntry.find(filter).sort({ date: 1 }).lean();
    return ok(entries.map((e: any) => serializeWeightEntry(e)));
  } catch (err) {
    return failFromError(err);
  }
}
