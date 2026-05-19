import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const ActivityItemSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    durationMin: { type: Number, required: true, min: 0 },
    intensity: { type: String, enum: ['low', 'moderate', 'high'] },
    metValue: { type: Number, min: 0 },
    kcalBurned: { type: Number, required: true, min: 0 },
    isEdited: { type: Boolean, default: false },
    isAdded: { type: Boolean, default: false },
  },
  { _id: true },
);

const AiAnalysisSubSchema = new Schema(
  {
    model: { type: String, required: true },
    rawJson: { type: Schema.Types.Mixed },
    analyzedAt: { type: Date, required: true },
    promptVersion: { type: String, required: true },
    error: { type: String },
  },
  { _id: false },
);

const ActivitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    performedAt: { type: Date, required: true },
    localDate: { type: String, required: true, index: true },
    inputText: { type: String, required: true },
    aiAnalysis: { type: AiAnalysisSubSchema, required: true },
    items: { type: [ActivityItemSubSchema], default: [] },
    totalKcalBurned: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ActivitySchema.index({ userId: 1, localDate: 1, performedAt: -1 });

ActivitySchema.pre('save', function (next) {
  if (this.isModified('items') || this.isNew) {
    this.totalKcalBurned = (this.items as Array<{ kcalBurned: number }>).reduce(
      (sum, it) => sum + (it.kcalBurned || 0),
      0,
    );
  }
  next();
});

export type ActivityDoc = InferSchemaType<typeof ActivitySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Activity: Model<ActivityDoc> =
  (mongoose.models.Activity as Model<ActivityDoc>) ||
  mongoose.model<ActivityDoc>('Activity', ActivitySchema);

export function serializeActivity(doc: ActivityDoc) {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    performedAt: doc.performedAt.toISOString(),
    localDate: doc.localDate,
    inputText: doc.inputText,
    aiAnalysis: {
      model: doc.aiAnalysis.model,
      rawJson: doc.aiAnalysis.rawJson,
      analyzedAt: doc.aiAnalysis.analyzedAt.toISOString(),
      promptVersion: doc.aiAnalysis.promptVersion,
      error: doc.aiAnalysis.error ?? undefined,
    },
    items: (doc.items ?? []).map((it: any) => ({
      _id: String(it._id),
      name: it.name,
      durationMin: it.durationMin,
      intensity: it.intensity ?? undefined,
      metValue: it.metValue ?? undefined,
      kcalBurned: it.kcalBurned,
      isEdited: it.isEdited ?? false,
      isAdded: it.isAdded ?? false,
    })),
    totalKcalBurned: doc.totalKcalBurned,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
