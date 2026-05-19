import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ActivityItemSchema } from '@yemek-takip/validators';
import { connectMongo } from '@/lib/mongoose';
import { Activity, serializeActivity } from '@/models/Activity';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  items: z.array(ActivityItemSchema).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);
    await connectMongo();
    const activity = await Activity.findOne({ _id: id, userId: auth.userId });
    if (!activity) return fail('NOT_FOUND', 'Aktivite bulunamadı', 404);
    return ok(serializeActivity(activity));
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
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    await connectMongo();
    const activity = await Activity.findOne({ _id: id, userId: auth.userId });
    if (!activity) return fail('NOT_FOUND', 'Aktivite bulunamadı', 404);

    if (parsed.data.items !== undefined) {
      activity.items = parsed.data.items.map((it) => ({
        name: it.name.trim(),
        durationMin: it.durationMin,
        intensity: it.intensity,
        metValue: it.metValue,
        kcalBurned: Math.round(it.kcalBurned),
        isEdited: it.isEdited ?? true,
        isAdded: it.isAdded ?? false,
      })) as any;
    }

    await activity.save();
    return ok(serializeActivity(activity));
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
    const deleted = await Activity.findOneAndDelete({ _id: id, userId: auth.userId });
    if (!deleted) return fail('NOT_FOUND', 'Aktivite bulunamadı', 404);
    return ok({ ok: true } as const);
  } catch (err) {
    return failFromError(err);
  }
}
