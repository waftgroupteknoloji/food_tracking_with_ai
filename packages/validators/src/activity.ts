import { z } from 'zod';
import { ObjectIdSchema, LocalDateSchema } from './common';

export const IntensitySchema = z.enum(['low', 'moderate', 'high']);
export type Intensity = z.infer<typeof IntensitySchema>;

export const ActivityItemSchema = z.object({
  _id: ObjectIdSchema.optional(),
  name: z.string().trim().min(1).max(100),
  durationMin: z.number().min(1).max(1440),
  intensity: IntensitySchema.optional(),
  metValue: z.number().min(0.5).max(20).optional(),
  kcalBurned: z.number().min(0).max(3000),
  isEdited: z.boolean().default(false),
  isAdded: z.boolean().default(false),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const AiActivityItemSchema = z.object({
  name: z.string(),
  duration_min: z.number().min(1).max(1440),
  intensity: IntensitySchema.optional(),
  met_value: z.number().min(0.5).max(20),
  kcal_burned: z.number().min(0).max(3000),
});
export type AiActivityItem = z.infer<typeof AiActivityItemSchema>;

export const AiActivityAnalysisSchema = z.object({
  items: z.array(AiActivityItemSchema),
});
export type AiActivityAnalysis = z.infer<typeof AiActivityAnalysisSchema>;

export const ActivityAnalysisRecordSchema = z.object({
  model: z.string(),
  rawJson: z.unknown(),
  analyzedAt: z.string().datetime().or(z.date()),
  promptVersion: z.string(),
  error: z.string().optional(),
});

export const ActivitySchema = z.object({
  _id: ObjectIdSchema,
  userId: ObjectIdSchema,
  performedAt: z.string().datetime().or(z.date()),
  localDate: LocalDateSchema,
  inputText: z.string(),
  aiAnalysis: ActivityAnalysisRecordSchema,
  items: z.array(ActivityItemSchema),
  totalKcalBurned: z.number().min(0),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const CreateActivityInputSchema = z.object({
  inputText: z.string().trim().min(1).max(1000),
  performedAt: z.string().datetime().optional(),
});
export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;

export const UpdateActivityInputSchema = z.object({
  items: z.array(ActivityItemSchema).optional(),
});
export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;
