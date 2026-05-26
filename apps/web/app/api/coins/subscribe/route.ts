import { type NextRequest } from 'next/server';
import { SubscribeRequestSchema } from '@yemek-takip/validators';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import { applySubscription, getCoinState } from '@/lib/coin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = SubscribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz plan', 400, parsed.error.flatten());
    }

    // TODO: gerçek ödeme entegrasyonu (Iyzico recurring veya tek seferlik).
    const result = await applySubscription(user.userId, parsed.data.planId);
    const state = await getCoinState(user.userId);
    return ok({
      plan: result.plan,
      orderId: String(result.order._id),
      expiresAt: result.expiresAt.toISOString(),
      coins: state?.coins ?? 0,
      subscription: state?.subscription ?? null,
      hasActiveSubscription: state?.hasActiveSubscription ?? false,
    });
  } catch (err) {
    return failFromError(err);
  }
}
