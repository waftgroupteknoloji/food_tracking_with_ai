import { type NextRequest } from 'next/server';
import { CreateMealInputSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { Meal, serializeMeal } from '@/models/Meal';
import { User } from '@/models/User';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { getAi, isAiConfigured } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
import { bumpStreak } from '@/lib/streak';
import { ok, fail, failFromError } from '@/lib/api-response';
import { toLocalDate, DEFAULT_TIMEZONE } from '@yemek-takip/utils';
import { MEAL_PROMPT_VERSION, MEAL_TEXT_PROMPT_VERSION, MODEL_VERSION } from '@yemek-takip/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ITEM_KCAL_CAP = 3000;

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = CreateMealInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    const limit = rateLimit(`meal:${auth.userId}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail('RATE_LIMIT', 'Saatlik yemek ekleme limitine ulaşıldı', 429);
    }

    await connectMongo();
    const user = await User.findById(auth.userId);
    if (!user) return fail('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 401);

    const timezone = user.profile?.timezone ?? DEFAULT_TIMEZONE;
    const consumedAt = parsed.data.consumedAt
      ? new Date(parsed.data.consumedAt)
      : new Date();
    const localDate = toLocalDate(consumedAt, timezone);

    const isTextInput = !parsed.data.photoUrl && !!parsed.data.inputText;
    const fallbackPromptVersion = isTextInput ? MEAL_TEXT_PROMPT_VERSION : MEAL_PROMPT_VERSION;

    const aiResult = isAiConfigured()
      ? isTextInput
        ? await getAi().analyzeMealText({ text: parsed.data.inputText! })
        : await getAi().analyzeMeal({ imageUrl: parsed.data.photoUrl! })
      : {
          analysis: { items: [] },
          rawJson: null,
          promptVersion: fallbackPromptVersion,
          error: 'AI configured edilmedi — manuel item ekle',
        };

    // Items'ı normalize et + sanity cap
    const items = aiResult.analysis.items
      .filter((it) => it && it.kcal >= 0 && it.kcal <= ITEM_KCAL_CAP)
      .map((it) => ({
        name: it.name?.trim() || 'Bilinmeyen',
        quantity: 1,
        unit: 'porsiyon',
        grams: it.estimated_grams,
        kcal: Math.round(it.kcal),
        macros: {
          protein: it.protein_g,
          carbs: it.carbs_g,
          fat: it.fat_g,
        },
        isEdited: false,
        isAdded: false,
      }));

    const created = await Meal.create({
      userId: user._id,
      consumedAt,
      localDate,
      mealType: parsed.data.mealType,
      photoUrl: parsed.data.photoUrl,
      photoKey: parsed.data.photoKey,
      inputText: parsed.data.inputText,
      source: isTextInput ? 'text' : 'photo',
      aiAnalysis: {
        model: MODEL_VERSION,
        rawJson: aiResult.rawJson,
        confidence:
          'overall_confidence' in aiResult.analysis
            ? aiResult.analysis.overall_confidence
            : undefined,
        analyzedAt: new Date(),
        promptVersion: aiResult.promptVersion,
        error: aiResult.error,
      },
      items,
    });

    await bumpStreak(auth.userId, localDate);

    return ok(serializeMeal(created));
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
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit') || 30), 60);

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return fail('VALIDATION', 'date YYYY-MM-DD formatında olmalı', 400);
      }
      const meals = await Meal.find({
        userId: auth.userId,
        localDate: date,
      })
        .sort({ consumedAt: -1 })
        .lean({ getters: true });
      return ok(meals.map((m: any) => serializeMeal(m as any)));
    }

    const filter: Record<string, unknown> = { userId: auth.userId };
    if (cursor) filter._id = { $lt: cursor };

    const items = await Meal.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean({ getters: true });

    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;
    const last = slice[slice.length - 1];
    const nextCursor = hasMore && last ? String(last._id) : null;

    return ok({
      items: slice.map((m: any) => serializeMeal(m as any)),
      nextCursor,
    });
  } catch (err) {
    return failFromError(err);
  }
}
