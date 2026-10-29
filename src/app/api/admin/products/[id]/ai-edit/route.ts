import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import {
  generateAiProductEditProposal,
  AI_EDIT_FILE_LIMITS,
  type UploadedEditFile,
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
      { success: false, error: 'Düzenlenecek ürün kimliği (id) belirtilmedi.' },
      { status: 400 }
    );
  }

  const actor = (session.user as any)?.email || (session.user as any)?.name || 'admin';
  const uploadedFiles: UploadedEditFile[] = [];

  try {
    const contentType = req.headers.get('content-type') || '';

    let prompt = '';
    let keyMode: 'saved' | 'new' = 'saved';
    let savedKeyId: string | undefined;
    let rawApiKey: string | undefined;
    let saveNewKey = false;
    let newKeyName: string | undefined;
    let newKeyProjectTag: string | undefined;
    let selectedModel: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = String(formData.get('prompt') || '').trim();
      keyMode = formData.get('keyMode') === 'new' ? 'new' : 'saved';
      savedKeyId = formData.get('savedKeyId') ? String(formData.get('savedKeyId')).trim() : undefined;
      rawApiKey = formData.get('rawApiKey') ? String(formData.get('rawApiKey')).trim() : undefined;
      saveNewKey = formData.get('saveNewKey') === 'true' || formData.get('saveNewKey') === '1';
      newKeyName = formData.get('newKeyName') ? String(formData.get('newKeyName')).trim() : undefined;
      newKeyProjectTag = formData.get('newKeyProjectTag')
        ? String(formData.get('newKeyProjectTag')).trim()
        : undefined;
      selectedModel = formData.get('selectedModel')
        ? String(formData.get('selectedModel')).trim()
        : undefined;

      const fileEntries = formData.getAll('files');
      if (fileEntries.length > AI_EDIT_FILE_LIMITS.maxFiles) {
        return NextResponse.json(
          {
            success: false,
            error: `En fazla ${AI_EDIT_FILE_LIMITS.maxFiles} dosya yükleyebilirsiniz.`,
          },
          { status: 400 }
        );
      }

      for (const item of fileEntries) {
        if (item && typeof item === 'object' && 'arrayBuffer' in item) {
          const fileObj = item as File;
          if (!fileObj.name || fileObj.size === 0) continue;
          const arrayBuf = await fileObj.arrayBuffer();
          uploadedFiles.push({
            fileName: fileObj.name,
            mimeType: fileObj.type || 'application/octet-stream',
            sizeBytes: fileObj.size,
            buffer: Buffer.from(arrayBuf),
          });
        }
      }
    } else {
      const body = await req.json();
      prompt = String(body.prompt || '').trim();
      keyMode = body.keyMode === 'new' ? 'new' : 'saved';
      savedKeyId = body.savedKeyId ? String(body.savedKeyId).trim() : undefined;
      rawApiKey = body.rawApiKey ? String(body.rawApiKey).trim() : undefined;
      saveNewKey = Boolean(body.saveNewKey);
      newKeyName = body.newKeyName ? String(body.newKeyName).trim() : undefined;
      newKeyProjectTag = body.newKeyProjectTag
        ? String(body.newKeyProjectTag).trim()
        : undefined;
      selectedModel = body.selectedModel ? String(body.selectedModel).trim() : undefined;

      if (Array.isArray(body.files)) {
        for (const f of body.files) {
          if (f && f.fileName && f.content) {
            const buf = f.isBase64
              ? Buffer.from(String(f.content), 'base64')
              : Buffer.from(String(f.content), 'utf8');
            uploadedFiles.push({
              fileName: String(f.fileName),
              mimeType: String(f.mimeType || 'text/plain'),
              sizeBytes: buf.length,
              buffer: buf,
            });
          }
        }
      }
    }

    const proposal = await generateAiProductEditProposal({
      planId,
      prompt,
      files: uploadedFiles,
      keyMode,
      savedKeyId,
      rawApiKey,
      saveNewKey,
      newKeyName,
      newKeyProjectTag,
      selectedModel,
      actor,
    });

    return NextResponse.json(proposal);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(err),
      },
      { status: 400 }
    );
  } finally {
    // Clean up temporary file buffers from memory immediately after request processing
    uploadedFiles.length = 0;
  }
}

