import { createOdematikHandler } from '@odematik/billing/next';
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

// Build the ödematik product catalog from our existing validator constants.
// Plan ids get a `plan_` prefix to distinguish them from coin package ids.
//
// IMPORTANT: priceTRY in the catalog is the FINAL price shown to the user
// (VAT-inclusive). The ödematik backend computes `unit_price + VAT` from
// what we send, so we forward the pre-VAT amount and let backend re-add it.
// This keeps the total the user pays equal to priceTRY.
const VAT_RATE = 20 as const;
const preVat = (priceTRY: number) =>
  Math.round((priceTRY / (1 + VAT_RATE / 100)) * 100) / 100; // 2-decimal precision

const products = Object.fromEntries([
  ...COIN_PACKAGES.map(
    (p) => [
      p.id,
      { amount: preVat(p.priceTRY), currency: 'TRY' as const, name: p.label, vat_rate: VAT_RATE },
    ] as const,
  ),
  ...SUBSCRIPTION_PLANS.map(
    (p) =>
      [
        `plan_${p.id}`,
        {
          amount: preVat(p.priceTRY),
          currency: 'TRY' as const,
          name: p.label,
          vat_rate: VAT_RATE,
          // Real subscription: routes to backend's /subscribe endpoint and
          // creates a subscription record (auto-renewal, dashboard visibility,
          // customer portal). Requires matching product+plan slugs in the
          // ödematik dashboard.
          kind: 'subscription' as const,
          product: 'yemek-takip',
          plan: p.id, // 'monthly' or 'yearly'
          billing_cycle: p.id === 'yearly' ? ('yearly' as const) : ('monthly' as const),
        },
      ] as const,
  ),
]);

export const { GET, POST } = createOdematikHandler({
  products,
  // Bind every /checkout and /verify call to the signed-in user, and
  // surface the MongoDB user id so the SDK's GET /billing route knows
  // whose saved fatura bilgisi to fetch. Returning null → 401 (the
  // anonymous user has no checkout session to create).
  authenticate: async (req) => {
    const payload = await getUserFromRequest(req as NextRequest);
    if (!payload) return null;
    return { customerId: payload.userId };
  },
  onPaid: async ({ productId, customer }) => {
    if (!customer.id) throw new Error('customer.id missing from payment');

    if (productId.startsWith('plan_')) {
      const planId = productId.slice('plan_'.length) as SubscriptionPlanId;
      await applySubscription(customer.id, planId);
    } else {
      await purchasePackage(customer.id, productId as CoinPackageId);
    }
  },
});
