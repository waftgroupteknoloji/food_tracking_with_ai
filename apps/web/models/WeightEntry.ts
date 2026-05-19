import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const WeightEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // localDate
    weightKg: { type: Number, required: true, min: 20, max: 500 },
    photoUrl: { type: String, default: null },
    photoKey: { type: String, default: null },
    note: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

WeightEntrySchema.index({ userId: 1, date: -1 });
WeightEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

export type WeightEntryDoc = InferSchemaType<typeof WeightEntrySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const WeightEntry: Model<WeightEntryDoc> =
  (mongoose.models.WeightEntry as Model<WeightEntryDoc>) ||
  mongoose.model<WeightEntryDoc>('WeightEntry', WeightEntrySchema);

export function serializeWeightEntry(doc: WeightEntryDoc) {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    date: doc.date,
    weightKg: doc.weightKg,
    photoUrl: doc.photoUrl ?? null,
    photoKey: doc.photoKey ?? null,
    note: doc.note,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
