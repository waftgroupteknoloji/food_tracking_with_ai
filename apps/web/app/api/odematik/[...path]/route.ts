import { createOdematikHandler } from '@odematik/billing/next';
import {
  COIN_PACKAGES,
  SUBSCRIPTION_PLANS,
  type CoinPackageId,
  type SubscriptionPlanId,
} from '@yemek-takip/validators';
import { applySubscription, purchasePackage } from '@/lib/coin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Build the ödematik product catalog from our existing validator constants.
// Plan ids get a `plan_` prefix to distinguish them from coin package ids.
const products = Object.fromEntries([
  ...COIN_PACKAGES.map(
    (p) => [
      p.id,
      { amount: p.priceTRY, currency: 'TRY' as const, name: p.label, vat_rate: 20 as const },
    ] as const,
  ),
  ...SUBSCRIPTION_PLANS.map(
    (p) =>
      [
        `plan_${p.id}`,
        { amount: p.priceTRY, currency: 'TRY' as const, name: p.label, vat_rate: 20 as const },
      ] as const,
  ),
]);

export const { GET, POST } = createOdematikHandler({
  products,
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
