import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import {
  AiMealAnalysisSchema,
  AiActivityAnalysisSchema,
  type AiMealAnalysis,
  type AiActivityAnalysis,
} from '@yemek-takip/validators';
import {
  ACTIVITY_PROMPT_VERSION,
  ACTIVITY_SYSTEM_PROMPT,
  MEAL_PROMPT_VERSION,
  MEAL_SYSTEM_PROMPT,
  MEAL_TEXT_PROMPT_VERSION,
  MEAL_TEXT_SYSTEM_PROMPT,
} from './prompts';

const MODEL_NAME = 'gemini-2.5-flash';

export class GeminiAi {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('GEMINI_API_KEY missing');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Yemek fotoğrafını analiz eder. URL ile veya base64 ile çağrılabilir.
   * Soft fail: parse fail veya network hatası durumunda items: [] döner + error string.
   */
  async analyzeMeal(input: { imageUrl?: string; imageBase64?: string; mimeType?: string }): Promise<{
    analysis: AiMealAnalysis;
    rawJson: unknown;
    promptVersion: string;
    error?: string;
  }> {
    const model = this.client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: MEAL_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  estimated_grams: { type: SchemaType.NUMBER },
                  kcal: { type: SchemaType.NUMBER },
                  protein_g: { type: SchemaType.NUMBER },
                  carbs_g: { type: SchemaType.NUMBER },
                  fat_g: { type: SchemaType.NUMBER },
                  confidence: { type: SchemaType.NUMBER },
                },
                required: ['name', 'estimated_grams', 'kcal'],
              },
            },
            meal_description: { type: SchemaType.STRING },
            overall_confidence: { type: SchemaType.NUMBER },
            warnings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['items'],
        },
      },
    });

    const imagePart = await this.buildImagePart(input);

    const tryOnce = async (): Promise<unknown> => {
      const result = await model.generateContent([
        { text: 'Bu fotoğraftaki yiyecekleri analiz et.' },
        imagePart,
      ]);
      const text = result.response.text();
      return JSON.parse(text);
    };

    let rawJson: unknown = null;
    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rawJson = await tryOnce();
        const parsed = AiMealAnalysisSchema.safeParse(rawJson);
        if (parsed.success) {
          return {
            analysis: parsed.data,
            rawJson,
            promptVersion: MEAL_PROMPT_VERSION,
          };
        }
        lastError = `Schema validation failed: ${parsed.error.message}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      analysis: { items: [] },
      rawJson,
      promptVersion: MEAL_PROMPT_VERSION,
      error: lastError ?? 'AI analizi başarısız',
    };
  }

  /**
   * Yemek metnini parse eder ("3 yumurta, 2 dilim ekmek" gibi). Soft fail.
   */
  async analyzeMealText(input: { text: string }): Promise<{
    analysis: AiMealAnalysis;
    rawJson: unknown;
    promptVersion: string;
    error?: string;
  }> {
    const model = this.client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: MEAL_TEXT_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  estimated_grams: { type: SchemaType.NUMBER },
                  kcal: { type: SchemaType.NUMBER },
                  protein_g: { type: SchemaType.NUMBER },
                  carbs_g: { type: SchemaType.NUMBER },
                  fat_g: { type: SchemaType.NUMBER },
                  confidence: { type: SchemaType.NUMBER },
                },
                required: ['name', 'estimated_grams', 'kcal'],
              },
            },
            meal_description: { type: SchemaType.STRING },
            overall_confidence: { type: SchemaType.NUMBER },
            warnings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['items'],
        },
      },
    });

    const userMessage = `Kullanıcının yemek metni: "${input.text}"`;

    const tryOnce = async (): Promise<unknown> => {
      const result = await model.generateContent(userMessage);
      const text = result.response.text();
      return JSON.parse(text);
    };

    let rawJson: unknown = null;
    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rawJson = await tryOnce();
        const parsed = AiMealAnalysisSchema.safeParse(rawJson);
        if (parsed.success) {
          return {
            analysis: parsed.data,
            rawJson,
            promptVersion: MEAL_TEXT_PROMPT_VERSION,
          };
        }
        lastError = `Schema validation failed: ${parsed.error.message}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      analysis: { items: [] },
      rawJson,
      promptVersion: MEAL_TEXT_PROMPT_VERSION,
      error: lastError ?? 'AI analizi başarısız',
    };
  }

  /**
   * Aktivite metnini parse eder. Soft fail.
   */
  async analyzeActivity(input: { text: string; weightKg: number }): Promise<{
    analysis: AiActivityAnalysis;
    rawJson: unknown;
    promptVersion: string;
    error?: string;
  }> {
    const model = this.client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: ACTIVITY_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  duration_min: { type: SchemaType.NUMBER },
                  intensity: { type: SchemaType.STRING },
                  met_value: { type: SchemaType.NUMBER },
                  kcal_burned: { type: SchemaType.NUMBER },
                },
                required: ['name', 'duration_min', 'met_value', 'kcal_burned'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const userMessage = `Kullanıcı kilosu: ${input.weightKg} kg.\nAktivite metni: "${input.text}"`;

    const tryOnce = async (): Promise<unknown> => {
      const result = await model.generateContent(userMessage);
      const text = result.response.text();
      return JSON.parse(text);
    };

    let rawJson: unknown = null;
    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rawJson = await tryOnce();
        const parsed = AiActivityAnalysisSchema.safeParse(rawJson);
        if (parsed.success) {
          return {
            analysis: parsed.data,
            rawJson,
            promptVersion: ACTIVITY_PROMPT_VERSION,
          };
        }
        lastError = `Schema validation failed: ${parsed.error.message}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      analysis: { items: [] },
      rawJson,
      promptVersion: ACTIVITY_PROMPT_VERSION,
      error: lastError ?? 'AI analizi başarısız',
    };
  }

  private async buildImagePart(input: {
    imageUrl?: string;
    imageBase64?: string;
    mimeType?: string;
  }) {
    if (input.imageBase64) {
      return {
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType ?? 'image/jpeg',
        },
      };
    }
    if (input.imageUrl) {
      // Public URL'den indirip base64'e çeviriyoruz — Gemini SDK fileData için
      // ayrı upload akışı gerektirir, inlineData en pratik yol.
      const res = await fetch(input.imageUrl);
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      const data = Buffer.from(buf).toString('base64');
      return {
        inlineData: {
          data,
          mimeType: res.headers.get('content-type') ?? input.mimeType ?? 'image/jpeg',
        },
      };
    }
    throw new Error('Either imageUrl or imageBase64 must be provided');
  }
}

export const MODEL_VERSION = MODEL_NAME;
