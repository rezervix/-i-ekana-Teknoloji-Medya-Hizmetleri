import {
  executeDomainGeneration,
  getDomainConfig,
  AIGenerationOptions,
  AIServiceError,
  AIErrorCode,
  redactSensitiveText,
} from "./core/ai-service-manager";

export { getDomainConfig, AIServiceError, redactSensitiveText };
export type { AIErrorCode };

export interface GenerateTextOptions extends AIGenerationOptions {}

export function getGeminiModel(): string {
  const cfg = getDomainConfig("SUPPORT");
  return cfg.model;
}

/**
 * Executes customer support generation through the central AI service manager.
 * Preserves specific error classification (QUOTA_EXHAUSTED, TIMEOUT, etc.)
 * while redacting any credentials from logs.
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
    if (err instanceof AIServiceError) {
      console.warn(`[GeminiClient] Customer Support AI error [${err.code}]:`, err.message);
      throw err;
    }

    const safeMsg = redactSensitiveText(err?.message || String(err));
    console.error("[GeminiClient] Customer Support AI generation failed:", safeMsg);
    throw new AIServiceError({
      code: "GENERAL_ERROR",
      domain: "SUPPORT",
      message: `AI_GENERATION_FAILED: ${safeMsg}`,
    });
  }
}
