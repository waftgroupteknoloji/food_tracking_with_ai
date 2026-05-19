import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { WeightEntry } from '@/models/WeightEntry';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { deleteObject } from '@/lib/s3';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const removed = await WeightEntry.findOneAndDelete({ _id: id, userId: auth.userId });
    if (!removed) return fail('NOT_FOUND', 'Kayıt bulunamadı', 404);

    if (removed.photoKey) await deleteObject(removed.photoKey);
    return ok({ ok: true } as const);
  } catch (err) {
    return failFromError(err);
  }
}
