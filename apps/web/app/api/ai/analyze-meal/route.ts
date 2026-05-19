import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { getAi, isAiConfigured } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BodySchema = z.object({
  photoUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    if (!isAiConfigured()) {
      return fail(
        'AI_NOT_CONFIGURED',
        'GEMINI_API_KEY tanımlı değil. .env dosyana ekle.',
        503,
      );
    }

    const limit = rateLimit(`ai-meal:${user.userId}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail('RATE_LIMIT', 'Saatlik AI çağrı limitine ulaşıldı', 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    const result = await getAi().analyzeMeal({ imageUrl: parsed.data.photoUrl });
    return ok({
      items: result.analysis.items,
      mealDescription:
        'meal_description' in result.analysis ? result.analysis.meal_description : undefined,
      overallConfidence:
        'overall_confidence' in result.analysis
          ? result.analysis.overall_confidence
          : undefined,
      warnings:
        'warnings' in result.analysis ? result.analysis.warnings : undefined,
      promptVersion: result.promptVersion,
      error: result.error,
    });
  } catch (err) {
    return failFromError(err);
  }
}
