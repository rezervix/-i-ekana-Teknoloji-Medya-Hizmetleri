import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-plan';
import {
  executeProductImportWithFallback,
  ProductImportExecutionInput,
} from '@/lib/ai/product-import/gemini-fallback-engine';

// Desteklenen dosya uzantıları ve boyut sınırları
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.json'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Basit eşzamanlı istek / spam koruması (Admin başına 3 saniyede en fazla 1 istek)
const recentAdminRequests = new Map<string, number>();

export async function POST(request: Request) {
  // 1. Yetki Doğrulaması (Yalnızca SUPER_ADMIN, ADMIN veya EDITOR)
  const session = await requireAdmin();
  if (!session || !session.user) {
    return NextResponse.json(
      {
        error: 'Yetkisiz erişim. Bu özelliği yalnızca yetkili yöneticiler kullanabilir.',
        diagnostics: {
          category: 'AUTH_GLOBAL',
          userExplanation: 'Oturumunuzun yönetici yetkisi bulunmuyor veya süresi doldu.',
          suggestedAction: 'Lütfen yönetici paneline yeniden giriş yapın.',
        },
      },
      { status: 401 }
    );
  }

  const userId = (session.user as any)?.id || session.user.email || 'unknown_admin';
  const now = Date.now();
  const lastRequestTime = recentAdminRequests.get(userId) || 0;

  // Çift tıklama / ardışık çağrı koruması
  if (now - lastRequestTime < 2500) {
    return NextResponse.json(
      {
        error:
          'Lütfen önceki analizin tamamlanmasını bekleyin veya birkaç saniye sonra tekrar deneyin.',
        diagnostics: {
          category: 'SERVICE_TEMPORARY',
          userExplanation:
            'Çok hızlı ardışık istek gönderildi. Sistem çift tıklama koruması uyguluyor.',
          suggestedAction: 'Lütfen devam eden analizin sonucunu bekleyin.',
        },
      },
      { status: 429 }
    );
  }
  recentAdminRequests.set(userId, now);

  try {
    // 2. Dosya Ayrıştırma ve Doğrulama
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: 'Lütfen analiz edilmek üzere bir doküman dosyası yükleyin.',
          diagnostics: {
            category: 'INVALID_INPUT',
            userExplanation: 'Dosya seçilmedi.',
            suggestedAction:
              'Lütfen bilgisayarınızdan PDF, TXT veya Markdown biçimli bir dosya seçin.',
          },
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: 'Dosya boyutu 10 MB sınırını aşıyor. Lütfen daha küçük bir doküman yükleyin.',
          diagnostics: {
            category: 'INVALID_INPUT',
            userExplanation: 'Dosya boyutu 10 MB sınırını aştı.',
            suggestedAction: 'Dokümanın boyutunu küçülterek tekrar yükleyin.',
          },
        },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      return NextResponse.json(
        {
          error:
            'Desteklenmeyen dosya formatı. Lütfen PDF (.pdf), Metin (.txt), Markdown (.md) veya JSON (.json) dosyası yükleyin.',
          diagnostics: {
            category: 'INVALID_INPUT',
            userExplanation: `Yüklenen dosya (${file.name}) desteklenen formatlar arasında değil.`,
            suggestedAction:
              'PDF (.pdf), Metin (.txt), Markdown (.md) veya JSON (.json) formatında bir dosya yükleyin.',
          },
        },
        { status: 400 }
      );
    }

    // 3. İçerik Hazırlığı
    const executionInput: ProductImportExecutionInput = {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    };

    if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      executionInput.pdfBase64 = buffer.toString('base64');
    } else {
      const text = await file.text();
      if (!text.trim()) {
        return NextResponse.json(
          {
            error: 'Yüklenen metin dosyası boş.',
            diagnostics: {
              category: 'INVALID_INPUT',
              userExplanation: 'Dosya içerisinde okunabilir metin bulunamadı.',
              suggestedAction: 'İçeriği dolu bir ürün tanıtım dokümanı yükleyin.',
            },
          },
          { status: 400 }
        );
      }
      executionInput.rawText = text;
    }

    // 4. Akıllı Fallback ve Teşhis Motorunu Çalıştır
    const result = await executeProductImportWithFallback(executionInput);

    if (!result.success || !result.plan) {
      // Hata durumunda uygun HTTP status kodu belirle
      let httpStatus = 502;
      const cat = result.diagnostics.category;
      if (cat === 'AUTH_GLOBAL') httpStatus = 503;
      else if (cat === 'QUOTA_EXHAUSTED') httpStatus = 429;
      else if (cat === 'INVALID_INPUT') httpStatus = 400;
      else if (cat === 'TIMEOUT') httpStatus = 504;

      return NextResponse.json(
        {
          error: result.diagnostics.userExplanation,
          diagnostics: result.diagnostics,
        },
        { status: httpStatus }
      );
    }

    // 5. Başarılı Sonuç
    return NextResponse.json({
      success: true,
      plan: result.plan,
      warnings: result.warnings,
      diagnostics: result.diagnostics,
      meta: {
        fileName: file.name,
        fileSize: file.size,
        modelUsed: result.diagnostics.resolvedModel,
      },
    });
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    console.error('[AI-Import Top-Level Error]:', rawMsg);

    return NextResponse.json(
      {
        error: 'Doküman analizi sırasında sunucuda beklenmeyen bir hata oluştu.',
        diagnostics: {
          category: 'UNKNOWN',
          userExplanation: 'Sunucu tarafında beklenmeyen bir hata oluştu.',
          technicalDetail: rawMsg.slice(0, 150),
          suggestedAction: 'Lütfen işlemi birkaç saniye sonra tekrar deneyin.',
        },
      },
      { status: 500 }
    );
  }
}
