import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const CoinTransactionMetaSubSchema = new Schema(
  {
    mealId: { type: String, default: undefined },
    activityId: { type: String, default: undefined },
    refId: { type: String, default: undefined },
    packageId: { type: String, default: undefined },
    planId: { type: String, default: undefined },
    adNonce: { type: String, default: undefined },
    reason: { type: String, default: undefined },
    amountTRY: { type: Number, default: undefined },
  },
  { _id: false, strict: false },
);

const CoinTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'signup_bonus',
        'analysis_spend',
        'analysis_refund',
        'ad_reward',
        'purchase',
        'subscription_grant',
        'manual_adjust',
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    meta: { type: CoinTransactionMetaSubSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CoinTransactionSchema.index({ userId: 1, createdAt: -1 });
CoinTransactionSchema.index(
  { userId: 1, type: 1, 'meta.refId': 1 },
  { partialFilterExpression: { 'meta.refId': { $exists: true } } },
);
CoinTransactionSchema.index(
  { userId: 1, type: 1, 'meta.adNonce': 1 },
  { unique: true, partialFilterExpression: { 'meta.adNonce': { $exists: true } } },
);

export type CoinTransactionDoc = InferSchemaType<typeof CoinTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const CoinTransaction: Model<CoinTransactionDoc> =
  (mongoose.models.CoinTransaction as Model<CoinTransactionDoc>) ||
  mongoose.model<CoinTransactionDoc>('CoinTransaction', CoinTransactionSchema);

export function serializeCoinTransaction(doc: CoinTransactionDoc) {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    type: doc.type,
    amount: doc.amount,
    balanceAfter: doc.balanceAfter,
    meta: doc.meta ?? {},
    createdAt: doc.createdAt.toISOString(),
  };
}
