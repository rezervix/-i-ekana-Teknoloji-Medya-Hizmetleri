/**
 * Çiçekana Tech Media — Centralized AI Service Manager
 * 
 * Provides domain-isolated, provider-agnostic, and secure AI generation.
 * Features:
 * - Domain-based configuration (SUPPORT, CONTENT, ANALYSIS)
 * - Domain-specific key & model resolution with safe fallbacks
 * - Strict server-side credential isolation (zero client exposure)
 * - Automatic log redaction (scrubs API keys from error messages)
 * - Timeout handling & retry backoff
 * - Performance & token usage metrics
 */

import { GoogleGenAI } from "@google/genai";

export type AIDomain = "SUPPORT" | "CONTENT" | "ANALYSIS";

export interface AIServiceConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface AIGenerationOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AIGenerationResult {
  text: string;
  domain: AIDomain;
  modelUsed: string;
  tokensUsed?: number;
  latencyMs: number;
}

/**
 * Regex patterns to scrub API keys from any logs or error outputs.
 */
const KEY_REDACTION_PATTERNS = [
  /AIza[a-zA-Z0-9_\-]{30,}/g,
  /AQ\.[a-zA-Z0-9_\-]{30,}/g,
  /(api[_-]?key[:=]\s*['"]?)[a-zA-Z0-9_\-.]+/gi,
];

export function redactSensitiveText(input: string): string {
  if (!input || typeof input !== "string") return "";
  let sanitized = input;
  for (const pattern of KEY_REDACTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED_API_KEY]");
  }
  return sanitized;
}

/**
 * Resolves configuration for a specific domain with hierarchical fallbacks.
 */
export function getDomainConfig(domain: AIDomain): AIServiceConfig {
  let apiKey = "";
  let model = "";

  switch (domain) {
    case "SUPPORT":
      apiKey = process.env.GEMINI_SUPPORT_API_KEY || process.env.GEMINI_API_KEY || "";
      model = process.env.GEMINI_SUPPORT_MODEL || process.env.GEMINI_MODEL || "gemini-flash-latest";
      break;

    case "CONTENT":
      apiKey = process.env.GEMINI_CONTENT_API_KEY || process.env.GEMINI_API_KEY || "";
      model = process.env.GEMINI_CONTENT_MODEL || process.env.GEMINI_MODEL || "gemini-flash-latest";
      break;

    case "ANALYSIS":
      apiKey = process.env.GEMINI_ANALYSIS_API_KEY || process.env.GEMINI_API_KEY || "";
      model = process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || "gemini-flash-latest";
      break;
  }

  if (!apiKey) {
    throw new Error(`AI_CONFIG_ERROR: '${domain}' alanı için geçerli bir API anahtarı tanımlanmamıştır.`);
  }

  return {
    apiKey,
    model,
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000, // 30 seconds default for network latency resilience
    maxRetries: Number(process.env.AI_MAX_RETRIES) || 2,
  };
}

/**
 * Core text generation with timeout, retry and sensitive data redaction.
 */
export async function executeDomainGeneration(
  domain: AIDomain,
  prompt: string,
  options: AIGenerationOptions = {}
): Promise<AIGenerationResult> {
  const config = getDomainConfig(domain);
  const startTime = Date.now();
  const effectiveTimeout = options.timeoutMs || config.timeoutMs;
  const model = config.model;

  const client = new GoogleGenAI({ apiKey: config.apiKey });

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= config.maxRetries) {
    try {
      // Setup timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_REQUEST_TIMEOUT: Yapay zekâ servisi zaman aşımına uğradı.")), effectiveTimeout)
      );

      const requestConfig: any = {};
      if (options.temperature !== undefined) requestConfig.temperature = options.temperature;
      if (options.maxOutputTokens !== undefined) requestConfig.maxOutputTokens = options.maxOutputTokens;
      if (options.systemInstruction) requestConfig.systemInstruction = options.systemInstruction;

      const apiCall = client.models.generateContent({
        model,
        contents: prompt,
        config: requestConfig,
      });

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      const latencyMs = Date.now() - startTime;
      const text = (response?.text || "").trim();
      const tokensUsed = response?.usageMetadata?.totalTokenCount;

      return {
        text,
        domain,
        modelUsed: model,
        tokensUsed,
        latencyMs,
      };
    } catch (err: any) {
      attempt++;
      lastError = err;
      const safeMsg = redactSensitiveText(err?.message || String(err));
      console.warn(`[AIServiceManager] [${domain}] Deneme ${attempt} başarısız:`, safeMsg);

      if (attempt <= config.maxRetries) {
        // Exponential backoff wait
        await new Promise((res) => setTimeout(res, 800 * attempt));
      }
    }
  }

  const sanitizedErrMsg = redactSensitiveText(lastError?.message || "Bilinmeyen AI hatası");
  throw new Error(`AI_EXECUTION_FAILED [${domain}]: ${sanitizedErrMsg}`);
}
