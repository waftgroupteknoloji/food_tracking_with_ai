// ödematik SDK v0.14+ mount. Plan'lar burada — kod'dan tanımlanır
// (dashboard'a girilmesine gerek yok). SDK arka planda:
//   • period: 'one_time'           → /charge  (tek seferlik ödeme)
//   • period: 'monthly' | 'yearly' → /subscribe (kart token saklar, otomatik
//                                      yenileme, iptal SDK komponentinde)
import { createOdematikHandler, type OdematikPlan } from '@odematik/billing/next';
import type { NextRequest } from 'next/server';
import {
  COIN_PACKAGES,
  SUBSCRIPTION_PLANS,
  type CoinPackageId,
  type SubscriptionPlanId,
} from '@yemek-takip/validators';
import { applySubscription, purchasePackage } from '@/lib/coin-service';
import { getUserFromRequest } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Plan kataloğu — id (planId) → OdematikPlan.
// priceTRY KDV DAHİL son fiyat. SDK'ya KDV hariç gönderiyoruz çünkü
// backend item üzerine KDV'yi tekrar ekliyor; böylece kullanıcının
// gördüğü toplam = priceTRY.
const VAT_RATE = 20 as const;
const preVat = (priceTRY: number) =>
  Math.round((priceTRY / (1 + VAT_RATE / 100)) * 100) / 100;

const plans: Record<string, OdematikPlan> = {
  // ─── Coin paketleri — one_time ──────────────────────────────────────────
  ...Object.fromEntries(
    COIN_PACKAGES.map((p) => [
      p.id,
      {
        name:           p.label,
        amount:         preVat(p.priceTRY),  // KDV hariç — backend KDV ekler
        display_amount: p.priceTRY,           // KDV dahil — modal kullanıcıya bunu gösterir
        currency: 'TRY',
        period:   'one_time',
        vat_rate: VAT_RATE,
        // onPaid'e olduğu gibi gelir — purchasePackage için packageId.
        metadata: { kind: 'coin_package', packageId: p.id, coins: p.coins },
      } satisfies OdematikPlan,
    ]),
  ),
  // ─── Abonelikler — monthly / yearly ─────────────────────────────────────
  // period field'ı sayesinde SDK otomatik /subscribe'a yönlendirir,
  // subscription kaydı oluşur, ay/yıl sonu otomatik tahsilat yapılır.
  ...Object.fromEntries(
    SUBSCRIPTION_PLANS.map((p) => [
      p.id,
      {
        name:           p.label,
        amount:         preVat(p.priceTRY),  // KDV hariç — backend KDV ekler
        display_amount: p.priceTRY,           // KDV dahil — modal kullanıcıya bunu gösterir
        currency: 'TRY',
        period:   p.id,  // 'monthly' veya 'yearly'
        vat_rate: VAT_RATE,
        metadata: { kind: 'subscription', planId: p.id, durationDays: p.durationDays },
      } satisfies OdematikPlan,
    ]),
  ),
};

export const { GET, POST } = createOdematikHandler({
  plans,
  // Her /checkout, /verify, /billing, /subscriptions, /subscriptions/:id/cancel
  // çağrısında session'dan kullanıcıyı çekiyoruz. customerId döndürmek
  // saved billing + subscription list/cancel için ŞART.
  authenticate: async (req) => {
    const payload = await getUserFromRequest(req as NextRequest);
    if (!payload) return null;
    return { customerId: payload.userId };
  },
  // Ödeme doğrulandıktan sonra çalışır. SDK iki kere çağırabilir (browser
  // /verify + webhook), bu yüzden idempotent. purchasePackage ve
  // applySubscription kendi içlerinde duplicate-detection yapıyor.
  onPaid: async ({ plan, customer }) => {
    if (!customer.id) throw new Error('customer.id missing from payment');

    const meta = plan.metadata as
      | { kind: 'coin_package'; packageId: CoinPackageId }
      | { kind: 'subscription'; planId: SubscriptionPlanId }
      | undefined;

    if (meta?.kind === 'subscription') {
      await applySubscription(customer.id, meta.planId);
    } else if (meta?.kind === 'coin_package') {
      await purchasePackage(customer.id, meta.packageId);
    } else {
      // Fallback — eski webhook payload'ı plan metadata'sı olmadan gelirse
      // period'a bakarak ayırt et. Edge case için savunma.
      if (plan.period === 'monthly' || plan.period === 'yearly') {
        await applySubscription(customer.id, plan.period);
      }
    }
  },
});
