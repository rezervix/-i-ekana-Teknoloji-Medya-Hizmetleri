import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleCustomerMessage } from '@/lib/ai/chat-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, sessionId, message, pageUrl, productId } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Boş mesaj gönderilemez.' },
        { status: 400 }
      );
    }

    if (!conversationId && !sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Konuşma kimliği (conversationId) veya oturum kimliği (sessionId) gereklidir.',
        },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const result = await handleCustomerMessage({
      conversationId: conversationId || null,
      sessionId: sessionId || null,
      userId,
      message,
      pageUrl,
      productId,
    });

    const rawSuggested = Array.isArray(result.botMessage?.suggestedProducts)
      ? (result.botMessage.suggestedProducts as any[])
      : [];

    const normalizedSuggested = rawSuggested.map((prod) => ({
      ...prod,
      price: prod.price || prod.priceFormatted || 'Özel Teklif',
      priceFormatted: prod.priceFormatted || prod.price || 'Özel Teklif',
    }));

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      visitorMessage: result.visitorMessage,
      botMessage: result.botMessage,
      botMessageId: result.botMessage?.id || `bot-${Date.now()}`,
      reply: result.botMessage?.content || '',
      isHandoverPrompt: result.isHandoverPrompt,
      suggestedProducts: normalizedSuggested,
      confidenceLevel: result.confidenceLevel,
      clarifyingOptions: result.clarifyingOptions,
      status: result.status,
    });
  } catch (error: any) {
    console.error('[API /chat/message] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Mesaj gönderilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
