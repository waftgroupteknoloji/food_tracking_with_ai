import { type NextRequest } from 'next/server';
import { PurchaseRequestSchema } from '@yemek-takip/validators';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import { purchasePackage, getCoinState } from '@/lib/coin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = PurchaseRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz paket', 400, parsed.error.flatten());
    }

    // TODO: gerçek ödeme entegrasyonu (Iyzico). Şimdilik anında completed.
    const result = await purchasePackage(user.userId, parsed.data.packageId);
    const state = await getCoinState(user.userId);
    return ok({
      package: result.package,
      orderId: String(result.order._id),
      coins: state?.coins ?? result.coins,
      subscription: state?.subscription ?? null,
      hasActiveSubscription: state?.hasActiveSubscription ?? false,
    });
  } catch (err) {
    return failFromError(err);
  }
}
