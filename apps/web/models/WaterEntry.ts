import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const WaterEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    localDate: { type: String, required: true },
    amountMl: { type: Number, required: true, min: 1, max: 5000 },
    loggedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

WaterEntrySchema.index({ userId: 1, localDate: 1 });

export type WaterEntryDoc = InferSchemaType<typeof WaterEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WaterEntry: Model<WaterEntryDoc> =
  (mongoose.models.WaterEntry as Model<WaterEntryDoc>) ||
  mongoose.model<WaterEntryDoc>('WaterEntry', WaterEntrySchema);

export function serializeWaterEntry(doc: WaterEntryDoc) {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    localDate: doc.localDate,
    amountMl: doc.amountMl,
    loggedAt: doc.loggedAt.toISOString(),
  };
}
