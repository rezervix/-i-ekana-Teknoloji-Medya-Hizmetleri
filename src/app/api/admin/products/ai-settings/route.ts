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

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { apiKey, settings, keySource } = await resolveImportConfig();

  // API Anahtarının ilk 6 ve son 4 karakterini güvenli göster
  let keyPreview = 'Tanımlanmamış';
  if (apiKey) {
    keyPreview = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
  }

  return NextResponse.json({
    settings,
    availableModels: VERIFIED_ACTIVE_MODELS,
    deprecatedModels: KNOWN_DEPRECATED_MODELS,
    keyConfigured: Boolean(apiKey),
    keySource,
    keyPreview,
    apiKey: apiKey || '', // Yetkili admin için kayıtlı anahtarı döndür
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

    const currentData = (current?.data as any) || {};
    const existingConfig: AIProductImportSettings = currentData.aiProductImportConfig || {
      ...DEFAULT_AI_IMPORT_SETTINGS,
    };

    // Yeni ayarları doğrula ve harmanla
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
      apiKey: existingConfig.apiKey,
    };

    // API Anahtarı güncellenmek isteniyorsa
    let newApiKey: string | undefined = undefined;
    if (typeof body.apiKey === 'string') {
      const trimmed = body.apiKey.trim();
      if (trimmed.length > 0) {
        newApiKey = trimmed;
        updatedConfig.apiKey = trimmed;
      }
    }

    // Varsayılan modelin öncelik listesinde yer almasını sağla
    if (!updatedConfig.modelPriority.includes(updatedConfig.defaultModel)) {
      updatedConfig.modelPriority.unshift(updatedConfig.defaultModel);
    }

    const updatedData: any = {
      ...currentData,
      aiProductImportConfig: updatedConfig,
    };

    if (newApiKey) {
      updatedData.geminiApiKey = newApiKey;
    }

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

    const savedKey = updatedConfig.apiKey || '';
    const keyPreview = savedKey ? `${savedKey.slice(0, 6)}...${savedKey.slice(-4)}` : 'Tanımlanmamış';

    return NextResponse.json({
      success: true,
      settings: updatedConfig,
      keyConfigured: Boolean(savedKey),
      keyPreview,
      apiKey: savedKey,
      message: 'AI ayarları ve API anahtarı başarıyla kaydedildi.',
    });
  } catch (err: any) {
    console.error('[AI-Settings Error]:', err);
    return NextResponse.json(
      { error: 'Ayarlar kaydedilirken bir hata oluştu: ' + err.message },
      { status: 500 }
    );
  }
}
