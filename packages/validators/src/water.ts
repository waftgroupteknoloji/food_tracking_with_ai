import { z } from 'zod';
import { ObjectIdSchema, LocalDateSchema } from './common';

export const WaterEntrySchema = z.object({
  _id: ObjectIdSchema,
  userId: ObjectIdSchema,
  localDate: LocalDateSchema,
  amountMl: z.number().int().min(1).max(5000),
  loggedAt: z.string().datetime().or(z.date()),
});
export type WaterEntry = z.infer<typeof WaterEntrySchema>;

export const CreateWaterInputSchema = z.object({
  amountMl: z.number().int().min(1).max(5000),
});
export type CreateWaterInput = z.infer<typeof CreateWaterInputSchema>;
