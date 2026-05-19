import { z } from 'zod';
import { ObjectIdSchema, LocalDateSchema } from './common';

export const WeightEntrySchema = z.object({
  _id: ObjectIdSchema,
  userId: ObjectIdSchema,
  date: LocalDateSchema,
  weightKg: z.number().min(20).max(500),
  photoUrl: z.string().url().nullable().optional(),
  photoKey: z.string().nullable().optional(),
  note: z.string().max(300).optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type WeightEntry = z.infer<typeof WeightEntrySchema>;

export const CreateWeightInputSchema = z.object({
  date: LocalDateSchema,
  weightKg: z.number().min(20).max(500),
  photoKey: z.string().optional(),
  photoUrl: z.string().url().optional(),
  note: z.string().max(300).optional(),
});
export type CreateWeightInput = z.infer<typeof CreateWeightInputSchema>;

export const WeightPeriodSchema = z.enum(['week', 'month', 'year', 'all']);
export type WeightPeriod = z.infer<typeof WeightPeriodSchema>;
