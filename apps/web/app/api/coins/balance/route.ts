import { type NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import { getCoinState } from '@/lib/coin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);
    const state = await getCoinState(user.userId);
    if (!state) return fail('NOT_FOUND', 'Kullanıcı bulunamadı', 404);
    return ok(state);
  } catch (err) {
    return failFromError(err);
  }
}
