import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import { prisma } from '@/lib/prisma';
import {
  getChatbotCentralSettings,
  saveChatbotCentralSettings,
} from '@/lib/ai/chatbot-settings';
import {
  listSafeApiKeys,
  loadCentralAiVault,
  sanitizeErrorMessage,
  type SafeApiKeyMetadata,
  type DiscoveredGeminiModel,
} from '@/lib/ai/core/key-vault-and-models';
import { invalidateCatalogCache } from '@/lib/ai/product-catalog';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const [settings, vaultSummary, rawVault, kbCount, plansCount, emailLogsCount] =
      await Promise.all([
        getChatbotCentralSettings(true),
        listSafeApiKeys(),
        loadCentralAiVault(),
        prisma.knowledgeDocument.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
        prisma.plan.count({ where: { isActive: true } }).catch(() => 0),
        prisma.emailLog.count().catch(() => 0),
      ]);

    const activePrimaryKey =
      vaultSummary.keys.find(
        (k: SafeApiKeyMetadata) => k.isActive && k.role === 'PRIMARY' && k.purpose !== 'PRODUCT_EDIT'
      ) ||
      vaultSummary.keys.find(
        (k: SafeApiKeyMetadata) => k.isActive && k.purpose !== 'PRODUCT_EDIT'
      ) ||
      null;

    const backupKeys = vaultSummary.keys.filter(
      (k: SafeApiKeyMetadata) => k.id !== activePrimaryKey?.id && k.purpose !== 'PRODUCT_EDIT'
    );

    return NextResponse.json({
      success: true,
      settings,
      keys: vaultSummary.keys,
      catalog: vaultSummary.catalog,
      catalogUpdatedAt: vaultSummary.catalogUpdatedAt,
      circuitBreaker: vaultSummary.circuitBreaker,
      recentEvents: vaultSummary.recentEvents,
      auditLogs: (rawVault.auditLogs || []).slice(0, 30),
      diagnostics: {
        chatbotEnabled: settings.isEnabled,
        activePrimaryKey,
        backupKeysCount: backupKeys.length,
        activeBackupKeysCount: backupKeys.filter(
          (k: SafeApiKeyMetadata) => k.isActive && k.status === 'ACTIVE'
        ).length,
        activeModel: settings.primaryModel,
        totalDiscoveredModels: vaultSummary.catalog.length,
        chatSuitableModelsCount: vaultSummary.catalog.filter(
          (m: DiscoveredGeminiModel) => m.isSuitableForChat
        ).length,
        knowledgeDocsCount: kbCount,
        activePlansCount: plansCount,
        recentEmailLogsCount: emailLogsCount,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const actor = (session.user as any)?.email || (session.user as any)?.name || 'admin';

  try {
    const body = await req.json();
    const payload = body.settings && typeof body.settings === 'object' ? body.settings : body;

    const saved = await saveChatbotCentralSettings(payload, actor);
    invalidateCatalogCache();

    return NextResponse.json({
      success: true,
      settings: saved,
      message: 'Merkezi Chatbot ayarları başarıyla kaydedildi.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(err) },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
