import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { getAi, isAiConfigured } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, failFromError } from '@/lib/api-response';
import { spendForAnalysis, refundAnalysis } from '@/lib/coin-service';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BodySchema = z.object({
  inputText: z.string().min(1).max(1000),
  weightKg: z.number().min(20).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);
    if (!isAiConfigured()) {
      return fail('AI_NOT_CONFIGURED', 'GEMINI_API_KEY tanımlı değil', 503);
    }

    const limit = rateLimit(`ai-activity:${user.userId}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) return fail('RATE_LIMIT', 'Saatlik AI çağrı limitine ulaşıldı', 429);

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    const coinRefId = randomUUID();
    const spend = await spendForAnalysis(user.userId, coinRefId, {});
    if (!spend.ok) {
      return fail(
        'INSUFFICIENT_COINS',
        'Coin yetersiz. Reklam izleyerek veya paket alarak coin kazanabilirsin.',
        402,
      );
    }

    let result;
    try {
      result = await getAi().analyzeActivity({
        text: parsed.data.inputText,
        weightKg: parsed.data.weightKg,
      });
    } catch (aiErr) {
      await refundAnalysis(user.userId, coinRefId, 'ai_exception');
      throw aiErr;
    }

    if (result.error || result.analysis.items.length === 0) {
      await refundAnalysis(user.userId, coinRefId, result.error ? 'ai_error' : 'no_items');
    }

    return ok({
      items: result.analysis.items,
      promptVersion: result.promptVersion,
      error: result.error,
    });
  } catch (err) {
    return failFromError(err);
  }
}
