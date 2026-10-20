/**
 * Çiçekana Tech Media — Centralized AI Service Manager
 * 
 * Provides domain-isolated, provider-agnostic, and secure AI generation.
 * Features:
 * - Domain-based configuration (SUPPORT, CONTENT, ANALYSIS)
 * - Domain-specific key & model resolution with safe fallbacks
 * - Strict server-side credential isolation (zero client exposure)
 * - Automatic log redaction (scrubs API keys from error messages)
 * - Error classification (QUOTA_EXHAUSTED, TIMEOUT, AUTH_ERROR, NETWORK_ERROR, MODEL_NOT_FOUND)
 * - Timeout handling & controlled retry backoff (never loop on quota exhaustion)
 * - Performance & token usage metrics
 */

import { GoogleGenAI } from "@google/genai";

export type AIDomain = "SUPPORT" | "CONTENT" | "ANALYSIS";

export type AIErrorCode =
  | "QUOTA_EXHAUSTED"
  | "TIMEOUT"
  | "AUTH_ERROR"
  | "MODEL_NOT_FOUND"
  | "NETWORK_ERROR"
  | "GENERAL_ERROR";

export class AIServiceError extends Error {
  code: AIErrorCode;
  domain: AIDomain;
  statusCode?: number;
  userFacingMessage: string;

  constructor(params: {
    code: AIErrorCode;
    domain: AIDomain;
    message: string;
    userFacingMessage?: string;
    statusCode?: number;
  }) {
    super(params.message);
    this.name = "AIServiceError";
    this.code = params.code;
    this.domain = params.domain;
    this.statusCode = params.statusCode;
    this.userFacingMessage =
      params.userFacingMessage ||
      "Şu anda sistemlerimizde kısa süreli bir yoğunluk yaşanmaktadır. Sorunuzu hemen uzman ekibimize iletmemiz için telefon numaranızı bırakabilirsiniz.";
  }
}

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
      model = process.env.GEMINI_SUPPORT_MODEL || "gemini-flash-lite-latest";
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
    throw new AIServiceError({
      code: "AUTH_ERROR",
      domain,
      statusCode: 401,
      message: `AI_CONFIG_ERROR: '${domain}' alanı için geçerli bir API anahtarı tanımlanmamıştır.`,
      userFacingMessage: "Müşteri hizmetleri asistanımız şu anda bakım modundadır. Yetkili ekibimize aktarılmak için lütfen numaranızı bırakınız.",
    });
  }

  return {
    apiKey,
    model,
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000, // 30 seconds default
    maxRetries: Number(process.env.AI_MAX_RETRIES) || 2,
  };
}

/**
 * Core text generation with timeout, error classification, retry controls, and sensitive data redaction.
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

      const rawStatus = err?.status || err?.statusCode;
      const isQuota =
        rawStatus === 429 ||
        /resource_exhausted|quota|too many requests/i.test(err?.message || "");
      const isAuth =
        rawStatus === 401 ||
        rawStatus === 403 ||
        /unauthorized|permission_denied|api key not valid/i.test(err?.message || "");
      const isNotFound =
        rawStatus === 404 ||
        /not_found|model.*not found/i.test(err?.message || "");

      // For quota, auth, or model not found errors: FAIL FAST, do NOT retry endlessly
      if (isQuota) {
        throw new AIServiceError({
          code: "QUOTA_EXHAUSTED",
          domain,
          statusCode: 429,
          message: `QUOTA_EXHAUSTED (429): ${safeMsg}`,
          userFacingMessage: "Şu anda yoğunluk sebebiyle sistemlerimizde yanıt gecikmesi yaşanıyor. Sorunuzu derhal uzman ekibimize iletmemiz için telefon numaranızı bırakabilirsiniz.",
        });
      }

      if (isAuth) {
        throw new AIServiceError({
          code: "AUTH_ERROR",
          domain,
          statusCode: rawStatus || 401,
          message: `AUTH_ERROR: ${safeMsg}`,
        });
      }

      if (isNotFound) {
        throw new AIServiceError({
          code: "MODEL_NOT_FOUND",
          domain,
          statusCode: 404,
          message: `MODEL_NOT_FOUND: ${safeMsg}`,
        });
      }

      if (attempt <= config.maxRetries) {
        // Exponential backoff wait for transient errors (e.g. 503, connection drops)
        await new Promise((res) => setTimeout(res, 800 * attempt));
      }
    }
  }

  const isTimeout = /timeout/i.test(lastError?.message || "");
  const sanitizedErrMsg = redactSensitiveText(lastError?.message || "Bilinmeyen AI hatası");

  throw new AIServiceError({
    code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
    domain,
    statusCode: isTimeout ? 504 : 500,
    message: `AI_EXECUTION_FAILED [${domain}]: ${sanitizedErrMsg}`,
    userFacingMessage: "Bağlantı zaman aşımı yaşandı. Sorunuzu uzman müşteri temsilcimize aktarabilmemiz için numaranızı bırakabilirsiniz.",
  });
}
