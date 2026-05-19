import { type NextRequest } from 'next/server';
import { UpdateMealInputSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { Meal, serializeMeal } from '@/models/Meal';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { deleteObject } from '@/lib/s3';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ITEM_KCAL_CAP = 3000;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const meal = await Meal.findOne({ _id: id, userId: auth.userId });
    if (!meal) return fail('NOT_FOUND', 'Yemek bulunamadı', 404);
    return ok(serializeMeal(meal));
  } catch (err) {
    return failFromError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = UpdateMealInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const meal = await Meal.findOne({ _id: id, userId: auth.userId });
    if (!meal) return fail('NOT_FOUND', 'Yemek bulunamadı', 404);

    if (parsed.data.mealType !== undefined) meal.mealType = parsed.data.mealType;
    if (parsed.data.userNote !== undefined) meal.userNote = parsed.data.userNote;
    if (parsed.data.items !== undefined) {
      const sanitized = parsed.data.items
        .filter((it) => it.kcal >= 0 && it.kcal <= ITEM_KCAL_CAP)
        .map((it) => ({
          name: it.name.trim(),
          quantity: it.quantity ?? 1,
          unit: it.unit ?? 'porsiyon',
          grams: it.grams,
          kcal: Math.round(it.kcal),
          macros: it.macros,
          isEdited: it.isEdited ?? true,
          isAdded: it.isAdded ?? false,
        }));
      meal.items = sanitized as any;
    }

    await meal.save();
    return ok(serializeMeal(meal));
  } catch (err) {
    return failFromError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const meal = await Meal.findOneAndDelete({ _id: id, userId: auth.userId });
    if (!meal) return fail('NOT_FOUND', 'Yemek bulunamadı', 404);

    if (meal.photoKey) {
      await deleteObject(meal.photoKey);
    }
    return ok({ ok: true } as const);
  } catch (err) {
    return failFromError(err);
  }
}
