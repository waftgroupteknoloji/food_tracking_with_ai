import { z } from 'zod';
import { ObjectIdSchema, LocalDateSchema } from './common';

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MacrosSchema = z.object({
  protein: z.number().min(0).max(500).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(500).optional(),
});
export type Macros = z.infer<typeof MacrosSchema>;

export const MealItemSchema = z.object({
  _id: ObjectIdSchema.optional(),
  name: z.string().trim().min(1).max(100),
  quantity: z.number().min(0).max(100).default(1),
  unit: z.string().trim().max(20).default('porsiyon'),
  grams: z.number().min(0).max(5000).optional(),
  kcal: z.number().min(0).max(5000),
  macros: MacrosSchema.optional(),
  isEdited: z.boolean().default(false),
  isAdded: z.boolean().default(false),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// AI'nin döndüğü şema (Gemini'ye verilecek)
export const AiMealItemSchema = z.object({
  name: z.string(),
  estimated_grams: z.number().min(0).max(5000),
  kcal: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500).optional(),
  carbs_g: z.number().min(0).max(1000).optional(),
  fat_g: z.number().min(0).max(500).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type AiMealItem = z.infer<typeof AiMealItemSchema>;

export const AiMealAnalysisSchema = z.object({
  items: z.array(AiMealItemSchema),
  meal_description: z.string().optional(),
  overall_confidence: z.number().min(0).max(1).optional(),
  warnings: z.array(z.string()).optional(),
});
export type AiMealAnalysis = z.infer<typeof AiMealAnalysisSchema>;

export const MealAnalysisRecordSchema = z.object({
  model: z.string(),
  rawJson: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
  analyzedAt: z.string().datetime().or(z.date()),
  promptVersion: z.string(),
  error: z.string().optional(),
});

export const MealSchema = z.object({
  _id: ObjectIdSchema,
  userId: ObjectIdSchema,
  consumedAt: z.string().datetime().or(z.date()),
  localDate: LocalDateSchema,
  mealType: MealTypeSchema.optional(),
  photoUrl: z.string().url().optional(),
  photoKey: z.string().optional(),
  inputText: z.string().max(1000).optional(),
  source: z.enum(['photo', 'text']).default('photo'),
  aiAnalysis: MealAnalysisRecordSchema,
  items: z.array(MealItemSchema),
  totalKcal: z.number().min(0),
  userNote: z.string().max(500).optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type Meal = z.infer<typeof MealSchema>;

export const CreateMealInputSchema = z
  .object({
    photoKey: z.string().min(1).optional(),
    photoUrl: z.string().url().optional(),
    inputText: z.string().trim().min(1).max(1000).optional(),
    consumedAt: z.string().datetime().optional(),
    mealType: MealTypeSchema.optional(),
  })
  .refine(
    (v) => (v.photoUrl && v.photoKey) || v.inputText,
    {
      message: 'photoUrl+photoKey ya da inputText vermelisin',
      path: ['inputText'],
    },
  );
export type CreateMealInput = z.infer<typeof CreateMealInputSchema>;

export const UpdateMealInputSchema = z.object({
  mealType: MealTypeSchema.optional(),
  userNote: z.string().max(500).optional(),
  items: z.array(MealItemSchema).optional(),
});
export type UpdateMealInput = z.infer<typeof UpdateMealInputSchema>;

export const UpdateMealItemInputSchema = MealItemSchema.partial().omit({
  _id: true,
});
export type UpdateMealItemInput = z.infer<typeof UpdateMealItemInputSchema>;
