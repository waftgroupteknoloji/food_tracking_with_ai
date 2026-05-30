import { z } from 'zod';
import { ObjectIdSchema } from './common';

export const COIN_COST_PER_ANALYSIS = 1;
export const SIGNUP_BONUS = 15;
export const AD_REWARD = 1;
export const MAX_AD_REWARD_PER_DAY = 30;
export const AD_COOLDOWN_SECONDS = 30;

export const SubscriptionPlanIdSchema = z.enum(['monthly', 'yearly']);
export type SubscriptionPlanId = z.infer<typeof SubscriptionPlanIdSchema>;

export const SubscriptionPlanSchema = z.object({
  id: SubscriptionPlanIdSchema,
  label: z.string(),
  priceTRY: z.number().int().positive(),
  durationDays: z.number().int().positive(),
});
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'monthly', label: 'Aylık Üyelik', priceTRY: 79, durationDays: 30 },
  { id: 'yearly', label: 'Yıllık Üyelik', priceTRY: 399, durationDays: 365 },
];

export const CoinPackageIdSchema = z.enum(['p10', 'p30', 'p50', 'p100']);
export type CoinPackageId = z.infer<typeof CoinPackageIdSchema>;

export const CoinPackageSchema = z.object({
  id: CoinPackageIdSchema,
  label: z.string(),
  coins: z.number().int().positive(),
  priceTRY: z.number().int().positive(),
});
export type CoinPackage = z.infer<typeof CoinPackageSchema>;

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'p10', label: '10 Coin', coins: 10, priceTRY: 10 },
  { id: 'p30', label: '30 Coin', coins: 30, priceTRY: 25 },
  { id: 'p50', label: '50 Coin', coins: 50, priceTRY: 40 },
  { id: 'p100', label: '100 Coin', coins: 100, priceTRY: 70 },
];

export const SubscriptionStateSchema = z.object({
  plan: SubscriptionPlanIdSchema,
  startedAt: z.string().datetime().or(z.date()),
  expiresAt: z.string().datetime().or(z.date()),
});
export type SubscriptionState = z.infer<typeof SubscriptionStateSchema>;

export const CoinBalanceSchema = z.object({
  coins: z.number().int().min(0),
  subscription: SubscriptionStateSchema.nullable(),
  hasActiveSubscription: z.boolean(),
});
export type CoinBalance = z.infer<typeof CoinBalanceSchema>;

export const CoinTransactionTypeSchema = z.enum([
  'signup_bonus',
  'analysis_spend',
  'analysis_refund',
  'ad_reward',
  'purchase',
  'subscription_grant',
  'manual_adjust',
]);
export type CoinTransactionType = z.infer<typeof CoinTransactionTypeSchema>;

export const CoinTransactionMetaSchema = z
  .object({
    mealId: z.string().optional(),
    activityId: z.string().optional(),
    refId: z.string().optional(),
    packageId: CoinPackageIdSchema.optional(),
    planId: SubscriptionPlanIdSchema.optional(),
    adNonce: z.string().optional(),
    reason: z.string().optional(),
    amountTRY: z.number().int().optional(),
  })
  .partial();
export type CoinTransactionMeta = z.infer<typeof CoinTransactionMetaSchema>;

export const CoinTransactionSchema = z.object({
  _id: ObjectIdSchema,
  userId: ObjectIdSchema,
  type: CoinTransactionTypeSchema,
  amount: z.number().int(),
  balanceAfter: z.number().int().min(0),
  meta: CoinTransactionMetaSchema.optional(),
  createdAt: z.string().datetime().or(z.date()),
});
export type CoinTransaction = z.infer<typeof CoinTransactionSchema>;

export const CoinCatalogSchema = z.object({
  packages: z.array(CoinPackageSchema),
  plans: z.array(SubscriptionPlanSchema),
});
export type CoinCatalog = z.infer<typeof CoinCatalogSchema>;

export const PurchaseRequestSchema = z.object({
  packageId: CoinPackageIdSchema,
});
export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>;

export const SubscribeRequestSchema = z.object({
  planId: SubscriptionPlanIdSchema,
});
export type SubscribeRequest = z.infer<typeof SubscribeRequestSchema>;

export const AdPlatformSchema = z.enum(['web', 'mobile']);
export type AdPlatform = z.infer<typeof AdPlatformSchema>;

export const AdRewardRequestSchema = z.object({
  adNonce: z.string().min(8).max(128),
  platform: AdPlatformSchema,
  // SSV imzası ileride buraya: signature: z.string().optional()
});
export type AdRewardRequest = z.infer<typeof AdRewardRequestSchema>;

export const CoinTransactionsResponseSchema = z.object({
  items: z.array(CoinTransactionSchema),
  hasMore: z.boolean(),
});
export type CoinTransactionsResponse = z.infer<typeof CoinTransactionsResponseSchema>;
