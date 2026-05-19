import { z } from 'zod';
import { LocalDateSchema } from './common';
import { MealSchema } from './meal';
import { ActivitySchema } from './activity';

export const DailyStatsSchema = z.object({
  date: LocalDateSchema,
  kcalIn: z.number().min(0),
  kcalOut: z.number().min(0),
  net: z.number(),
  target: z.number().min(0).nullable(),
  bmr: z.number().min(0).nullable(),
  tdee: z.number().min(0).nullable(),
  meals: z.array(MealSchema),
  activities: z.array(ActivitySchema),
  waterMl: z.number().min(0),
  waterGoalMl: z.number().min(0),
  weightKg: z.number().min(0).nullable(),
});
export type DailyStats = z.infer<typeof DailyStatsSchema>;

export const RangeGranularitySchema = z.enum(['day', 'week', 'month']);
export type RangeGranularity = z.infer<typeof RangeGranularitySchema>;

export const StreakStatsSchema = z.object({
  current: z.number().int().min(0),
  longest: z.number().int().min(0),
  lastLogDate: LocalDateSchema.nullable(),
});
export type StreakStats = z.infer<typeof StreakStatsSchema>;
