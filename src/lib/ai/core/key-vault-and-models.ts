import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// ============================================================================
// 1. SECURITY & ENCRYPTION UTILITIES (AES-256-GCM + SECRET SANITIZATION)
// ============================================================================

const ENCRYPTION_PREFIX = 'enc:v1:';
const API_KEY_REGEX = /AIza[0-9A-Za-z\-_]{20,60}/g;

/**
 * Derives a 32-byte encryption key from server-side environment secrets.
 * Never exposed to client bundles.
 */
function getServerEncryptionKey(): Buffer {
  const rawSecret =
    process.env.AI_KEY_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    'cicekana-fallback-server-only-vault-secret-2026';
  return crypto.scryptSync(rawSecret, 'cicekana-ai-key-vault-salt-v1', 32);
}

/**
 * Scrubs any Google API Key pattern or raw key from error messages and logs.
 */
export function sanitizeErrorMessage(input: unknown, knownRawKeys: string[] = []): string {
  if (!input) return 'Bilinmeyen hata';
  let text = typeof input === 'string' ? input : (input as Error)?.message || String(input);

  // Scrub known raw keys first
  for (const raw of knownRawKeys) {
    if (raw && raw.length >= 8) {
      text = text.split(raw).join('[GİZLİ_API_ANAHTARI]');
    }
  }

  // Scrub standard Google API key patterns
  text = text.replace(API_KEY_REGEX, 'AIza...[GİZLENDİ]');
  // Scrub query string key=... if any external library ever formats a URL
  text = text.replace(/([?&]key=)[^&\s]+/gi, '$1[GİZLENDİ]');

  return text.slice(0, 600);
}

/**
 * Encrypts a plaintext API key using AES-256-GCM with a random 12-byte IV.
 */
export function encryptApiKey(plainKey: string): string {
  const trimmed = plainKey.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(ENCRYPTION_PREFIX)) return trimmed;

  const key = getServerEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted API key on the server.
 */
export function decryptApiKey(storedValue: string): string {
  if (!storedValue) return '';
  const trimmed = storedValue.trim();

  // Backward compatibility for unmigrated legacy plaintext (will be migrated on next save/load)
  if (!trimmed.startsWith(ENCRYPTION_PREFIX)) {
    return trimmed;
  }

  try {
    const payload = trimmed.slice(ENCRYPTION_PREFIX.length);
    const [ivB64, tagB64, cipherB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !cipherB64) return '';

    const key = getServerEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(cipherB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Creates a safe masked preview of an API key (e.g. "AIza...9xQp").
 * Never reveals the middle characters.
 */
export function maskApiKey(rawKey: string): string {
  const trimmed = (rawKey || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}...${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Computes a deterministic non-reversible fingerprint (16 hex chars) for duplicate detection.
 */
export function computeKeyFingerprint(rawKey: string): string {
  const trimmed = (rawKey || '').trim();
  if (!trimmed) return '';
  const key = getServerEncryptionKey();
  return crypto.createHmac('sha256', key).update(trimmed).digest('hex').slice(0, 16);
}

/**
 * Validates whether a string looks like a valid Google Gemini API key.
 * Rejects masked strings ("AIza...1234") so masked previews can never overwrite real keys.
 */
export function validateGoogleApiKeyFormat(rawKey: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = (rawKey || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'API anahtarı boş olamaz.' };
  }
  if (trimmed.includes('...') || trimmed.includes('*') || trimmed.includes('[GİZLENDİ]')) {
    return {
      valid: false,
      reason: 'Maskelenmiş anahtar değeri gerçek anahtar olarak kaydedilemez.',
    };
  }
  if (trimmed.length < 20 || trimmed.length > 128) {
    return {
      valid: false,
      reason: 'Google API anahtarı uzunluğu geçersiz görünüyor (en az 20 karakter olmalıdır).',
    };
  }
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      reason: 'API anahtarı boşluk karakteri içeremez.',
    };
  }
  return { valid: true };
}

// ============================================================================
// 2. TYPES & INTERFACES FOR CENTRAL KEY VAULT, MODELS & FAILOVER
// ============================================================================

export type ApiKeyRole = 'PRIMARY' | 'BACKUP' | 'PRODUCT_EDIT';
export type ApiKeyPurpose = 'BOTH' | 'CHATBOT' | 'PRODUCT_EDIT';
export type ApiKeyHealthStatus = 'ACTIVE' | 'INACTIVE' | 'INVALID' | 'COOLDOWN';

export interface StoredApiKeyEntry {
  id: string;
  name: string;
  encryptedKey: string;
  maskedPreview: string;
  fingerprint: string;
  role: ApiKeyRole;
  purpose: ApiKeyPurpose;
  projectTag: string;
  priority: number;
  isActive: boolean;
  status: ApiKeyHealthStatus;
  cooldownUntil: string | null;
  accessibleModelsCount: number;
  accessibleModels: string[];
  lastVerifiedAt: string | null;
  lastTestAt: string | null;
  lastTestResult: 'SUCCESS' | 'AUTH_ERROR' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'UNVERIFIED' | null;
  lastError: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
  source: 'DB_VAULT' | 'ENV';
}

/**
 * Safe version of StoredApiKeyEntry that NEVER includes `encryptedKey` or raw key.
 * Safe to return in admin API responses.
 */
export type SafeApiKeyMetadata = Omit<StoredApiKeyEntry, 'encryptedKey'>;

export type ModelStabilityTier =
  | 'STABLE_FLAGSHIP'
  | 'STABLE_FAST'
  | 'STABLE_OTHER'
  | 'PREVIEW_EXPERIMENTAL'
  | 'LEGACY'
  | 'UNSUPPORTED_FOR_TEXT';

export interface DiscoveredGeminiModel {
  technicalName: string; // e.g., "gemini-2.5-flash"
  fullResourceName: string; // e.g., "models/gemini-2.5-flash"
  displayName: string;
  version: string;
  description: string;
  supportedGenerationMethods: string[];
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportsTextGeneration: boolean;
  supportsDocumentInput: boolean;
  supportsImageInput: boolean;
  supportsStructuredJson: boolean;
  isSuitableForChat: boolean;
  isSuitableForProductEdit: boolean;
  suitabilityReason: string;
  stabilityTier: ModelStabilityTier;
  priorityRank: number;
}

export type GeminiErrorCategory =
  | 'AUTH_ERROR'
  | 'BILLING_PROJECT_ERROR'
  | 'MODEL_NOT_FOUND'
  | 'QUOTA_PROJECT_EXHAUSTED'
  | 'RATE_LIMIT_TEMP'
  | 'TRANSIENT_SERVER_ERROR'
  | 'TIMEOUT'
  | 'SAFETY_BLOCKED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

export interface ClassifiedGeminiError {
  category: GeminiErrorCategory;
  httpStatus?: number;
  userMessageTr: string;
  technicalReason: string;
  shouldMarkKeyInvalid: boolean;
  shouldCooldownKey: boolean;
  shouldCooldownProjectTag: boolean;
  shouldCooldownModel: boolean;
  cooldownDurationMs: number;
  canRetrySameModelAndKey: boolean;
  canSwitchToNextModelSameKey: boolean;
  canSwitchToNextKey: boolean;
}

export interface AiFailoverDiagnosticEvent {
  id: string;
  timestamp: string;
  context: 'CHATBOT' | 'PRODUCT_EDIT' | 'MODEL_TEST' | 'KEY_TEST';
  keyId: string;
  keyName: string;
  maskedKey: string;
  projectTag: string;
  modelName: string;
  eventType: 'SUCCESS' | 'FAILOVER_MODEL' | 'FAILOVER_KEY' | 'CIRCUIT_OPEN' | 'FINAL_FAILURE';
  errorCategory?: GeminiErrorCategory;
  message: string;
  latencyMs?: number;
}

export interface CircuitBreakerState {
  keyCooldowns: Record<string, { until: string; reason: string; category: GeminiErrorCategory }>;
  projectCooldowns: Record<string, { until: string; reason: string; category: GeminiErrorCategory }>;
  modelCooldowns: Record<string, { until: string; reason: string; category: GeminiErrorCategory }>;
}

export interface CentralAiVaultData {
  version: number;
  keys: StoredApiKeyEntry[];
  discoveredModelsCatalog: DiscoveredGeminiModel[];
  catalogUpdatedAt: string | null;
  catalogSourceKeyId: string | null;
  circuitBreaker: CircuitBreakerState;
  recentEvents: AiFailoverDiagnosticEvent[];
  auditLogs: Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    details: string;
  }>;
}

// ============================================================================
// 3. ERROR CLASSIFICATION ENGINE (SECTION 10.1 & 10.2)
// ============================================================================

export function classifyGeminiError(
  error: unknown,
  knownRawKeys: string[] = []
): ClassifiedGeminiError {
  const errObj = error as Record<string, unknown> | null;
  const rawMsg = sanitizeErrorMessage(error, knownRawKeys);
  const lower = rawMsg.toLowerCase();

  const status =
    typeof errObj?.status === 'number'
      ? errObj.status
      : typeof errObj?.statusCode === 'number'
        ? errObj.statusCode
        : typeof errObj?.httpStatus === 'number'
          ? errObj.httpStatus
          : undefined;

  // 1. SAFETY BLOCKED
  if (
    lower.includes('safety') ||
    lower.includes('blocked by safety') ||
    lower.includes('finish_reason: safety') ||
    lower.includes('recitation') ||
    lower.includes('prohibited_content')
  ) {
    return {
      category: 'SAFETY_BLOCKED',
      httpStatus: status,
      userMessageTr: 'İçerik güvenlik politikaları nedeniyle model tarafından işlenemedi.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: false,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: false,
      cooldownDurationMs: 0,
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: false,
      canSwitchToNextKey: false,
    };
  }

  // 2. BILLING / PROJECT SUSPENDED
  if (
    lower.includes('billing') ||
    lower.includes('project has been suspended') ||
    lower.includes('consumer_suspended') ||
    lower.includes('service_disabled') ||
    lower.includes('generative language api has not been used in project')
  ) {
    return {
      category: 'BILLING_PROJECT_ERROR',
      httpStatus: status ?? 403,
      userMessageTr:
        'Bu API anahtarının bağlı olduğu Google Cloud projesinde faturalandırma veya API erişimi kapalı.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: true,
      shouldCooldownProjectTag: true,
      shouldCooldownModel: false,
      cooldownDurationMs: 15 * 60 * 1000, // 15 min
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: false,
      canSwitchToNextKey: true,
    };
  }

  // 3. AUTH / INVALID KEY (401, 403 API_KEY_INVALID)
  if (
    status === 401 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key expired') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid api key') ||
    (status === 403 &&
      (lower.includes('permission_denied') ||
        lower.includes('key') ||
        lower.includes('forbidden') ||
        lower.includes('caller does not have permission')))
  ) {
    return {
      category: 'AUTH_ERROR',
      httpStatus: status ?? 401,
      userMessageTr: 'API anahtarı geçersiz, süresi dolmuş veya yetkisiz.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: true,
      shouldCooldownKey: true,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: false,
      cooldownDurationMs: 30 * 60 * 1000,
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: false,
      canSwitchToNextKey: true,
    };
  }

  // 4. MODEL NOT FOUND / UNSUPPORTED METHOD (404)
  if (
    status === 404 ||
    lower.includes('not_found') ||
    lower.includes('is not found for api version') ||
    lower.includes('is not supported for generatecontent') ||
    lower.includes('model not found') ||
    lower.includes('models/') && lower.includes('not found')
  ) {
    return {
      category: 'MODEL_NOT_FOUND',
      httpStatus: status ?? 404,
      userMessageTr: 'Seçilen model bu API sürümünde veya anahtarda bulunamadı / desteklenmiyor.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: false,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: true,
      cooldownDurationMs: 10 * 60 * 1000,
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: true,
      canSwitchToNextKey: true,
    };
  }

  // 5. QUOTA & RATE LIMIT (429 / RESOURCE_EXHAUSTED)
  if (
    status === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    const isProjectDailyQuota =
      lower.includes('perday') ||
      lower.includes('per_day') ||
      lower.includes('perproject') ||
      lower.includes('per_project') ||
      lower.includes('daily limit') ||
      lower.includes('check your plan and billing') ||
      lower.includes('quota_exceeded');

    if (isProjectDailyQuota) {
      return {
        category: 'QUOTA_PROJECT_EXHAUSTED',
        httpStatus: 429,
        userMessageTr:
          'Google Cloud projesi günlük/proje bazlı kota sınırına ulaştı. Farklı projedeki yedek anahtara geçiliyor.',
        technicalReason: rawMsg,
        shouldMarkKeyInvalid: false,
        shouldCooldownKey: true,
        shouldCooldownProjectTag: true,
        shouldCooldownModel: true,
        cooldownDurationMs: 5 * 60 * 1000, // 5 min project cooldown
        canRetrySameModelAndKey: false,
        canSwitchToNextModelSameKey: true, // Try next model if per-model daily quota, else project cooldown switches key
        canSwitchToNextKey: true,
      };
    }

    return {
      category: 'RATE_LIMIT_TEMP',
      httpStatus: 429,
      userMessageTr:
        'Anlık istek sınırı (RPM/TPM) aşıldı. Sıradaki uygun modele veya yedek anahtara geçiliyor.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: false,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: true,
      cooldownDurationMs: 60 * 1000, // 60s model cooldown
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: true,
      canSwitchToNextKey: true,
    };
  }

  // 6. TIMEOUT
  if (
    status === 504 ||
    status === 408 ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('aborted') ||
    lower.includes('aborterror') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('etimedout')
  ) {
    return {
      category: 'TIMEOUT',
      httpStatus: status ?? 504,
      userMessageTr: 'Model yanıt süresi zaman aşımına uğradı.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: false,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: true,
      cooldownDurationMs: 45 * 1000,
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: true,
      canSwitchToNextKey: true,
    };
  }

  // 7. TRANSIENT SERVER ERROR (500, 502, 503)
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    lower.includes('503') ||
    lower.includes('500') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('internal error') ||
    lower.includes('econnreset') ||
    lower.includes('fetch failed')
  ) {
    return {
      category: 'TRANSIENT_SERVER_ERROR',
      httpStatus: status ?? 503,
      userMessageTr: 'Google AI servisinde geçici yoğunluk veya sunucu hatası oluştu.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: false,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: true,
      cooldownDurationMs: 30 * 1000,
      canRetrySameModelAndKey: true,
      canSwitchToNextModelSameKey: true,
      canSwitchToNextKey: true,
    };
  }

  // 8. INVALID REQUEST (400)
  if (
    status === 400 ||
    lower.includes('invalid_argument') ||
    lower.includes('bad request') ||
    lower.includes('malformed')
  ) {
    const isModelCapabilityMismatch =
      lower.includes('json mode is not enabled') ||
      lower.includes('responsemimetype') ||
      lower.includes('response_mime_type') ||
      lower.includes('modality') ||
      lower.includes('system instruction is not enabled') ||
      lower.includes('developer instruction is not enabled');

    return {
      category: 'INVALID_REQUEST',
      httpStatus: 400,
      userMessageTr: isModelCapabilityMismatch
        ? 'Seçilen model bu istek biçimini (örn. yapılandırılmış JSON veya sistem talimatı) desteklemiyor.'
        : 'Geçersiz istek parametresi.',
      technicalReason: rawMsg,
      shouldMarkKeyInvalid: false,
      shouldCooldownKey: false,
      shouldCooldownProjectTag: false,
      shouldCooldownModel: isModelCapabilityMismatch,
      cooldownDurationMs: isModelCapabilityMismatch ? 5 * 60 * 1000 : 0,
      canRetrySameModelAndKey: false,
      canSwitchToNextModelSameKey: isModelCapabilityMismatch,
      canSwitchToNextKey: false,
    };
  }

  return {
    category: 'UNKNOWN_ERROR',
    httpStatus: status,
    userMessageTr: 'Yapay zekâ isteği sırasında beklenmeyen bir hata oluştu.',
    technicalReason: rawMsg,
    shouldMarkKeyInvalid: false,
    shouldCooldownKey: false,
    shouldCooldownProjectTag: false,
    shouldCooldownModel: true,
    cooldownDurationMs: 30 * 1000,
    canRetrySameModelAndKey: false,
    canSwitchToNextModelSameKey: true,
    canSwitchToNextKey: true,
  };
}

// ============================================================================
// 4. DYNAMIC MODEL DISCOVERY & CAPABILITY RANKING (SECTION 3.5 & 9)
// ============================================================================

interface RawGeminiApiModel {
  name?: string;
  baseModelId?: string;
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  temperature?: number;
  maxTemperature?: number;
}

/**
 * Classifies and ranks a raw model returned from Google Gemini API `v1beta/models`.
 * Uses official metadata (`supportedGenerationMethods`, `inputTokenLimit`, `outputTokenLimit`,
 * `description`, `displayName`, `version`) + capability heuristics instead of naive version string sorting.
 */
export function evaluateAndRankGeminiModel(raw: RawGeminiApiModel): DiscoveredGeminiModel {
  const fullResourceName = String(raw.name || '').trim();
  const technicalName = fullResourceName.replace(/^models\//i, '');
  const lowerName = technicalName.toLowerCase();
  const lowerDesc = String(raw.description || '').toLowerCase();
  const lowerDisplay = String(raw.displayName || technicalName).toLowerCase();
  const methods = Array.isArray(raw.supportedGenerationMethods)
    ? raw.supportedGenerationMethods
    : [];
  const inputTokenLimit = Number(raw.inputTokenLimit) || 32768;
  const outputTokenLimit = Number(raw.outputTokenLimit) || 4096;

  const hasGenerateContent = methods.includes('generateContent');
  const isEmbeddingOnly =
    methods.includes('embedContent') ||
    methods.includes('batchEmbedContents') ||
    lowerName.includes('embedding') ||
    lowerName.includes('text-embedding');
  const isImagenOrVideo =
    lowerName.includes('imagen') ||
    lowerName.includes('veo') ||
    methods.includes('predict') && !hasGenerateContent;
  const isAqaOrRetrievalOnly =
    lowerName === 'aqa' || methods.includes('generateAnswer') && !hasGenerateContent;
  const isSpecialNonGeneralText =
    lowerName.includes('tts') ||
    lowerName.includes('audio') ||
    lowerName.includes('native-audio') ||
    lowerName.includes('robotics') ||
    lowerName.includes('computer-use') ||
    lowerName.includes('medlm') ||
    lowerName.includes('gemma-3n');

  const isDeprecated =
    lowerDesc.includes('deprecated') ||
    lowerDesc.includes('discontinued') ||
    lowerDesc.includes('will be shut down') ||
    lowerName.startsWith('gemini-1.0') ||
    lowerName.startsWith('chat-bison') ||
    lowerName.startsWith('text-bison');

  const isPreviewOrExp =
    lowerName.includes('preview') ||
    lowerName.includes('exp') ||
    lowerName.includes('experimental') ||
    lowerName.includes('thinking') ||
    lowerDisplay.includes('preview') ||
    lowerDisplay.includes('experimental');

  const isLegacy =
    isDeprecated ||
    lowerName.startsWith('gemini-1.5') ||
    lowerName.startsWith('gemini-pro') ||
    lowerName.startsWith('gemini-ultra');

  const isGemmaModel = lowerName.startsWith('gemma-');

  const supportsTextGeneration =
    hasGenerateContent &&
    !isEmbeddingOnly &&
    !isImagenOrVideo &&
    !isAqaOrRetrievalOnly &&
    !lowerName.includes('tts') &&
    !lowerName.includes('native-audio');

  const isMultimodalGemini =
    supportsTextGeneration &&
    lowerName.includes('gemini') &&
    !lowerName.includes('gemini-1.0-pro');

  const supportsDocumentInput = isMultimodalGemini && inputTokenLimit >= 32000;
  const supportsImageInput =
    isMultimodalGemini || lowerName.includes('vision') || lowerName.includes('gemma-3-27b');
  const supportsStructuredJson =
    supportsTextGeneration &&
    lowerName.includes('gemini') &&
    !lowerName.startsWith('gemini-1.0');

  const isSuitableForChat =
    supportsTextGeneration && !isDeprecated && !isSpecialNonGeneralText;
  const isSuitableForProductEdit =
    supportsTextGeneration &&
    supportsStructuredJson &&
    !isDeprecated &&
    !isSpecialNonGeneralText &&
    outputTokenLimit >= 2048;

  let stabilityTier: ModelStabilityTier = 'UNSUPPORTED_FOR_TEXT';
  let priorityRank = 999;
  let suitabilityReason = '';

  if (!supportsTextGeneration || isSpecialNonGeneralText) {
    stabilityTier = 'UNSUPPORTED_FOR_TEXT';
    priorityRank = 900;
    if (isEmbeddingOnly) {
      suitabilityReason = 'Vektör gömme (Embedding) modeli — metin/sohbet yanıtı üretemez.';
    } else if (isImagenOrVideo) {
      suitabilityReason = 'Görsel/Video üretim modeli — metin/sohbet yanıtı için kullanılamaz.';
    } else if (isAqaOrRetrievalOnly) {
      suitabilityReason = 'Yalnızca AQA (Atıflı Soru-Cevap) modeli — genel metin üretimi desteklemez.';
    } else if (isSpecialNonGeneralText) {
      suitabilityReason = 'Özel amaçlı (Ses/TTS/Robotik) model — standart metin ve ürün düzenleme için uygun değildir.';
    } else {
      suitabilityReason = `generateContent desteklenmiyor (${methods.join(', ') || 'yöntem yok'}).`;
    }
  } else if (isLegacy) {
    stabilityTier = 'LEGACY';
    priorityRank = isDeprecated ? 550 : 500;
    suitabilityReason = isDeprecated
      ? 'Kullanımdan kaldırılmış / eski sürüm (Deprecated) — önerilmez.'
      : 'Eski nesil (Legacy) kararlı model — yedek olarak kullanılabilir.';
  } else if (isPreviewOrExp) {
    stabilityTier = 'PREVIEW_EXPERIMENTAL';
    // Rank newer preview models higher within tier 4
    if (lowerName.includes('2.5-pro') || lowerName.includes('3.5-pro') || lowerName.includes('3-pro')) {
      priorityRank = 410;
    } else if (lowerName.includes('2.5-flash') || lowerName.includes('3.5-flash') || lowerName.includes('3-flash')) {
      priorityRank = 420;
    } else {
      priorityRank = 450;
    }
    suitabilityReason =
      'Önizleme / Deneysel (Preview/Experimental) model — yüksek yetenekli ancak üretimde kota/kararlılık dalgalanması olabilir.';
  } else if (isGemmaModel) {
    stabilityTier = 'STABLE_OTHER';
    priorityRank = 350;
    suitabilityReason =
      'Açık ağırlıklı Gemma modeli — sohbet için kullanılabilir ancak yapılandırılmış JSON/belge şemalarında Gemini modelleri önerilir.';
  } else {
    // Active Stable Gemini Models!
    // Distinguish Tier 1 (General-purpose strong production models) vs Tier 2 (Fast/Lite production models) vs Tier 3 (Other stable)
    const isLite = lowerName.includes('lite') || lowerName.includes('8b');
    const isFlash = lowerName.includes('flash') && !isLite;
    const isPro = lowerName.includes('pro');

    if (isPro) {
      stabilityTier = 'STABLE_FLAGSHIP';
      if (lowerName.includes('2.5-pro') || lowerName.includes('3.5-pro') || lowerName.includes('3-pro')) {
        priorityRank = 10;
      } else if (lowerName.includes('2.0-pro')) {
        priorityRank = 20;
      } else {
        priorityRank = 30;
      }
      suitabilityReason =
        '1. Öncelik: Güncel, kararlı ve genel amaçlı güçlü üretim modeli (Karmaşık ürün düzenleme, belge analizi ve sohbet için ideal).';
    } else if (isFlash) {
      // Modern Flash (e.g. gemini-2.5-flash, gemini-2.0-flash) is both strong general-purpose and fast!
      if (lowerName.includes('2.5-flash') || lowerName.includes('3.5-flash') || lowerName.includes('3-flash')) {
        stabilityTier = 'STABLE_FLAGSHIP';
        priorityRank = 15;
        suitabilityReason =
          '1. Öncelik: Güncel, kararlı ve yüksek hızlı/yetenekli genel amaçlı üretim modeli.';
      } else if (lowerName.includes('2.0-flash') && !lowerName.includes('001')) {
        stabilityTier = 'STABLE_FAST';
        priorityRank = 110;
        suitabilityReason =
          '2. Öncelik: Kararlı ve hızlı üretim modeli (Sohbet ve yapılandırılmış JSON için yüksek performans).';
      } else if (lowerName.includes('2.0-flash-001') || lowerName === 'gemini-flash-latest') {
        stabilityTier = 'STABLE_FAST';
        priorityRank = 115;
        suitabilityReason =
          '2. Öncelik: Kararlı ve hızlı üretim modeli.';
      } else {
        stabilityTier = 'STABLE_FAST';
        priorityRank = 130;
        suitabilityReason = '2. Öncelik: Kararlı ve hızlı üretim modeli.';
      }
    } else if (isLite) {
      stabilityTier = 'STABLE_FAST';
      if (lowerName.includes('2.5-flash-lite') || lowerName.includes('3.5-flash-lite')) {
        priorityRank = 140;
      } else if (lowerName.includes('2.0-flash-lite') || lowerName === 'gemini-flash-lite-latest') {
        priorityRank = 150;
      } else {
        priorityRank = 160;
      }
      suitabilityReason =
        '2. Öncelik: Düşük gecikmeli, ekonomik ve hızlı kararlı üretim modeli.';
    } else {
      stabilityTier = 'STABLE_OTHER';
      priorityRank = 250;
      suitabilityReason = '3. Öncelik: Göreve uygun kararlı model.';
    }
  }

  return {
    technicalName,
    fullResourceName: fullResourceName || `models/${technicalName}`,
    displayName: raw.displayName || technicalName,
    version: raw.version || 'v1beta',
    description: raw.description || '',
    supportedGenerationMethods: methods,
    inputTokenLimit,
    outputTokenLimit,
    supportsTextGeneration,
    supportsDocumentInput,
    supportsImageInput,
    supportsStructuredJson,
    isSuitableForChat,
    isSuitableForProductEdit,
    suitabilityReason,
    stabilityTier,
    priorityRank,
  };
}

/**
 * Dynamically discovers ALL accessible models for a given Google API Key
 * by paginating through Google's official `v1beta/models` endpoint.
 * Never embeds the API key in the URL query string (uses `x-goog-api-key` header).
 */
export async function discoverAllGeminiModels(
  rawApiKey: string,
  options?: { timeoutMs?: number }
): Promise<{
  success: boolean;
  models: DiscoveredGeminiModel[];
  pagesFetched: number;
  errorCategory?: GeminiErrorCategory;
  errorMessage?: string;
}> {
  const formatCheck = validateGoogleApiKeyFormat(rawApiKey);
  if (!formatCheck.valid) {
    return {
      success: false,
      models: [],
      pagesFetched: 0,
      errorCategory: 'AUTH_ERROR',
      errorMessage: formatCheck.reason || 'Geçersiz API anahtarı biçimi.',
    };
  }

  const trimmedKey = rawApiKey.trim();
  const timeoutMs = options?.timeoutMs ?? 15000;
  const allRawModels: RawGeminiApiModel[] = [];
  let pageToken: string | undefined = undefined;
  let pagesFetched = 0;
  const maxPages = 20; // Up to 2,000 models safety limit

  try {
    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '100');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'x-goog-api-key': trimmedKey,
            Accept: 'application/json',
          },
          signal: controller.signal,
          cache: 'no-store',
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = response.statusText;
        }
        const classified = classifyGeminiError(
          {
            status: response.status,
            message: `HTTP ${response.status}: ${errorBody}`,
          },
          [trimmedKey]
        );
        return {
          success: false,
          models: [],
          pagesFetched,
          errorCategory: classified.category,
          errorMessage: `${classified.userMessageTr} (${classified.technicalReason})`,
        };
      }

      const data = (await response.json()) as {
        models?: RawGeminiApiModel[];
        nextPageToken?: string;
      };

      pagesFetched += 1;
      if (Array.isArray(data.models)) {
        allRawModels.push(...data.models);
      }

      pageToken = data.nextPageToken ? String(data.nextPageToken) : undefined;
    } while (pageToken && pagesFetched < maxPages);

    // Deduplicate by technicalName and rank
    const seen = new Set<string>();
    const evaluated: DiscoveredGeminiModel[] = [];
    for (const raw of allRawModels) {
      if (!raw?.name) continue;
      const ranked = evaluateAndRankGeminiModel(raw);
      if (!seen.has(ranked.technicalName)) {
        seen.add(ranked.technicalName);
        evaluated.push(ranked);
      }
    }

    // Sort by priorityRank ascending, then inputTokenLimit descending, then technicalName
    evaluated.sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
      if (b.inputTokenLimit !== a.inputTokenLimit) return b.inputTokenLimit - a.inputTokenLimit;
      return a.technicalName.localeCompare(b.technicalName);
    });

    return {
      success: true,
      models: evaluated,
      pagesFetched,
    };
  } catch (err) {
    const classified = classifyGeminiError(err, [trimmedKey]);
    return {
      success: false,
      models: [],
      pagesFetched,
      errorCategory: classified.category,
      errorMessage: `${classified.userMessageTr} (${classified.technicalReason})`,
    };
  }
}

// ============================================================================
// 5. CENTRAL ENCRYPTED KEY VAULT STORAGE & MIGRATION (SITE SETTINGS)
// ============================================================================

const DEFAULT_VAULT_DATA: CentralAiVaultData = {
  version: 1,
  keys: [],
  discoveredModelsCatalog: [],
  catalogUpdatedAt: null,
  catalogSourceKeyId: null,
  circuitBreaker: {
    keyCooldowns: {},
    projectCooldowns: {},
    modelCooldowns: {},
  },
  recentEvents: [],
  auditLogs: [],
};

/**
 * Loads the Central AI Vault from `SiteSettings` (`id: 'singleton'`).
 * Automatically migrates any legacy plaintext `geminiApiKey` stored in `SiteSettings.data`
 * into an AES-256-GCM encrypted vault entry and scrubs the plaintext field!
 */
export async function loadCentralAiVault(): Promise<CentralAiVaultData> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    const dataObj =
      settings?.data && typeof settings.data === 'object'
        ? { ...(settings.data as Record<string, unknown>) }
        : {};

    const rawVault =
      dataObj.centralAiKeyVault && typeof dataObj.centralAiKeyVault === 'object'
        ? (dataObj.centralAiKeyVault as Partial<CentralAiVaultData>)
        : {};

    const vault: CentralAiVaultData = {
      version: 1,
      keys: Array.isArray(rawVault.keys) ? [...rawVault.keys] : [],
      discoveredModelsCatalog: Array.isArray(rawVault.discoveredModelsCatalog)
        ? [...rawVault.discoveredModelsCatalog]
        : [],
      catalogUpdatedAt: rawVault.catalogUpdatedAt || null,
      catalogSourceKeyId: rawVault.catalogSourceKeyId || null,
      circuitBreaker: {
        keyCooldowns: rawVault.circuitBreaker?.keyCooldowns || {},
        projectCooldowns: rawVault.circuitBreaker?.projectCooldowns || {},
        modelCooldowns: rawVault.circuitBreaker?.modelCooldowns || {},
      },
      recentEvents: Array.isArray(rawVault.recentEvents)
        ? rawVault.recentEvents.slice(0, 60)
        : [],
      auditLogs: Array.isArray(rawVault.auditLogs)
        ? rawVault.auditLogs.slice(0, 100)
        : [],
    };

    let needsMigrationSave = false;

    // Ensure every stored key in vault is encrypted (never plaintext)
    for (const k of vault.keys) {
      if (k.encryptedKey && !k.encryptedKey.startsWith(ENCRYPTION_PREFIX)) {
        const plain = k.encryptedKey;
        k.encryptedKey = encryptApiKey(plain);
        k.maskedPreview = maskApiKey(plain);
        k.fingerprint = computeKeyFingerprint(plain);
        needsMigrationSave = true;
      }
    }

    // Migrate legacy plaintext `dataObj.geminiApiKey` if present
    const legacyPlainKey =
      typeof dataObj.geminiApiKey === 'string' ? dataObj.geminiApiKey.trim() : '';
    if (legacyPlainKey && validateGoogleApiKeyFormat(legacyPlainKey).valid) {
      const fp = computeKeyFingerprint(legacyPlainKey);
      const exists = vault.keys.some((k) => k.fingerprint === fp);
      if (!exists) {
        const now = new Date().toISOString();
        vault.keys.push({
          id: `key_migrated_${Date.now()}`,
          name: 'Mevcut Sistem Anahtarı (Otomatik Şifrelendi)',
          encryptedKey: encryptApiKey(legacyPlainKey),
          maskedPreview: maskApiKey(legacyPlainKey),
          fingerprint: fp,
          role: vault.keys.some((k) => k.role === 'PRIMARY') ? 'BACKUP' : 'PRIMARY',
          purpose: 'BOTH',
          projectTag: 'default-project',
          priority: vault.keys.length + 1,
          isActive: true,
          status: 'ACTIVE',
          cooldownUntil: null,
          accessibleModelsCount: vault.discoveredModelsCatalog.length,
          accessibleModels: vault.discoveredModelsCatalog.map((m) => m.technicalName),
          lastVerifiedAt: now,
          lastTestAt: now,
          lastTestResult: 'SUCCESS',
          lastError: null,
          consecutiveFailures: 0,
          createdAt: now,
          updatedAt: now,
          source: 'DB_VAULT',
        });
      }
      // Scrub legacy plaintext key from SiteSettings!
      delete dataObj.geminiApiKey;
      needsMigrationSave = true;
    }

    if (needsMigrationSave) {
      dataObj.centralAiKeyVault = vault;
      await prisma.siteSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', data: dataObj as object },
        update: { data: dataObj as object },
      });
    }

    return vault;
  } catch (err) {
    console.warn('[CentralAiVault] loadCentralAiVault fallback:', sanitizeErrorMessage(err));
    return { ...DEFAULT_VAULT_DATA };
  }
}

/**
 * Persists the Central AI Vault back to `SiteSettings` (`id: 'singleton'`).
 * Never writes plaintext keys.
 */
export async function saveCentralAiVault(vault: CentralAiVaultData): Promise<void> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
  });

  const dataObj =
    settings?.data && typeof settings.data === 'object'
      ? { ...(settings.data as Record<string, unknown>) }
      : {};

  // Ensure legacy plaintext field is always removed
  delete dataObj.geminiApiKey;

  // Enforce encryption on all keys before saving
  const sanitizedKeys = vault.keys
    .filter((k) => k.source !== 'ENV') // ENV keys are dynamic runtime fallbacks, not stored in DB
    .map((k, idx) => {
      const plain = decryptApiKey(k.encryptedKey);
      return {
        ...k,
        priority: typeof k.priority === 'number' ? k.priority : idx + 1,
        encryptedKey: plain ? encryptApiKey(plain) : k.encryptedKey,
        maskedPreview: plain ? maskApiKey(plain) : k.maskedPreview,
        fingerprint: plain ? computeKeyFingerprint(plain) : k.fingerprint,
      };
    });

  const vaultToSave: CentralAiVaultData = {
    ...vault,
    keys: sanitizedKeys,
    recentEvents: (vault.recentEvents || []).slice(0, 60),
    auditLogs: (vault.auditLogs || []).slice(0, 100),
  };

  dataObj.centralAiKeyVault = vaultToSave;

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', data: dataObj as object },
    update: { data: dataObj as object },
  });
}

/**
 * Returns `.env` fallback keys as virtual `StoredApiKeyEntry` items (marked with `source: 'ENV'`)
 * so the system maintains 100% backward compatibility with `.env` while clearly showing their source.
 */
export function getEnvFallbackKeyEntries(): Array<{
  entry: StoredApiKeyEntry;
  rawKey: string;
}> {
  const results: Array<{ entry: StoredApiKeyEntry; rawKey: string }> = [];
  const seenFingerprints = new Set<string>();

  const candidates: Array<{ envName: string; purpose: ApiKeyPurpose; label: string }> = [
    {
      envName: 'GEMINI_SUPPORT_API_KEY',
      purpose: 'BOTH',
      label: 'Ortam Değişkeni (.env: GEMINI_SUPPORT_API_KEY)',
    },
    {
      envName: 'GEMINI_API_KEY',
      purpose: 'BOTH',
      label: 'Ortam Değişkeni (.env: GEMINI_API_KEY)',
    },
    {
      envName: 'GEMINI_PRODUCT_IMPORT_API_KEY',
      purpose: 'PRODUCT_EDIT',
      label: 'Ortam Değişkeni (.env: GEMINI_PRODUCT_IMPORT_API_KEY)',
    },
  ];

  for (const c of candidates) {
    const raw = (process.env[c.envName] || '').trim();
    if (!raw || !validateGoogleApiKeyFormat(raw).valid) continue;
    const fp = computeKeyFingerprint(raw);
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);

    const now = new Date().toISOString();
    results.push({
      rawKey: raw,
      entry: {
        id: `env_${c.envName.toLowerCase()}`,
        name: c.label,
        encryptedKey: encryptApiKey(raw),
        maskedPreview: maskApiKey(raw),
        fingerprint: fp,
        role: 'BACKUP',
        purpose: c.purpose,
        projectTag: 'env-default-project',
        priority: 900 + results.length,
        isActive: true,
        status: 'ACTIVE',
        cooldownUntil: null,
        accessibleModelsCount: 0,
        accessibleModels: [],
        lastVerifiedAt: null,
        lastTestAt: null,
        lastTestResult: 'UNVERIFIED',
        lastError: null,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now,
        source: 'ENV',
      },
    });
  }

  return results;
}

/**
 * Strips `encryptedKey` so key metadata can be safely returned to admin UI.
 */
export function toSafeKeyMetadata(entry: StoredApiKeyEntry): SafeApiKeyMetadata {
  const { encryptedKey: _unused, ...safe } = entry;
  return safe;
}

/**
 * Lists all configured keys (DB vault + `.env` fallbacks) in safe masked format.
 */
export async function listSafeApiKeys(): Promise<{
  keys: SafeApiKeyMetadata[];
  catalog: DiscoveredGeminiModel[];
  catalogUpdatedAt: string | null;
  circuitBreaker: CircuitBreakerState;
  recentEvents: AiFailoverDiagnosticEvent[];
}> {
  const vault = await loadCentralAiVault();
  const envEntries = getEnvFallbackKeyEntries();

  const dbFingerprints = new Set(vault.keys.map((k) => k.fingerprint));
  const merged: StoredApiKeyEntry[] = [...vault.keys];

  for (const envItem of envEntries) {
    if (!dbFingerprints.has(envItem.entry.fingerprint)) {
      merged.push(envItem.entry);
    }
  }

  merged.sort((a, b) => {
    if (a.role === 'PRIMARY' && b.role !== 'PRIMARY') return -1;
    if (b.role === 'PRIMARY' && a.role !== 'PRIMARY') return 1;
    return a.priority - b.priority;
  });

  return {
    keys: merged.map(toSafeKeyMetadata),
    catalog: vault.discoveredModelsCatalog,
    catalogUpdatedAt: vault.catalogUpdatedAt,
    circuitBreaker: vault.circuitBreaker,
    recentEvents: vault.recentEvents,
  };
}

/**
 * Adds or updates a key in the Central AI Key Vault.
 * Note: Saving a key for `PRODUCT_EDIT` does NOT automatically promote it to the chatbot's `PRIMARY` key unless requested.
 */
export async function upsertVaultApiKey(params: {
  id?: string;
  rawApiKey?: string;
  name: string;
  role: ApiKeyRole;
  purpose: ApiKeyPurpose;
  projectTag?: string;
  priority?: number;
  isActive?: boolean;
  verifyModelsNow?: boolean;
  actor?: string;
}): Promise<{
  success: boolean;
  key?: SafeApiKeyMetadata;
  discoveredModels?: DiscoveredGeminiModel[];
  errorMessage?: string;
}> {
  const vault = await loadCentralAiVault();
  const now = new Date().toISOString();
  const projectTag = (params.projectTag || 'default-project').trim().toLowerCase() || 'default-project';

  // Case 1: Updating metadata of an existing key without changing its secret
  if (params.id && !params.rawApiKey) {
    const existingIdx = vault.keys.findIndex((k) => k.id === params.id);
    if (existingIdx === -1) {
      return { success: false, errorMessage: 'Güncellenecek API anahtarı bulunamadı.' };
    }

    const target = vault.keys[existingIdx];
    if (params.role === 'PRIMARY') {
      // Demote previous primary key to BACKUP
      for (const k of vault.keys) {
        if (k.id !== target.id && k.role === 'PRIMARY') {
          k.role = 'BACKUP';
          k.updatedAt = now;
        }
      }
    }

    target.name = params.name.trim() || target.name;
    target.role = params.role;
    target.purpose = params.purpose;
    target.projectTag = projectTag;
    if (typeof params.priority === 'number') target.priority = params.priority;
    if (typeof params.isActive === 'boolean') {
      target.isActive = params.isActive;
      target.status = params.isActive ? 'ACTIVE' : 'INACTIVE';
      if (params.isActive) {
        target.cooldownUntil = null;
        delete vault.circuitBreaker.keyCooldowns[target.id];
      }
    }
    target.updatedAt = now;

    vault.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: now,
      actor: params.actor || 'admin',
      action: 'KEY_METADATA_UPDATED',
      details: `Anahtar güncellendi: ${target.name} (${target.maskedPreview}) [Rol: ${target.role}, Durum: ${target.status}]`,
    });

    await saveCentralAiVault(vault);
    return { success: true, key: toSafeKeyMetadata(target) };
  }

  // Case 2: Adding a new key or replacing the secret of an existing key
  const rawKey = (params.rawApiKey || '').trim();
  const validation = validateGoogleApiKeyFormat(rawKey);
  if (!validation.valid) {
    return { success: false, errorMessage: validation.reason };
  }

  const fingerprint = computeKeyFingerprint(rawKey);
  const existingByFp = vault.keys.find(
    (k) => k.fingerprint === fingerprint && k.id !== params.id
  );

  // Optionally verify and discover models before saving
  let discoveredModels: DiscoveredGeminiModel[] = [];
  let verificationResult: StoredApiKeyEntry['lastTestResult'] = 'UNVERIFIED';
  let verificationError: string | null = null;
  let keyStatus: ApiKeyHealthStatus = params.isActive === false ? 'INACTIVE' : 'ACTIVE';

  if (params.verifyModelsNow !== false) {
    const discovery = await discoverAllGeminiModels(rawKey);
    if (discovery.success) {
      discoveredModels = discovery.models;
      verificationResult = 'SUCCESS';
      if (discoveredModels.length > 0) {
        vault.discoveredModelsCatalog = discoveredModels;
        vault.catalogUpdatedAt = now;
      }
    } else {
      verificationError = discovery.errorMessage || 'Model listesi alınamadı.';
      if (discovery.errorCategory === 'AUTH_ERROR') {
        verificationResult = 'AUTH_ERROR';
        keyStatus = 'INVALID';
        return {
          success: false,
          errorMessage: `API anahtarı doğrulanamadı: ${verificationError}`,
        };
      } else if (
        discovery.errorCategory === 'QUOTA_PROJECT_EXHAUSTED' ||
        discovery.errorCategory === 'RATE_LIMIT_TEMP'
      ) {
        verificationResult = 'QUOTA_EXCEEDED';
      } else {
        verificationResult = 'NETWORK_ERROR';
      }
    }
  }

  if (params.role === 'PRIMARY') {
    for (const k of vault.keys) {
      if (k.role === 'PRIMARY' && k.id !== params.id && k.id !== existingByFp?.id) {
        k.role = 'BACKUP';
        k.updatedAt = now;
      }
    }
  }

  const targetEntry = params.id
    ? vault.keys.find((k) => k.id === params.id)
    : existingByFp;

  if (targetEntry) {
    targetEntry.name = params.name.trim() || targetEntry.name;
    targetEntry.encryptedKey = encryptApiKey(rawKey);
    targetEntry.maskedPreview = maskApiKey(rawKey);
    targetEntry.fingerprint = fingerprint;
    targetEntry.role = params.role;
    targetEntry.purpose = params.purpose;
    targetEntry.projectTag = projectTag;
    if (typeof params.priority === 'number') targetEntry.priority = params.priority;
    targetEntry.isActive = params.isActive !== false;
    targetEntry.status = keyStatus;
    targetEntry.cooldownUntil = null;
    if (discoveredModels.length > 0) {
      targetEntry.accessibleModelsCount = discoveredModels.length;
      targetEntry.accessibleModels = discoveredModels.map((m) => m.technicalName);
      targetEntry.lastVerifiedAt = now;
    }
    targetEntry.lastTestAt = now;
    targetEntry.lastTestResult = verificationResult;
    targetEntry.lastError = verificationError;
    targetEntry.consecutiveFailures = 0;
    targetEntry.updatedAt = now;

    vault.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: now,
      actor: params.actor || 'admin',
      action: 'KEY_UPDATED',
      details: `Anahtar güncellendi: ${targetEntry.name} (${targetEntry.maskedPreview}) [Rol: ${targetEntry.role}]`,
    });

    await saveCentralAiVault(vault);
    return {
      success: true,
      key: toSafeKeyMetadata(targetEntry),
      discoveredModels,
    };
  }

  const newEntry: StoredApiKeyEntry = {
    id: `key_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    name:
      params.name.trim() ||
      (params.role === 'PRIMARY'
        ? 'Ana Chatbot API Anahtarı'
        : params.role === 'PRODUCT_EDIT'
          ? 'Ürün Düzenleme Anahtarı'
          : `Yedek Anahtar #${vault.keys.length + 1}`),
    encryptedKey: encryptApiKey(rawKey),
    maskedPreview: maskApiKey(rawKey),
    fingerprint,
    role: params.role,
    purpose: params.purpose,
    projectTag,
    priority:
      typeof params.priority === 'number'
        ? params.priority
        : params.role === 'PRIMARY'
          ? 1
          : vault.keys.length + 2,
    isActive: params.isActive !== false,
    status: keyStatus,
    cooldownUntil: null,
    accessibleModelsCount: discoveredModels.length,
    accessibleModels: discoveredModels.map((m) => m.technicalName),
    lastVerifiedAt: discoveredModels.length > 0 ? now : null,
    lastTestAt: now,
    lastTestResult: verificationResult,
    lastError: verificationError,
    consecutiveFailures: 0,
    createdAt: now,
    updatedAt: now,
    source: 'DB_VAULT',
  };

  if (discoveredModels.length > 0) {
    vault.catalogSourceKeyId = newEntry.id;
  }

  vault.keys.push(newEntry);
  vault.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    timestamp: now,
    actor: params.actor || 'admin',
    action: 'KEY_ADDED',
    details: `Yeni anahtar eklendi: ${newEntry.name} (${newEntry.maskedPreview}) [Rol: ${newEntry.role}, Amaç: ${newEntry.purpose}]`,
  });

  await saveCentralAiVault(vault);
  return {
    success: true,
    key: toSafeKeyMetadata(newEntry),
    discoveredModels,
  };
}

/**
 * Deletes a key from the Central AI Key Vault by ID.
 */
export async function deleteVaultApiKey(
  keyId: string,
  actor = 'admin'
): Promise<{ success: boolean; errorMessage?: string }> {
  const vault = await loadCentralAiVault();
  const idx = vault.keys.findIndex((k) => k.id === keyId);
  if (idx === -1) {
    return { success: false, errorMessage: 'Silinecek anahtar bulunamadı.' };
  }

  const removed = vault.keys[idx];
  vault.keys.splice(idx, 1);
  delete vault.circuitBreaker.keyCooldowns[keyId];

  // If primary key was deleted and there is an active backup key for chatbot, keep roles consistent
  if (removed.role === 'PRIMARY') {
    const nextCandidate = vault.keys
      .filter((k) => k.isActive && (k.purpose === 'BOTH' || k.purpose === 'CHATBOT'))
      .sort((a, b) => a.priority - b.priority)[0];
    if (nextCandidate) {
      nextCandidate.role = 'PRIMARY';
      nextCandidate.priority = 1;
    }
  }

  vault.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    action: 'KEY_DELETED',
    details: `Anahtar silindi: ${removed.name} (${removed.maskedPreview})`,
  });

  await saveCentralAiVault(vault);
  return { success: true };
}

/**
 * Tests a stored key (by `keyId`) or a raw transient key, optionally running a live generation test
 * against a specific model, and updates the key's health status & model catalog.
 */
export async function testApiKeyAndDiscoverModels(params: {
  keyId?: string;
  rawApiKey?: string;
  testModelName?: string;
}): Promise<{
  success: boolean;
  keyMetadata?: SafeApiKeyMetadata;
  models: DiscoveredGeminiModel[];
  pagesFetched: number;
  liveGenerationTest?: {
    testedModel: string;
    success: boolean;
    latencyMs: number;
    responsePreview?: string;
    error?: string;
  };
  errorCategory?: GeminiErrorCategory;
  errorMessage?: string;
}> {
  const vault = await loadCentralAiVault();
  const now = new Date().toISOString();

  let rawKey = (params.rawApiKey || '').trim();
  let targetEntry: StoredApiKeyEntry | undefined;

  if (params.keyId) {
    targetEntry = vault.keys.find((k) => k.id === params.keyId);
    if (!targetEntry) {
      const envMatch = getEnvFallbackKeyEntries().find((e) => e.entry.id === params.keyId);
      if (envMatch) {
        targetEntry = envMatch.entry;
        rawKey = envMatch.rawKey;
      }
    } else {
      rawKey = decryptApiKey(targetEntry.encryptedKey);
    }
  }

  if (!rawKey) {
    return {
      success: false,
      models: [],
      pagesFetched: 0,
      errorCategory: 'AUTH_ERROR',
      errorMessage: 'Test edilecek geçerli bir API anahtarı bulunamadı.',
    };
  }

  const discovery = await discoverAllGeminiModels(rawKey);

  let liveTestResult: {
    testedModel: string;
    success: boolean;
    latencyMs: number;
    responsePreview?: string;
    error?: string;
  } | undefined;

  if (discovery.success && params.testModelName) {
    const modelToTest = params.testModelName.replace(/^models\//i, '');
    const startMs = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToTest)}:generateContent`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-goog-api-key': rawKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Merhaba, bağlantı testi için sadece OK yaz.' }] }],
            generationConfig: { maxOutputTokens: 16, temperature: 0 },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const latencyMs = Date.now() - startMs;
      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
        liveTestResult = {
          testedModel: modelToTest,
          success: true,
          latencyMs,
          responsePreview: text.trim().slice(0, 80),
        };
      } else {
        const errText = await res.text();
        const classified = classifyGeminiError(
          { status: res.status, message: errText },
          [rawKey]
        );
        liveTestResult = {
          testedModel: modelToTest,
          success: false,
          latencyMs,
          error: `${classified.userMessageTr} (${classified.technicalReason})`,
        };
      }
    } catch (err) {
      const classified = classifyGeminiError(err, [rawKey]);
      liveTestResult = {
        testedModel: modelToTest,
        success: false,
        latencyMs: Date.now() - startMs,
        error: `${classified.userMessageTr} (${classified.technicalReason})`,
      };
    }
  }

  if (targetEntry && targetEntry.source === 'DB_VAULT') {
    targetEntry.lastTestAt = now;
    if (discovery.success) {
      targetEntry.status = targetEntry.isActive ? 'ACTIVE' : 'INACTIVE';
      targetEntry.cooldownUntil = null;
      targetEntry.lastVerifiedAt = now;
      targetEntry.lastTestResult = 'SUCCESS';
      targetEntry.lastError = null;
      targetEntry.consecutiveFailures = 0;
      targetEntry.accessibleModelsCount = discovery.models.length;
      targetEntry.accessibleModels = discovery.models.map((m) => m.technicalName);
      delete vault.circuitBreaker.keyCooldowns[targetEntry.id];
      delete vault.circuitBreaker.projectCooldowns[targetEntry.projectTag];

      vault.discoveredModelsCatalog = discovery.models;
      vault.catalogUpdatedAt = now;
      vault.catalogSourceKeyId = targetEntry.id;
    } else {
      targetEntry.lastError = discovery.errorMessage || 'Test başarısız.';
      targetEntry.consecutiveFailures += 1;
      if (discovery.errorCategory === 'AUTH_ERROR') {
        targetEntry.status = 'INVALID';
        targetEntry.lastTestResult = 'AUTH_ERROR';
      } else if (
        discovery.errorCategory === 'QUOTA_PROJECT_EXHAUSTED' ||
        discovery.errorCategory === 'RATE_LIMIT_TEMP'
      ) {
        targetEntry.status = 'COOLDOWN';
        targetEntry.lastTestResult = 'QUOTA_EXCEEDED';
      } else {
        targetEntry.lastTestResult = 'NETWORK_ERROR';
      }
    }
    targetEntry.updatedAt = now;
    await saveCentralAiVault(vault);
  } else if (discovery.success && discovery.models.length > 0) {
    vault.discoveredModelsCatalog = discovery.models;
    vault.catalogUpdatedAt = now;
    await saveCentralAiVault(vault);
  }

  return {
    success: discovery.success,
    keyMetadata: targetEntry ? toSafeKeyMetadata(targetEntry) : undefined,
    models: discovery.models,
    pagesFetched: discovery.pagesFetched,
    liveGenerationTest: liveTestResult,
    errorCategory: discovery.errorCategory,
    errorMessage: discovery.errorMessage,
  };
}

// ============================================================================
// 6. SMART EXECUTION & FAILOVER ENGINE (PART D — SECTIONS 9, 10 & 11)
// ============================================================================

export interface SmartFailoverExecutionRequest {
  context: 'CHATBOT' | 'PRODUCT_EDIT';
  /**
   * Optional explicit key selection (e.g. from `/admin/products` "AI İle Düzenle"):
   * - `savedKeyId`: use a specific key from the vault first
   * - `rawApiKey`: use a transient or newly entered API key
   * - `allowBackupFailover`: whether to fall back to other active keys if primary key fails
   */
  keySelection?: {
    savedKeyId?: string;
    rawApiKey?: string;
    keyName?: string;
    projectTag?: string;
    allowBackupFailover?: boolean;
  };
  preferredModel?: string;
  modelPriorityList?: string[];
  disabledModels?: string[];
  autoFallbackEnabled?: boolean;
  maxRetriesPerAttempt?: number;
  retryBackoffMs?: number;
  requestTimeoutMs?: number;
  totalTimeoutBudgetMs?: number;
  requireStructuredJson?: boolean;
  requireDocumentSupport?: boolean;
  /**
   * Payload for `generateContent`
   */
  systemInstruction?: string;
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    >;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
}

export interface SmartFailoverExecutionResult {
  success: boolean;
  text: string;
  usedKeyId: string;
  usedKeyName: string;
  usedKeyMasked: string;
  usedModel: string;
  attemptsCount: number;
  failoverOccurred: boolean;
  attemptedTrail: Array<{
    keyName: string;
    maskedKey: string;
    projectTag: string;
    model: string;
    status: 'SUCCESS' | 'SKIPPED_COOLDOWN' | 'FAILED';
    errorCategory?: GeminiErrorCategory;
    errorMessage?: string;
    latencyMs: number;
  }>;
  finalErrorCategory?: GeminiErrorCategory;
  finalErrorMessage?: string;
}

function isCooldownActive(untilIso: string | undefined | null, nowMs: number): boolean {
  if (!untilIso) return false;
  const ts = Date.parse(untilIso);
  return !Number.isNaN(ts) && ts > nowMs;
}

/**
 * Default ordered fallback model list used only if a key hasn't cached its discovered catalog yet;
 * dynamically discovered models for the key always take precedence.
 */
const DEFAULT_BOOTSTRAP_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

/**
 * Executes a Gemini `generateContent` request with:
 * - Dynamic key selection (Primary -> Backup 1 -> Backup 2 ... -> .env fallback)
 * - Project-tag quota awareness (if Key 1 hits project quota, skips other keys sharing the same `projectTag` and jumps to a different project's key!)
 * - Dynamic model priority chain (Preferred model -> Ranked suitable models from catalog)
 * - Per-key, per-project, and per-model circuit breaker cooldowns
 * - Bounded retry and total timeout budget enforcement
 */
export async function executeWithSmartFailover(
  req: SmartFailoverExecutionRequest
): Promise<SmartFailoverExecutionResult> {
  const vault = await loadCentralAiVault();
  const nowMs = Date.now();
  const totalBudgetMs = req.totalTimeoutBudgetMs ?? 45000;
  const perAttemptTimeoutMs = req.requestTimeoutMs ?? 20000;
  const maxRetries = Math.max(0, Math.min(2, req.maxRetriesPerAttempt ?? 1));
  const retryBackoffMs = req.retryBackoffMs ?? 600;
  const autoFallback = req.autoFallbackEnabled !== false;

  // 1. Assemble candidate keys in priority order
  interface CandidateKey {
    id: string;
    name: string;
    rawKey: string;
    maskedPreview: string;
    projectTag: string;
    accessibleModels: string[];
    isDbKey: boolean;
  }

  const candidateKeys: CandidateKey[] = [];
  const allKnownRawKeys: string[] = [];

  // 1a. Explicit transient raw key if provided
  if (req.keySelection?.rawApiKey) {
    const raw = req.keySelection.rawApiKey.trim();
    const check = validateGoogleApiKeyFormat(raw);
    if (!check.valid) {
      return {
        success: false,
        text: '',
        usedKeyId: 'transient_invalid',
        usedKeyName: req.keySelection.keyName || 'Geçici Anahtar',
        usedKeyMasked: maskApiKey(raw),
        usedModel: req.preferredModel || '',
        attemptsCount: 0,
        failoverOccurred: false,
        attemptedTrail: [],
        finalErrorCategory: 'AUTH_ERROR',
        finalErrorMessage: check.reason || 'Geçersiz API anahtarı biçimi.',
      };
    }
    allKnownRawKeys.push(raw);
    candidateKeys.push({
      id: 'transient_key',
      name: req.keySelection.keyName || 'Geçici İşlem Anahtarı',
      rawKey: raw,
      maskedPreview: maskApiKey(raw),
      projectTag: req.keySelection.projectTag || 'transient-project',
      accessibleModels: [],
      isDbKey: false,
    });
  }

  // 1b. Explicit saved key if requested
  if (req.keySelection?.savedKeyId) {
    const saved = vault.keys.find((k) => k.id === req.keySelection?.savedKeyId);
    if (saved) {
      const raw = decryptApiKey(saved.encryptedKey);
      if (raw) {
        allKnownRawKeys.push(raw);
        candidateKeys.push({
          id: saved.id,
          name: saved.name,
          rawKey: raw,
          maskedPreview: saved.maskedPreview,
          projectTag: saved.projectTag || 'default-project',
          accessibleModels: saved.accessibleModels || [],
          isDbKey: true,
        });
      }
    } else {
      const envMatch = getEnvFallbackKeyEntries().find(
        (e) => e.entry.id === req.keySelection?.savedKeyId
      );
      if (envMatch) {
        allKnownRawKeys.push(envMatch.rawKey);
        candidateKeys.push({
          id: envMatch.entry.id,
          name: envMatch.entry.name,
          rawKey: envMatch.rawKey,
          maskedPreview: envMatch.entry.maskedPreview,
          projectTag: envMatch.entry.projectTag,
          accessibleModels: [],
          isDbKey: false,
        });
      }
    }
  }

  // 1c. Add active DB vault keys & .env fallback keys if no explicit key was locked or if backup failover is allowed
  const allowBackupKeys =
    req.keySelection?.allowBackupFailover !== false &&
    (!req.keySelection?.rawApiKey || req.keySelection?.allowBackupFailover === true);

  if (candidateKeys.length === 0 || (allowBackupKeys && autoFallback)) {
    const sortedDbKeys = [...vault.keys]
      .filter((k) => {
        if (!k.isActive || k.status === 'INACTIVE' || k.status === 'INVALID') return false;
        if (req.context === 'CHATBOT' && k.purpose === 'PRODUCT_EDIT') return false;
        return true;
      })
      .sort((a, b) => {
        if (a.role === 'PRIMARY' && b.role !== 'PRIMARY') return -1;
        if (b.role === 'PRIMARY' && a.role !== 'PRIMARY') return 1;
        return a.priority - b.priority;
      });

    for (const dbKey of sortedDbKeys) {
      if (candidateKeys.some((ck) => ck.id === dbKey.id)) continue;
      const raw = decryptApiKey(dbKey.encryptedKey);
      if (!raw) continue;
      allKnownRawKeys.push(raw);
      candidateKeys.push({
        id: dbKey.id,
        name: dbKey.name,
        rawKey: raw,
        maskedPreview: dbKey.maskedPreview,
        projectTag: dbKey.projectTag || 'default-project',
        accessibleModels: dbKey.accessibleModels || [],
        isDbKey: true,
      });
    }

    // Also append .env fallback keys at the end of the queue if not already present
    for (const envItem of getEnvFallbackKeyEntries()) {
      if (candidateKeys.some((ck) => ck.rawKey === envItem.rawKey)) continue;
      allKnownRawKeys.push(envItem.rawKey);
      candidateKeys.push({
        id: envItem.entry.id,
        name: envItem.entry.name,
        rawKey: envItem.rawKey,
        maskedPreview: envItem.entry.maskedPreview,
        projectTag: envItem.entry.projectTag,
        accessibleModels: [],
        isDbKey: false,
      });
    }
  }

  if (candidateKeys.length === 0) {
    return {
      success: false,
      text: '',
      usedKeyId: 'none',
      usedKeyName: 'Yok',
      usedKeyMasked: '',
      usedModel: '',
      attemptsCount: 0,
      failoverOccurred: false,
      attemptedTrail: [],
      finalErrorCategory: 'AUTH_ERROR',
      finalErrorMessage:
        'Sistemde aktif bir Google API Anahtarı bulunamadı. Lütfen Ayarlar > Anahtar Yönetimi bölümünden geçerli bir anahtar ekleyin.',
    };
  }

  // 2. Build ordered list of eligible models
  const disabledSet = new Set(
    (req.disabledModels || []).map((m) => m.replace(/^models\//i, '').toLowerCase())
  );

  const catalogModels = vault.discoveredModelsCatalog.filter((m) => {
    if (disabledSet.has(m.technicalName.toLowerCase())) return false;
    if (!m.supportsTextGeneration) return false;
    if (req.context === 'CHATBOT' && !m.isSuitableForChat) return false;
    if (req.context === 'PRODUCT_EDIT' && !m.isSuitableForProductEdit) return false;
    if (req.requireStructuredJson && !m.supportsStructuredJson) return false;
    if (req.requireDocumentSupport && !m.supportsDocumentInput) return false;
    return true;
  });

  const buildModelQueueForKey = (ck: CandidateKey): string[] => {
    const queue: string[] = [];
    const addModel = (name?: string) => {
      if (!name) return;
      const clean = name.replace(/^models\//i, '').trim();
      if (!clean) return;
      if (disabledSet.has(clean.toLowerCase())) return;
      // Check if catalog explicitly marks this model as unsupported for text
      const catEntry = vault.discoveredModelsCatalog.find(
        (m) => m.technicalName.toLowerCase() === clean.toLowerCase()
      );
      if (catEntry && !catEntry.supportsTextGeneration) return;
      if (!queue.includes(clean)) {
        queue.push(clean);
      }
    };

    // 1st priority: explicitly preferred model
    addModel(req.preferredModel);

    if (autoFallback) {
      // 2nd priority: admin-configured priority list
      if (Array.isArray(req.modelPriorityList)) {
        for (const m of req.modelPriorityList) addModel(m);
      }
      // 3rd priority: dynamically discovered & ranked catalog models
      for (const m of catalogModels) {
        if (ck.accessibleModels.length === 0 || ck.accessibleModels.includes(m.technicalName)) {
          addModel(m.technicalName);
        }
      }
      // 4th priority: bootstrap defaults if catalog was empty
      if (queue.length === 0 || catalogModels.length === 0) {
        for (const m of DEFAULT_BOOTSTRAP_MODELS) addModel(m);
      }
    }

    return queue;
  };

  const attemptedTrail: SmartFailoverExecutionResult['attemptedTrail'] = [];
  let attemptsCount = 0;
  let lastErrorCategory: GeminiErrorCategory = 'UNKNOWN_ERROR';
  let lastErrorMessage = 'Tüm model ve anahtar denemeleri başarısız oldu.';
  let vaultModified = false;

  const recordDiagnosticEvent = (
    ck: CandidateKey,
    modelName: string,
    eventType: AiFailoverDiagnosticEvent['eventType'],
    message: string,
    errorCategory?: GeminiErrorCategory,
    latencyMs?: number
  ) => {
    vault.recentEvents.unshift({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      context: req.context,
      keyId: ck.id,
      keyName: ck.name,
      maskedKey: ck.maskedPreview,
      projectTag: ck.projectTag,
      modelName,
      eventType,
      errorCategory,
      message: sanitizeErrorMessage(message, allKnownRawKeys),
      latencyMs,
    });
    vaultModified = true;
  };

  // 3. Iterate across candidate keys and models
  outerKeyLoop: for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const ck = candidateKeys[keyIdx];
    const currentNow = Date.now();
    if (currentNow - nowMs >= totalBudgetMs && attemptsCount > 0) {
      lastErrorCategory = 'TIMEOUT';
      lastErrorMessage = 'Toplam yanıt süresi bütçesi aşıldı.';
      break;
    }

    // Check key-level or project-level circuit breaker cooldown (unless this is the only key left!)
    const keyCooldown = vault.circuitBreaker.keyCooldowns[ck.id];
    const projCooldown = vault.circuitBreaker.projectCooldowns[ck.projectTag];
    const hasMoreKeysAfterThis = keyIdx < candidateKeys.length - 1;

    if (hasMoreKeysAfterThis && isCooldownActive(keyCooldown?.until, currentNow)) {
      attemptedTrail.push({
        keyName: ck.name,
        maskedKey: ck.maskedPreview,
        projectTag: ck.projectTag,
        model: '*',
        status: 'SKIPPED_COOLDOWN',
        errorCategory: keyCooldown.category,
        errorMessage: `Anahtar bekleme süresinde (Cooldown): ${keyCooldown.reason}`,
        latencyMs: 0,
      });
      continue;
    }

    if (hasMoreKeysAfterThis && isCooldownActive(projCooldown?.until, currentNow)) {
      attemptedTrail.push({
        keyName: ck.name,
        maskedKey: ck.maskedPreview,
        projectTag: ck.projectTag,
        model: '*',
        status: 'SKIPPED_COOLDOWN',
        errorCategory: projCooldown.category,
        errorMessage: `Proje (${ck.projectTag}) kota bekleme süresinde: ${projCooldown.reason}`,
        latencyMs: 0,
      });
      continue;
    }

    // If this key has never discovered models yet and we have no catalog, do a fast discovery
    let modelsQueue = buildModelQueueForKey(ck);
    if (modelsQueue.length === 0) {
      const disc = await discoverAllGeminiModels(ck.rawKey, { timeoutMs: 8000 });
      if (disc.success && disc.models.length > 0) {
        vault.discoveredModelsCatalog = disc.models;
        vault.catalogUpdatedAt = new Date().toISOString();
        ck.accessibleModels = disc.models.map((m) => m.technicalName);
        vaultModified = true;
        modelsQueue = buildModelQueueForKey(ck);
      }
    }

    let consecutiveRateLimitsOnThisKey = 0;

    for (let modelIdx = 0; modelIdx < modelsQueue.length; modelIdx++) {
      const modelName = modelsQueue[modelIdx];
      const modelCooldownKey = `${ck.id}:${modelName}`;
      const modelCooldown = vault.circuitBreaker.modelCooldowns[modelCooldownKey];
      const hasMoreModelsOrKeys =
        modelIdx < modelsQueue.length - 1 || keyIdx < candidateKeys.length - 1;

      if (hasMoreModelsOrKeys && isCooldownActive(modelCooldown?.until, Date.now())) {
        attemptedTrail.push({
          keyName: ck.name,
          maskedKey: ck.maskedPreview,
          projectTag: ck.projectTag,
          model: modelName,
          status: 'SKIPPED_COOLDOWN',
          errorCategory: modelCooldown.category,
          errorMessage: `Model bekleme süresinde: ${modelCooldown.reason}`,
          latencyMs: 0,
        });
        continue;
      }

      // Execute request (with limited retry for transient 503/500 errors)
      let retryIdx = 0;
      while (retryIdx <= maxRetries) {
        if (Date.now() - nowMs >= totalBudgetMs && attemptsCount > 0) {
          break outerKeyLoop;
        }

        attemptsCount += 1;
        const attemptStart = Date.now();

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
          const remainingBudget = Math.max(4000, totalBudgetMs - (Date.now() - nowMs));
          const effectiveTimeout = Math.min(perAttemptTimeoutMs, remainingBudget);

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), effectiveTimeout);

          const bodyPayload: Record<string, unknown> = {
            contents: req.contents,
          };

          if (req.systemInstruction) {
            bodyPayload.systemInstruction = {
              parts: [{ text: req.systemInstruction }],
            };
          }

          if (req.generationConfig) {
            bodyPayload.generationConfig = { ...req.generationConfig };
          }

          let response: Response;
          try {
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'x-goog-api-key': ck.rawKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(bodyPayload),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }

          const latencyMs = Date.now() - attemptStart;

          if (!response.ok) {
            const errBody = await response.text();
            throw {
              status: response.status,
              message: `HTTP ${response.status}: ${errBody}`,
            };
          }

          const data = (await response.json()) as {
            candidates?: Array<{
              finishReason?: string;
              content?: { parts?: Array<{ text?: string }> };
            }>;
            promptFeedback?: { blockReason?: string };
          };

          if (data.promptFeedback?.blockReason) {
            throw new Error(`Blocked by safety: ${data.promptFeedback.blockReason}`);
          }

          const finishReason = data.candidates?.[0]?.finishReason;
          if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
            throw new Error(`Finish reason: ${finishReason} (Safety policy)`);
          }

          const parts = data.candidates?.[0]?.content?.parts || [];
          const outputText = parts
            .map((p) => p.text || '')
            .join('')
            .trim();

          if (!outputText) {
            throw new Error('Model boş yanıt döndürdü.');
          }

          // SUCCESS! Clear cooldowns for this key & model
          delete vault.circuitBreaker.keyCooldowns[ck.id];
          delete vault.circuitBreaker.projectCooldowns[ck.projectTag];
          delete vault.circuitBreaker.modelCooldowns[modelCooldownKey];

          if (ck.isDbKey) {
            const dbEntry = vault.keys.find((k) => k.id === ck.id);
            if (dbEntry) {
              dbEntry.status = dbEntry.isActive ? 'ACTIVE' : 'INACTIVE';
              dbEntry.cooldownUntil = null;
              dbEntry.consecutiveFailures = 0;
              dbEntry.lastError = null;
              dbEntry.updatedAt = new Date().toISOString();
              vaultModified = true;
            }
          }

          attemptedTrail.push({
            keyName: ck.name,
            maskedKey: ck.maskedPreview,
            projectTag: ck.projectTag,
            model: modelName,
            status: 'SUCCESS',
            latencyMs,
          });

          const failoverOccurred = attemptedTrail.filter((t) => t.status === 'FAILED').length > 0;
          if (failoverOccurred) {
            recordDiagnosticEvent(
              ck,
              modelName,
              'SUCCESS',
              `Yedek geçiş sonrası başarılı yanıt alındı (${ck.name} -> ${modelName}).`,
              undefined,
              latencyMs
            );
          }

          if (vaultModified) {
            await saveCentralAiVault(vault);
          }

          return {
            success: true,
            text: outputText,
            usedKeyId: ck.id,
            usedKeyName: ck.name,
            usedKeyMasked: ck.maskedPreview,
            usedModel: modelName,
            attemptsCount,
            failoverOccurred,
            attemptedTrail,
          };
        } catch (err) {
          const latencyMs = Date.now() - attemptStart;
          const classified = classifyGeminiError(err, allKnownRawKeys);
          lastErrorCategory = classified.category;
          lastErrorMessage = `${classified.userMessageTr} (${classified.technicalReason})`;

          attemptedTrail.push({
            keyName: ck.name,
            maskedKey: ck.maskedPreview,
            projectTag: ck.projectTag,
            model: modelName,
            status: 'FAILED',
            errorCategory: classified.category,
            errorMessage: lastErrorMessage,
            latencyMs,
          });

          // If transient server error and retry allowed, backoff and retry same model once
          if (classified.canRetrySameModelAndKey && retryIdx < maxRetries) {
            retryIdx += 1;
            await new Promise((r) => setTimeout(r, retryBackoffMs * retryIdx));
            continue;
          }

          // Update circuit breaker & key status based on error classification
          const cooldownUntilIso =
            classified.cooldownDurationMs > 0
              ? new Date(Date.now() + classified.cooldownDurationMs).toISOString()
              : null;

          if (classified.shouldCooldownModel && cooldownUntilIso) {
            vault.circuitBreaker.modelCooldowns[modelCooldownKey] = {
              until: cooldownUntilIso,
              reason: classified.userMessageTr,
              category: classified.category,
            };
            vaultModified = true;
          }

          if (
            classified.category === 'RATE_LIMIT_TEMP' ||
            classified.category === 'QUOTA_PROJECT_EXHAUSTED'
          ) {
            consecutiveRateLimitsOnThisKey += 1;
          }

          // If 2 consecutive models on the same key hit 429, it's a project-wide RPM/TPM or daily quota limit!
          const escalateToProjectCooldown =
            classified.shouldCooldownProjectTag || consecutiveRateLimitsOnThisKey >= 2;

          if (classified.shouldMarkKeyInvalid || classified.shouldCooldownKey || escalateToProjectCooldown) {
            const effectiveCooldownIso =
              cooldownUntilIso || new Date(Date.now() + 2 * 60 * 1000).toISOString();

            vault.circuitBreaker.keyCooldowns[ck.id] = {
              until: effectiveCooldownIso,
              reason: classified.userMessageTr,
              category: classified.category,
            };

            if (escalateToProjectCooldown) {
              vault.circuitBreaker.projectCooldowns[ck.projectTag] = {
                until: effectiveCooldownIso,
                reason: classified.userMessageTr,
                category: classified.category,
              };
            }

            if (ck.isDbKey) {
              const dbEntry = vault.keys.find((k) => k.id === ck.id);
              if (dbEntry) {
                dbEntry.consecutiveFailures += 1;
                dbEntry.lastError = classified.userMessageTr;
                dbEntry.status = classified.shouldMarkKeyInvalid ? 'INVALID' : 'COOLDOWN';
                dbEntry.cooldownUntil = effectiveCooldownIso;
                dbEntry.updatedAt = new Date().toISOString();
              }
            }
            vaultModified = true;
          }

          // Decide next step in failover chain
          if (classified.category === 'SAFETY_BLOCKED') {
            recordDiagnosticEvent(
              ck,
              modelName,
              'FINAL_FAILURE',
              lastErrorMessage,
              classified.category,
              latencyMs
            );
            break outerKeyLoop;
          }

          if (!autoFallback) {
            break outerKeyLoop;
          }

          if (
            classified.shouldMarkKeyInvalid ||
            classified.category === 'BILLING_PROJECT_ERROR' ||
            escalateToProjectCooldown ||
            !classified.canSwitchToNextModelSameKey
          ) {
            // Switch immediately to the next API key!
            recordDiagnosticEvent(
              ck,
              modelName,
              'FAILOVER_KEY',
              `Anahtar değiştiriliyor (${ck.name} -> sıradaki yedek anahtar). Neden: ${classified.userMessageTr}`,
              classified.category,
              latencyMs
            );
            break; // Breaks model loop, continues outerKeyLoop
          }

          // Otherwise switch to next model on the same key
          recordDiagnosticEvent(
            ck,
            modelName,
            'FAILOVER_MODEL',
            `Model değiştiriliyor (${modelName} -> sıradaki model). Neden: ${classified.userMessageTr}`,
            classified.category,
            latencyMs
          );
          break; // Breaks retry loop, continues model loop
        }
      }
    }
  }

  if (vaultModified) {
    await saveCentralAiVault(vault);
  }

  return {
    success: false,
    text: '',
    usedKeyId: candidateKeys[0]?.id || 'none',
    usedKeyName: candidateKeys[0]?.name || 'Yok',
    usedKeyMasked: candidateKeys[0]?.maskedPreview || '',
    usedModel: req.preferredModel || '',
    attemptsCount,
    failoverOccurred: attemptedTrail.length > 1,
    attemptedTrail,
    finalErrorCategory: lastErrorCategory,
    finalErrorMessage: lastErrorMessage,
  };
}
