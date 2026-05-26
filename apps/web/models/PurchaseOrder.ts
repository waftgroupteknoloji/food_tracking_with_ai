import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const PurchaseOrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['package', 'subscription'], required: true },
    refId: { type: String, required: true },
    amountTRY: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      required: true,
    },
    provider: { type: String, default: 'stub' },
    providerRef: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type PurchaseOrderDoc = InferSchemaType<typeof PurchaseOrderSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PurchaseOrder: Model<PurchaseOrderDoc> =
  (mongoose.models.PurchaseOrder as Model<PurchaseOrderDoc>) ||
  mongoose.model<PurchaseOrderDoc>('PurchaseOrder', PurchaseOrderSchema);
