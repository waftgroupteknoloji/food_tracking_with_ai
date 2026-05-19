import { z } from 'zod';

export const UploadFolderSchema = z.enum(['meals', 'weight', 'avatar']);
export type UploadFolder = z.infer<typeof UploadFolderSchema>;

export const SignUploadInputSchema = z.object({
  folder: UploadFolderSchema,
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp)$/, 'image/jpeg, image/png veya image/webp olmalı'),
});
export type SignUploadInput = z.infer<typeof SignUploadInputSchema>;

export const SignUploadOutputSchema = z.object({
  key: z.string(),
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
});
export type SignUploadOutput = z.infer<typeof SignUploadOutputSchema>;
