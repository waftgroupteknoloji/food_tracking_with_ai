import mongoose from 'mongoose';
import {
  COIN_PACKAGES,
  SUBSCRIPTION_PLANS,
  MAX_AD_REWARD_PER_DAY,
  AD_COOLDOWN_SECONDS,
  AD_REWARD,
  COIN_COST_PER_ANALYSIS,
  type CoinPackageId,
  type CoinTransactionType,
  type CoinTransactionMeta,
  type SubscriptionPlanId,
} from '@yemek-takip/validators';
import { User, hasActiveSubscription } from '../models/User';
import { CoinTransaction, serializeCoinTransaction } from '../models/CoinTransaction';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { connectMongo } from './mongoose';

type UserId = string | mongoose.Types.ObjectId;

function toObjectId(id: UserId): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export async function getCoinState(userId: UserId) {
  await connectMongo();
  const user = await User.findById(toObjectId(userId))
    .select('coins subscription')
    .lean();
  if (!user) return null;
  const active = hasActiveSubscription(user.subscription);
  return {
    coins: user.coins ?? 0,
    subscription:
      user.subscription && user.subscription.plan && user.subscription.expiresAt
        ? {
            plan: user.subscription.plan as SubscriptionPlanId,
            startedAt:
              user.subscription.startedAt instanceof Date
                ? user.subscription.startedAt.toISOString()
                : user.subscription.startedAt,
            expiresAt:
              user.subscription.expiresAt instanceof Date
                ? user.subscription.expiresAt.toISOString()
                : user.subscription.expiresAt,
          }
        : null,
    hasActiveSubscription: active,
  };
}

export type SpendResult =
  | { ok: true; spent: boolean; balanceAfter: number }
  | { ok: false; reason: 'INSUFFICIENT' | 'USER_NOT_FOUND' };

/**
 * Analiz öncesi coin harca. Aktif abonelikte düşmez. Atomic; concurrent isteklerde
 * negatife düşemez. Başarılıysa CoinTransaction kaydı yazılır.
 */
export async function spendForAnalysis(
  userId: UserId,
  refId: string,
  meta?: Pick<CoinTransactionMeta, 'mealId' | 'activityId'>,
): Promise<SpendResult> {
  await connectMongo();
  const uid = toObjectId(userId);
  const user = await User.findById(uid).select('coins subscription').lean();
  if (!user) return { ok: false, reason: 'USER_NOT_FOUND' };

  if (hasActiveSubscription(user.subscription)) {
    return { ok: true, spent: false, balanceAfter: user.coins ?? 0 };
  }

  const updated = await User.findOneAndUpdate(
    { _id: uid, coins: { $gte: COIN_COST_PER_ANALYSIS } },
    { $inc: { coins: -COIN_COST_PER_ANALYSIS } },
    { new: true },
  );

  if (!updated) {
    return { ok: false, reason: 'INSUFFICIENT' };
  }

  const balanceAfter = updated.coins ?? 0;
  await CoinTransaction.create({
    userId: uid,
    type: 'analysis_spend',
    amount: -COIN_COST_PER_ANALYSIS,
    balanceAfter,
    meta: { refId, ...meta },
  });

  return { ok: true, spent: true, balanceAfter };
}

/**
 * Analiz başarısız olursa coin iade et. Aynı refId için bir kez iade edilir (idempotent).
 */
export async function refundAnalysis(
  userId: UserId,
  refId: string,
  reason: string,
): Promise<void> {
  await connectMongo();
  const uid = toObjectId(userId);

  const spend = await CoinTransaction.findOne({
    userId: uid,
    type: 'analysis_spend',
    'meta.refId': refId,
  }).lean();
  if (!spend) return; // hiç harcama yapılmamış (abone veya zaten iade edilmiş)

  const alreadyRefunded = await CoinTransaction.findOne({
    userId: uid,
    type: 'analysis_refund',
    'meta.refId': refId,
  }).lean();
  if (alreadyRefunded) return;

  const updated = await User.findByIdAndUpdate(
    uid,
    { $inc: { coins: COIN_COST_PER_ANALYSIS } },
    { new: true },
  );
  if (!updated) return;

  await CoinTransaction.create({
    userId: uid,
    type: 'analysis_refund',
    amount: COIN_COST_PER_ANALYSIS,
    balanceAfter: updated.coins ?? 0,
    meta: { refId, reason },
  });
}

export async function grantCoins(
  userId: UserId,
  amount: number,
  type: CoinTransactionType,
  meta?: CoinTransactionMeta,
): Promise<{ coins: number; transactionId: string }> {
  if (amount === 0) {
    const state = await getCoinState(userId);
    return { coins: state?.coins ?? 0, transactionId: '' };
  }
  await connectMongo();
  const uid = toObjectId(userId);
  const updated = await User.findByIdAndUpdate(
    uid,
    { $inc: { coins: amount } },
    { new: true },
  );
  if (!updated) throw new Error('User not found');
  const balanceAfter = updated.coins ?? 0;
  const tx = await CoinTransaction.create({
    userId: uid,
    type,
    amount,
    balanceAfter,
    meta,
  });
  return { coins: balanceAfter, transactionId: String(tx._id) };
}

export async function purchasePackage(userId: UserId, packageId: CoinPackageId) {
  const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) throw new Error('Geçersiz paket');
  await connectMongo();
  const uid = toObjectId(userId);
  const order = await PurchaseOrder.create({
    userId: uid,
    kind: 'package',
    refId: pkg.id,
    amountTRY: pkg.priceTRY,
    status: 'completed', // TODO: gerçek ödeme entegrasyonu (Iyzico) eklendiğinde 'pending' başlat.
    provider: 'stub',
    providerRef: null,
    completedAt: new Date(),
  });
  const { coins, transactionId } = await grantCoins(uid, pkg.coins, 'purchase', {
    packageId: pkg.id,
    refId: String(order._id),
    amountTRY: pkg.priceTRY,
  });
  return { order, coins, transactionId, package: pkg };
}

export async function applySubscription(userId: UserId, planId: SubscriptionPlanId) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error('Geçersiz plan');
  await connectMongo();
  const uid = toObjectId(userId);

  const existing = await User.findById(uid).select('subscription').lean();
  const now = new Date();
  const currentExpiry =
    existing?.subscription?.expiresAt instanceof Date
      ? existing.subscription.expiresAt
      : existing?.subscription?.expiresAt
        ? new Date(existing.subscription.expiresAt)
        : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(base.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const order = await PurchaseOrder.create({
    userId: uid,
    kind: 'subscription',
    refId: plan.id,
    amountTRY: plan.priceTRY,
    status: 'completed',
    provider: 'stub',
    providerRef: null,
    completedAt: now,
  });

  await User.findByIdAndUpdate(uid, {
    $set: {
      'subscription.plan': plan.id,
      'subscription.startedAt': existing?.subscription?.startedAt ?? now,
      'subscription.expiresAt': newExpiry,
    },
  });

  await CoinTransaction.create({
    userId: uid,
    type: 'subscription_grant',
    amount: 0,
    balanceAfter: (await User.findById(uid).select('coins').lean())?.coins ?? 0,
    meta: { planId: plan.id, refId: String(order._id), amountTRY: plan.priceTRY },
  });

  return { order, plan, expiresAt: newExpiry };
}

export type AdRewardResult =
  | { ok: true; coins: number; awarded: number }
  | { ok: false; reason: 'COOLDOWN' | 'DAILY_LIMIT' | 'DUPLICATE_NONCE' };

export async function applyAdReward(
  userId: UserId,
  adNonce: string,
): Promise<AdRewardResult> {
  await connectMongo();
  const uid = toObjectId(userId);

  // Idempotent: aynı nonce iki kez işlenmez (DB unique index ile de korunuyor).
  const dup = await CoinTransaction.findOne({
    userId: uid,
    type: 'ad_reward',
    'meta.adNonce': adNonce,
  }).lean();
  if (dup) return { ok: false, reason: 'DUPLICATE_NONCE' };

  // Cooldown: son ad_reward'dan en az AD_COOLDOWN_SECONDS geçmiş olmalı.
  const lastAd = await CoinTransaction.findOne({ userId: uid, type: 'ad_reward' })
    .sort({ createdAt: -1 })
    .lean();
  if (lastAd) {
    const elapsed = (Date.now() - lastAd.createdAt.getTime()) / 1000;
    if (elapsed < AD_COOLDOWN_SECONDS) {
      return { ok: false, reason: 'COOLDOWN' };
    }
  }

  // Günlük limit (kullanıcı yerel günü değil UTC; pratikte yeterli).
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const todayCount = await CoinTransaction.countDocuments({
    userId: uid,
    type: 'ad_reward',
    createdAt: { $gte: startOfDay },
  });
  if (todayCount >= MAX_AD_REWARD_PER_DAY) {
    return { ok: false, reason: 'DAILY_LIMIT' };
  }

  try {
    const { coins } = await grantCoins(uid, AD_REWARD, 'ad_reward', { adNonce });
    return { ok: true, coins, awarded: AD_REWARD };
  } catch (err: unknown) {
    // Unique index ihlali (race) — duplicate kabul et.
    if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 11000) {
      return { ok: false, reason: 'DUPLICATE_NONCE' };
    }
    throw err;
  }
}

export async function getTransactionHistory(userId: UserId, limit = 50, before?: Date) {
  await connectMongo();
  const uid = toObjectId(userId);
  const filter: Record<string, unknown> = { userId: uid };
  if (before) filter.createdAt = { $lt: before };
  const items = await CoinTransaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = items.length > limit;
  return {
    items: items.slice(0, limit).map(serializeCoinTransaction),
    hasMore,
  };
}
