import { z } from 'zod';
import { ObjectIdSchema, LocalDateSchema } from './common';
import { SubscriptionStateSchema } from './coin';

export const SexSchema = z.enum(['male', 'female', 'other']);
export type Sex = z.infer<typeof SexSchema>;

export const ActivityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const UserProfileSchema = z.object({
  heightCm: z.number().int().min(80).max(250).optional(),
  birthDate: z.string().optional(),
  sex: SexSchema.optional(),
  goalWeightKg: z.number().min(20).max(500).optional(),
  activityLevel: ActivityLevelSchema.optional(),
  targetDailyKcal: z.number().int().min(800).max(8000).optional(),
  waterGoalMl: z.number().int().min(500).max(10000).default(2500),
  timezone: z.string().default('Europe/Istanbul'),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const StreakSchema = z.object({
  current: z.number().int().min(0).default(0),
  longest: z.number().int().min(0).default(0),
  lastLogDate: LocalDateSchema.nullable().default(null),
});
export type Streak = z.infer<typeof StreakSchema>;

export const PublicUserSchema = z.object({
  _id: ObjectIdSchema,
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  profile: UserProfileSchema,
  streak: StreakSchema,
  coins: z.number().int().min(0).default(0),
  subscription: SubscriptionStateSchema.nullable().default(null),
  hasActiveSubscription: z.boolean().default(false),
  createdAt: z.string().datetime().or(z.date()),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const UpdateProfileInputSchema = UserProfileSchema.partial().extend({
  displayName: z.string().trim().min(2).max(50).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;
