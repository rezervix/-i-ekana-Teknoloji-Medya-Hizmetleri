import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import {
  listSafeApiKeys,
  upsertVaultApiKey,
  deleteVaultApiKey,
  testApiKeyAndDiscoverModels,
  loadCentralAiVault,
  saveCentralAiVault,
  sanitizeErrorMessage,
  type ApiKeyRole,
  type ApiKeyPurpose,
} from '@/lib/ai/core/key-vault-and-models';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const data = await listSafeApiKeys();
    return NextResponse.json({
      success: true,
      ...data,
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

  const actor = (session.user as any)?.email || (session.user as any)?.name || 'admin';

  try {
    const body = await req.json();
    const action = String(body.action || 'upsert');

    if (action === 'delete') {
      const keyId = String(body.keyId || body.id || '').trim();
      if (!keyId) {
        return NextResponse.json(
          { success: false, error: 'Silinecek anahtar kimliği (keyId) belirtilmedi.' },
          { status: 400 }
        );
      }
      const delRes = await deleteVaultApiKey(keyId, actor);
      if (!delRes.success) {
        return NextResponse.json(
          { success: false, error: delRes.errorMessage },
          { status: 400 }
        );
      }
      const updated = await listSafeApiKeys();
      return NextResponse.json({
        success: true,
        message: 'API anahtarı güvenli depodan silindi.',
        ...updated,
      });
    }

    if (action === 'test') {
      const testRes = await testApiKeyAndDiscoverModels({
        keyId: body.keyId ? String(body.keyId) : undefined,
        rawApiKey: body.rawApiKey ? String(body.rawApiKey) : undefined,
        testModelName: body.testModelName ? String(body.testModelName) : undefined,
      });
      const updated = await listSafeApiKeys();
      return NextResponse.json({
        ...testRes,
        keys: updated.keys,
        circuitBreaker: updated.circuitBreaker,
        recentEvents: updated.recentEvents,
      });
    }

    if (action === 'reset_cooldowns') {
      const vault = await loadCentralAiVault();
      vault.circuitBreaker = {
        keyCooldowns: {},
        projectCooldowns: {},
        modelCooldowns: {},
      };
      for (const k of vault.keys) {
        if (k.status === 'COOLDOWN') {
          k.status = k.isActive ? 'ACTIVE' : 'INACTIVE';
          k.cooldownUntil = null;
        }
      }
      await saveCentralAiVault(vault);
      const updated = await listSafeApiKeys();
      return NextResponse.json({
        success: true,
        message: 'Tüm bekleme süreleri (cooldown / devre kesici) sıfırlandı.',
        ...updated,
      });
    }

    if (action === 'reorder') {
      const orderedIds: string[] = Array.isArray(body.orderedKeyIds) ? body.orderedKeyIds : [];
      const vault = await loadCentralAiVault();
      orderedIds.forEach((id, idx) => {
        const found = vault.keys.find((k) => k.id === id);
        if (found) {
          found.priority = idx + 1;
          found.updatedAt = new Date().toISOString();
        }
      });
      await saveCentralAiVault(vault);
      const updated = await listSafeApiKeys();
      return NextResponse.json({
        success: true,
        message: 'Anahtar öncelik sıralaması güncellendi.',
        ...updated,
      });
    }

    // Default action: 'upsert'
    const role: ApiKeyRole = ['PRIMARY', 'BACKUP', 'PRODUCT_EDIT'].includes(body.role)
      ? body.role
      : 'BACKUP';
    const purpose: ApiKeyPurpose = ['BOTH', 'CHATBOT', 'PRODUCT_EDIT'].includes(body.purpose)
      ? body.purpose
      : role === 'PRODUCT_EDIT'
        ? 'PRODUCT_EDIT'
        : 'BOTH';

    const upsertRes = await upsertVaultApiKey({
      id: body.id ? String(body.id) : undefined,
      rawApiKey: body.rawApiKey ? String(body.rawApiKey) : undefined,
      name: String(body.name || '').trim() || 'Google API Anahtarı',
      role,
      purpose,
      projectTag: body.projectTag ? String(body.projectTag) : 'default-project',
      priority: typeof body.priority === 'number' ? body.priority : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      verifyModelsNow: body.verifyModelsNow !== false,
      actor,
    });

    if (!upsertRes.success) {
      return NextResponse.json(
        { success: false, error: upsertRes.errorMessage || 'Anahtar kaydedilemedi.' },
        { status: 400 }
      );
    }

    const updated = await listSafeApiKeys();
    return NextResponse.json({
      success: true,
      savedKey: upsertRes.key,
      discoveredModels: upsertRes.discoveredModels,
      ...updated,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const actor = (session.user as any)?.email || 'admin';
  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get('id') || searchParams.get('keyId') || '';

  if (!keyId) {
    return NextResponse.json(
      { success: false, error: 'Silinecek anahtar ID belirtilmedi.' },
      { status: 400 }
    );
  }

  const res = await deleteVaultApiKey(keyId, actor);
  if (!res.success) {
    return NextResponse.json({ success: false, error: res.errorMessage }, { status: 400 });
  }

  const updated = await listSafeApiKeys();
  return NextResponse.json({
    success: true,
    ...updated,
  });
}

