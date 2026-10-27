import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import { testGeminiConnectionAndModels } from '@/lib/ai/product-import/gemini-fallback-engine';

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    let customKey: string | undefined;
    try {
      const body = await request.json();
      if (body.customKey && typeof body.customKey === 'string') {
        customKey = body.customKey.trim();
      }
    } catch {
      // JSON body opsiyonel
    }

    const testResults = await testGeminiConnectionAndModels(customKey);

    return NextResponse.json(testResults);
  } catch (err: any) {
    console.error('[AI-Settings-Test Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Bağlantı testi sırasında bir hata oluştu: ' + err.message,
      },
      { status: 500 }
    );
  }
}
