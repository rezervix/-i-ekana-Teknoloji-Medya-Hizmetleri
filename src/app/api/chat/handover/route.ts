import { NextRequest, NextResponse } from 'next/server';
import { submitCustomerHandover } from '@/lib/ai/handover-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId,
      sessionId,
      phone,
      name,
      email,
      productInterest,
      unansweredQuestion,
      handoverReason,
      pageUrl,
    } = body;

    if (!conversationId && !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Konuşma veya oturum kimliği gereklidir.' },
        { status: 400 }
      );
    }

    const hasPhone = typeof phone === 'string' && phone.replace(/\D/g, '').length >= 7;
    const hasEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!hasPhone && !hasEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lütfen geçerli bir telefon numarası veya e-posta adresi giriniz.',
        },
        { status: 400 }
      );
    }

    const result = await submitCustomerHandover({
      conversationId,
      sessionId,
      phone,
      name,
      email,
      productInterest,
      unansweredQuestion,
      handoverReason,
      pageUrl,
    });

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      handover: result.handover,
      confirmMessage: result.confirmMessage,
      message: result.confirmMessage.content,
    });
  } catch (error: any) {
    console.error('[API /chat/handover] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'İletişim bilgileriniz kaydedilirken bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}
