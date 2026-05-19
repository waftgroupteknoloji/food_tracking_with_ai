import { type NextRequest } from 'next/server';
import { CreateActivityInputSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { Activity, serializeActivity } from '@/models/Activity';
import { User } from '@/models/User';
import { WeightEntry } from '@/models/WeightEntry';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { getAi, isAiConfigured } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
import { bumpStreak } from '@/lib/streak';
import { ok, fail, failFromError } from '@/lib/api-response';
import { toLocalDate, DEFAULT_TIMEZONE, calculateKcalBurned } from '@yemek-takip/utils';
import { ACTIVITY_PROMPT_VERSION, MODEL_VERSION } from '@yemek-takip/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const KCAL_PER_HOUR_CAP = 1500; // 1 saatte max — sanity check

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = CreateActivityInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    const limit = rateLimit(`activity:${auth.userId}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail('RATE_LIMIT', 'Saatlik aktivite limitine ulaşıldı', 429);
    }

    await connectMongo();
    const user = await User.findById(auth.userId);
    if (!user) return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 401);

    // Kullanıcının son kilosunu al, AI'ya ver
    const lastWeight = await WeightEntry.findOne({ userId: user._id })
      .sort({ date: -1 })
      .lean();
    const weightKg = (lastWeight?.weightKg as number | undefined) ?? 70;

    const timezone = user.profile?.timezone ?? DEFAULT_TIMEZONE;
    const performedAt = parsed.data.performedAt
      ? new Date(parsed.data.performedAt)
      : new Date();
    const localDate = toLocalDate(performedAt, timezone);

    const aiResult = isAiConfigured()
      ? await getAi().analyzeActivity({ text: parsed.data.inputText, weightKg })
      : {
          analysis: { items: [] },
          rawJson: null,
          promptVersion: ACTIVITY_PROMPT_VERSION,
          error: 'AI configured edilmedi — manuel item ekle',
        };

    // Items + sanity check (formül ile karşılaştır)
    const items = aiResult.analysis.items.map((it) => {
      const formulaKcal = calculateKcalBurned(it.met_value, weightKg, it.duration_min);
      // AI değeri formüle göre >%20 sapıyorsa formülü kullan
      let kcalBurned = it.kcal_burned;
      if (formulaKcal > 0 && Math.abs(kcalBurned - formulaKcal) / formulaKcal > 0.2) {
        kcalBurned = formulaKcal;
      }
      // Cap
      const hourlyCap = (KCAL_PER_HOUR_CAP * it.duration_min) / 60;
      kcalBurned = Math.min(kcalBurned, hourlyCap);
      return {
        name: it.name?.trim() || 'Aktivite',
        durationMin: it.duration_min,
        intensity: it.intensity,
        metValue: it.met_value,
        kcalBurned: Math.round(kcalBurned),
        isEdited: false,
        isAdded: false,
      };
    });

    const created = await Activity.create({
      userId: user._id,
      performedAt,
      localDate,
      inputText: parsed.data.inputText,
      aiAnalysis: {
        model: MODEL_VERSION,
        rawJson: aiResult.rawJson,
        analyzedAt: new Date(),
        promptVersion: aiResult.promptVersion,
        error: aiResult.error,
      },
      items,
    });

    await bumpStreak(auth.userId, localDate);
    return ok(serializeActivity(created));
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
    const date = searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail('VALIDATION', 'date YYYY-MM-DD formatında olmalı', 400);
    }
    const items = await Activity.find({ userId: auth.userId, localDate: date })
      .sort({ performedAt: -1 })
      .lean({ getters: true });
    return ok(items.map((a: any) => serializeActivity(a)));
  } catch (err) {
    return failFromError(err);
  }
}
