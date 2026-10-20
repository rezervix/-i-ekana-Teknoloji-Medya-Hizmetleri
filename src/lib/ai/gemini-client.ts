import {
  executeDomainGeneration,
  getDomainConfig,
  AIGenerationOptions,
} from "./core/ai-service-manager";

export { getDomainConfig };

export interface GenerateTextOptions extends AIGenerationOptions {}

export function getGeminiModel(): string {
  const cfg = getDomainConfig("SUPPORT");
  return cfg.model;
}

/**
 * Executes customer support generation through the central AI service manager.
 * Guarantees domain isolation, timeout handling, retry logic, and key redaction.
 */
export async function generateAIText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<{ text: string; tokensUsed?: number; latencyMs?: number }> {
  try {
    const result = await executeDomainGeneration("SUPPORT", prompt, options);
    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
    };
  } catch (err: any) {
    // Already redacted by executeDomainGeneration
    console.error("[GeminiClient] Customer Support AI generation failed:", err?.message || err);
    throw new Error("AI_GENERATION_FAILED: Yapay zekâ yanıtı üretilirken bir hata oluştu.");
  }
}
