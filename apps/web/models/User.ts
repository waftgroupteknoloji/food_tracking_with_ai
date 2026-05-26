import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const StreakSubSchema = new Schema(
  {
    current: { type: Number, default: 0, min: 0 },
    longest: { type: Number, default: 0, min: 0 },
    lastLogDate: { type: String, default: null },
  },
  { _id: false },
);

const SubscriptionSubSchema = new Schema(
  {
    plan: { type: String, enum: ['monthly', 'yearly'], default: null },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { _id: false },
);

const UserProfileSubSchema = new Schema(
  {
    heightCm: { type: Number, min: 80, max: 250 },
    birthDate: { type: String },
    sex: { type: String, enum: ['male', 'female', 'other'] },
    goalWeightKg: { type: Number, min: 20, max: 500 },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active'],
    },
    targetDailyKcal: { type: Number, min: 800, max: 8000 },
    waterGoalMl: { type: Number, default: 2500, min: 500, max: 10000 },
    timezone: { type: String, default: 'Europe/Istanbul' },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    avatarKey: { type: String, default: null },
    profile: { type: UserProfileSubSchema, default: () => ({}) },
    streak: { type: StreakSubSchema, default: () => ({}) },
    coins: { type: Number, default: 0, min: 0 },
    subscription: { type: SubscriptionSubSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', UserSchema);

export function toPublicUser(doc: UserDoc) {
  return {
    _id: String(doc._id),
    email: doc.email,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl ?? null,
    profile: {
      heightCm: doc.profile?.heightCm,
      birthDate: doc.profile?.birthDate,
      sex: doc.profile?.sex,
      goalWeightKg: doc.profile?.goalWeightKg,
      activityLevel: doc.profile?.activityLevel,
      targetDailyKcal: doc.profile?.targetDailyKcal,
      waterGoalMl: doc.profile?.waterGoalMl ?? 2500,
      timezone: doc.profile?.timezone ?? 'Europe/Istanbul',
    },
    streak: {
      current: doc.streak?.current ?? 0,
      longest: doc.streak?.longest ?? 0,
      lastLogDate: doc.streak?.lastLogDate ?? null,
    },
    coins: doc.coins ?? 0,
    subscription: serializeSubscription(doc.subscription),
    hasActiveSubscription: hasActiveSubscription(doc.subscription),
    createdAt: doc.createdAt.toISOString(),
  };
}

function serializeSubscription(sub: UserDoc['subscription']) {
  if (!sub || !sub.plan || !sub.expiresAt || !sub.startedAt) return null;
  return {
    plan: sub.plan,
    startedAt: sub.startedAt instanceof Date ? sub.startedAt.toISOString() : sub.startedAt,
    expiresAt: sub.expiresAt instanceof Date ? sub.expiresAt.toISOString() : sub.expiresAt,
  };
}

export function hasActiveSubscription(sub: UserDoc['subscription'] | null | undefined): boolean {
  if (!sub || !sub.expiresAt) return false;
  const expiresAt = sub.expiresAt instanceof Date ? sub.expiresAt : new Date(sub.expiresAt);
  return expiresAt.getTime() > Date.now();
}
