import { GoogleGenAI } from "@google/genai";

/**
 * Server-side Gemini Client for Customer Support & Knowledge Base.
 * 
 * SECURITY:
 * - API Key is loaded strictly on the server from environment variables.
 * - Never sent or exposed to client-side.
 * - Model is configurable via GEMINI_CHAT_MODEL or GEMINI_MODEL.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";

export function getGeminiModel(): string {
  return process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING: Gemini API anahtarı sunucu ortamında tanımlanmamıştır.");
  }
  return new GoogleGenAI({ apiKey });
}

export interface GenerateTextOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Executes a controlled generation with Gemini.
 * Catches errors safely and sanitizes internal stack traces before bubbling up.
 */
export async function generateAIText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<{ text: string; tokensUsed?: number }> {
  const client = getGeminiClient();
  const model = getGeminiModel();

  try {
    const config: any = {};
    if (options.temperature !== undefined) {
      config.temperature = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      config.maxOutputTokens = options.maxOutputTokens;
    }
    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    const text = response.text || "";
    const tokensUsed = response.usageMetadata?.totalTokenCount;

    return {
      text: text.trim(),
      tokensUsed,
    };
  } catch (err: any) {
    console.error("[GeminiClient] AI generation error:", err?.message || err);
    throw new Error("AI_GENERATION_FAILED: Yapay zekâ yanıtı üretilirken bir hata oluştu.");
  }
}
