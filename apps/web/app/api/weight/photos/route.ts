import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { WeightEntry, serializeWeightEntry } from '@/models/WeightEntry';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const entries = await WeightEntry.find({
      userId: auth.userId,
      photoUrl: { $ne: null },
    })
      .sort({ date: 1 })
      .lean();
    return ok(entries.map((e: any) => serializeWeightEntry(e)));
  } catch (err) {
    return failFromError(err);
  }
}
