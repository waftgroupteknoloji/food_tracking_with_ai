import { type NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import { getTransactionHistory } from '@/lib/coin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
    const beforeRaw = url.searchParams.get('before');
    const before = beforeRaw ? new Date(beforeRaw) : undefined;
    const result = await getTransactionHistory(user.userId, limit, before);
    return ok(result);
  } catch (err) {
    return failFromError(err);
  }
}
