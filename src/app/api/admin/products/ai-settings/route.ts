import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import { prisma } from '@/lib/prisma';
import {
  resolveImportConfig,
  VERIFIED_ACTIVE_MODELS,
  KNOWN_DEPRECATED_MODELS,
  DEFAULT_AI_IMPORT_SETTINGS,
  AIProductImportSettings,
} from '@/lib/ai/product-import/gemini-fallback-engine';
import {
  listSafeApiKeys,
  maskApiKey,
  upsertVaultApiKey,
  validateGoogleApiKeyFormat,
  sanitizeErrorMessage,
} from '@/lib/ai/core/key-vault-and-models';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const [{ apiKey, settings, keySource }, vaultInfo] = await Promise.all([
    resolveImportConfig(),
    listSafeApiKeys(),
  ]);

  const keyPreview = apiKey ? maskApiKey(apiKey) : 'Tanımlanmamış';

  // GÜVENLİK (Bölüm 7): Tam API anahtarı asla frontend'e geri döndürülmez!
  const safeSettings = { ...settings };
  delete safeSettings.apiKey;

  return NextResponse.json({
    settings: safeSettings,
    availableModels:
      vaultInfo.catalog.length > 0
        ? vaultInfo.catalog
            .filter((m) => m.supportsTextGeneration)
            .map((m) => ({
              id: m.technicalName,
              label: m.displayName || m.technicalName,
              tier: m.stabilityTier,
              badge: m.stabilityTier === 'STABLE_FLAGSHIP' ? 'Güçlü & Kararlı' : 'Kararlı',
              recommended: m.priorityRank <= 20,
              description: m.suitabilityReason,
            }))
        : VERIFIED_ACTIVE_MODELS,
    discoveredModels: vaultInfo.catalog,
    savedKeys: vaultInfo.keys,
    deprecatedModels: KNOWN_DEPRECATED_MODELS,
    keyConfigured: Boolean(apiKey),
    keySource,
    keyPreview,
    lastDiagnostic: settings.lastDiagnostic || null,
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const current = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    const currentData = (current?.data as Record<string, any>) || {};
    const existingConfig: AIProductImportSettings = currentData.aiProductImportConfig || {
      ...DEFAULT_AI_IMPORT_SETTINGS,
    };

    const updatedConfig: AIProductImportSettings = {
      defaultModel:
        typeof body.defaultModel === 'string' &&
        !KNOWN_DEPRECATED_MODELS.includes(body.defaultModel)
          ? body.defaultModel
          : existingConfig.defaultModel,
      modelPriority:
        Array.isArray(body.modelPriority) && body.modelPriority.length > 0
          ? body.modelPriority.filter((m: string) => !KNOWN_DEPRECATED_MODELS.includes(m))
          : existingConfig.modelPriority,
      autoFallbackEnabled:
        typeof body.autoFallbackEnabled === 'boolean'
          ? body.autoFallbackEnabled
          : existingConfig.autoFallbackEnabled,
      maxAttempts:
        typeof body.maxAttempts === 'number' && body.maxAttempts >= 1 && body.maxAttempts <= 5
          ? body.maxAttempts
          : existingConfig.maxAttempts,
      timeoutSeconds:
        typeof body.timeoutSeconds === 'number' &&
        body.timeoutSeconds >= 10 &&
        body.timeoutSeconds <= 90
          ? body.timeoutSeconds
          : existingConfig.timeoutSeconds,
      lastDiagnostic: existingConfig.lastDiagnostic,
    };

    // Varsayılan modelin öncelik listesinde yer almasını sağla
    if (!updatedConfig.modelPriority.includes(updatedConfig.defaultModel)) {
      updatedConfig.modelPriority.unshift(updatedConfig.defaultModel);
    }

    // Düz metin anahtar alanlarını her zaman temizle (Merkezi Şifreli Anahtar Deposu kullanılır)
    delete updatedConfig.apiKey;
    const updatedData: Record<string, any> = {
      ...currentData,
      aiProductImportConfig: updatedConfig,
    };
    delete updatedData.geminiApiKey;

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        data: updatedData,
      },
      update: {
        data: updatedData,
      },
    });

    let keyPreview = 'Tanımlanmamış';
    let keyConfigured = false;

    // Yeni API Anahtarı gönderildiyse merkezi şifreli depoya (AES-256-GCM) kaydet
    if (typeof body.apiKey === 'string' && body.apiKey.trim().length > 0) {
      const candidateKey = body.apiKey.trim();
      const check = validateGoogleApiKeyFormat(candidateKey);
      if (!check.valid) {
        return NextResponse.json({ error: check.reason }, { status: 400 });
      }

      const saveResult = await upsertVaultApiKey({
        rawApiKey: candidateKey,
        name:
          typeof body.keyName === 'string' && body.keyName.trim()
            ? body.keyName.trim()
            : 'Ürün Yönetimi API Anahtarı',
        // Ürün düzenleme / import ekranından kaydedilen anahtar chatbot'un mevcut ana anahtarını ezmez!
        role: body.setAsPrimaryChatbotKey === true ? 'PRIMARY' : 'PRODUCT_EDIT',
        purpose: body.setAsPrimaryChatbotKey === true ? 'BOTH' : 'PRODUCT_EDIT',
        projectTag:
          typeof body.projectTag === 'string' && body.projectTag.trim()
            ? body.projectTag.trim()
            : 'product-edit-project',
        verifyModelsNow: false,
        actor: (session.user as any)?.email || 'admin',
      });

      if (!saveResult.success) {
        return NextResponse.json(
          { error: saveResult.errorMessage || 'API anahtarı kaydedilemedi.' },
          { status: 400 }
        );
      }

      keyPreview = saveResult.key?.maskedPreview || maskApiKey(candidateKey);
      keyConfigured = true;
    } else {
      const resolved = await resolveImportConfig();
      if (resolved.apiKey) {
        keyPreview = maskApiKey(resolved.apiKey);
        keyConfigured = true;
      }
    }

    return NextResponse.json({
      success: true,
      settings: updatedConfig,
      keyConfigured,
      keyPreview,
      message: 'AI ayarları ve şifreli API anahtarı başarıyla kaydedildi.',
    });
  } catch (err: any) {
    console.error('[AI-Settings Error]:', sanitizeErrorMessage(err));
    return NextResponse.json(
      { error: 'Ayarlar kaydedilirken bir hata oluştu: ' + sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}
