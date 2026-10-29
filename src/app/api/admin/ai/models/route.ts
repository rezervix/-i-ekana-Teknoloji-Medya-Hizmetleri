import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import {
  testApiKeyAndDiscoverModels,
  listSafeApiKeys,
  sanitizeErrorMessage,
} from '@/lib/ai/core/key-vault-and-models';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const info = await listSafeApiKeys();
    return NextResponse.json({
      success: true,
      models: info.catalog,
      catalogUpdatedAt: info.catalogUpdatedAt,
      keys: info.keys,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const keyId = body.keyId ? String(body.keyId).trim() : undefined;
    const rawApiKey = body.rawApiKey ? String(body.rawApiKey).trim() : undefined;
    const testModelName = body.testModelName ? String(body.testModelName).trim() : undefined;

    // If neither keyId nor rawApiKey was explicitly passed, use the primary or first active key from vault
    let effectiveKeyId = keyId;
    if (!effectiveKeyId && !rawApiKey) {
      const info = await listSafeApiKeys();
      const firstActive =
        info.keys.find((k) => k.isActive && k.role === 'PRIMARY') ||
        info.keys.find((k) => k.isActive);
      effectiveKeyId = firstActive?.id;
    }

    const result = await testApiKeyAndDiscoverModels({
      keyId: effectiveKeyId,
      rawApiKey,
      testModelName,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || 'Modeller alınamadı.',
          errorCategory: result.errorCategory,
          models: [],
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      models: result.models,
      pagesFetched: result.pagesFetched,
      totalModelsCount: result.models.length,
      suitableForChatCount: result.models.filter((m) => m.isSuitableForChat).length,
      suitableForProductEditCount: result.models.filter((m) => m.isSuitableForProductEdit).length,
      liveGenerationTest: result.liveGenerationTest,
      keyMetadata: result.keyMetadata,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}

