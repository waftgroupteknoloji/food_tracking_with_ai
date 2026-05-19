import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const MacrosSubSchema = new Schema(
  {
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fat: { type: Number, min: 0 },
  },
  { _id: false },
);

const MealItemSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: 'porsiyon', trim: true },
    grams: { type: Number, min: 0 },
    kcal: { type: Number, required: true, min: 0 },
    macros: { type: MacrosSubSchema, default: undefined },
    isEdited: { type: Boolean, default: false },
    isAdded: { type: Boolean, default: false },
  },
  { _id: true },
);

const AiAnalysisSubSchema = new Schema(
  {
    model: { type: String, required: true },
    rawJson: { type: Schema.Types.Mixed },
    confidence: { type: Number, min: 0, max: 1 },
    analyzedAt: { type: Date, required: true },
    promptVersion: { type: String, required: true },
    error: { type: String },
  },
  { _id: false },
);

const MealSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    consumedAt: { type: Date, required: true },
    localDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    },
    photoUrl: { type: String },
    photoKey: { type: String },
    inputText: { type: String, maxlength: 1000 },
    source: { type: String, enum: ['photo', 'text'], default: 'photo' },
    aiAnalysis: { type: AiAnalysisSubSchema, required: true },
    items: { type: [MealItemSubSchema], default: [] },
    totalKcal: { type: Number, default: 0, min: 0 },
    userNote: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

MealSchema.index({ userId: 1, localDate: 1, consumedAt: -1 });
MealSchema.index({ userId: 1, createdAt: -1 });

// totalKcal'ı items toplamından otomatik hesapla
MealSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isNew) {
    this.totalKcal = (this.items as Array<{ kcal: number }>).reduce(
      (sum, item) => sum + (item.kcal || 0),
      0,
    );
  }
  next();
});

export type MealDoc = InferSchemaType<typeof MealSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Meal: Model<MealDoc> =
  (mongoose.models.Meal as Model<MealDoc>) ||
  mongoose.model<MealDoc>('Meal', MealSchema);

export function serializeMeal(doc: MealDoc) {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    consumedAt: doc.consumedAt.toISOString(),
    localDate: doc.localDate,
    mealType: doc.mealType ?? undefined,
    photoUrl: doc.photoUrl ?? undefined,
    photoKey: doc.photoKey ?? undefined,
    inputText: doc.inputText ?? undefined,
    source: (doc.source as 'photo' | 'text' | undefined) ?? (doc.photoUrl ? 'photo' : 'text'),
    aiAnalysis: {
      model: doc.aiAnalysis.model,
      rawJson: doc.aiAnalysis.rawJson,
      confidence: doc.aiAnalysis.confidence ?? undefined,
      analyzedAt: doc.aiAnalysis.analyzedAt.toISOString(),
      promptVersion: doc.aiAnalysis.promptVersion,
      error: doc.aiAnalysis.error ?? undefined,
    },
    items: (doc.items ?? []).map((it: any) => ({
      _id: String(it._id),
      name: it.name,
      quantity: it.quantity ?? 1,
      unit: it.unit ?? 'porsiyon',
      grams: it.grams ?? undefined,
      kcal: it.kcal,
      macros: it.macros ?? undefined,
      isEdited: it.isEdited ?? false,
      isAdded: it.isAdded ?? false,
    })),
    totalKcal: doc.totalKcal,
    userNote: doc.userNote ?? undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
