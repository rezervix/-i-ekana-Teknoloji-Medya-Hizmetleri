import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import {
  applyApprovedProductAiChanges,
  type EditableProductSnapshot,
} from '@/lib/ai/product-edit/ai-product-editor';
import { sanitizeErrorMessage } from '@/lib/ai/core/key-vault-and-models';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { id: planId } = await context.params;
  if (!planId || !planId.trim()) {
    return NextResponse.json(
      { success: false, error: 'Ürün kimliği (id) belirtilmedi.' },
      { status: 400 }
    );
  }

  const actor = (session.user as any)?.email || (session.user as any)?.name || 'admin';

  try {
    const body = await req.json();
    const proposedSnapshot = body.proposedSnapshot as EditableProductSnapshot | undefined;
    const approvedChangeIds = Array.isArray(body.approvedChangeIds)
      ? body.approvedChangeIds.map((id: unknown) => String(id))
      : [];

    if (!proposedSnapshot || typeof proposedSnapshot !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Uygulanacak öneri verisi (proposedSnapshot) eksik.' },
        { status: 400 }
      );
    }

    const result = await applyApprovedProductAiChanges({
      planId,
      expectedUpdatedAt: body.expectedUpdatedAt ? String(body.expectedUpdatedAt) : undefined,
      forceOverwrite: Boolean(body.forceOverwrite),
      proposedSnapshot,
      approvedChangeIds,
      promptSummary: body.promptSummary ? String(body.promptSummary) : undefined,
      usedModel: body.usedModel ? String(body.usedModel) : undefined,
      actor,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          conflictDetected: result.conflictDetected || false,
          error: result.errorMessage || 'Değişiklikler uygulanamadı.',
        },
        { status: result.conflictDetected ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      appliedChangesCount: result.appliedChangesCount,
      updatedPlan: result.updatedPlan,
      message: `${result.appliedChangesCount} değişiklik başarıyla kaydedildi.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(err),
      },
      { status: 500 }
    );
  }
}

