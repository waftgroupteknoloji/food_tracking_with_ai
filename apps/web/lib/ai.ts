import { GeminiAi } from '@yemek-takip/ai';

let cached: GeminiAi | null = null;

export function getAi(): GeminiAi {
  if (cached) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY tanımlı değil');
  cached = new GeminiAi(key);
  return cached;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
