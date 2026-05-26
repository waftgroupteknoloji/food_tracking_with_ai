import { type NextRequest } from 'next/server';
import { AdRewardRequestSchema } from '@yemek-takip/validators';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';
import { applyAdReward, getCoinState } from '@/lib/coin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    const body = await req.json().catch(() => null);
    const parsed = AdRewardRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz reklam isteği', 400, parsed.error.flatten());
    }

    // TODO: mobil için AdMob SSV imza doğrulaması burada yapılacak (parsed.data.platform === 'mobile').
    const result = await applyAdReward(user.userId, parsed.data.adNonce);
    if (!result.ok) {
      const code =
        result.reason === 'COOLDOWN'
          ? 'AD_COOLDOWN'
          : result.reason === 'DAILY_LIMIT'
            ? 'AD_DAILY_LIMIT'
            : 'AD_DUPLICATE';
      const message =
        result.reason === 'COOLDOWN'
          ? 'Reklamlar arası bekleme süresi var, biraz sonra dene'
          : result.reason === 'DAILY_LIMIT'
            ? 'Günlük reklam ödülü limitine ulaşıldı'
            : 'Bu reklam için ödül daha önce verildi';
      return fail(code, message, 429);
    }

    const state = await getCoinState(user.userId);
    return ok({
      awarded: result.awarded,
      coins: state?.coins ?? result.coins,
      subscription: state?.subscription ?? null,
      hasActiveSubscription: state?.hasActiveSubscription ?? false,
    });
  } catch (err) {
    return failFromError(err);
  }
}
