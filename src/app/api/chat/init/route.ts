import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getExistingConversationBySession } from '@/lib/ai/chat-service';
import { getChatbotCentralSettings } from '@/lib/ai/chatbot-settings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, pageUrl, productId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Geçerli bir oturum kimliği (sessionId) gereklidir.' },
        { status: 400 }
      );
    }

    const [session, centralSettings] = await Promise.all([
      getServerSession(authOptions),
      getChatbotCentralSettings(),
    ]);
    const userId = (session?.user as any)?.id || null;

    // ÖNEMLİ (Bölüm 11.1): Sayfa açılışında veya sohbet penceresi açıldığında
    // veritabanında yeni boş konuşma kaydı OLUŞTURULMAZ. Yalnızca mevcut gerçek konuşma varsa döner.
    const conversation = await getExistingConversationBySession({
      sessionId,
      userId,
      pageUrl,
      productId,
    });

    if (!conversation) {
      return NextResponse.json({
        success: true,
        chatbotEnabled: centralSettings.isEnabled,
        welcomeMessage: centralSettings.welcomeMessage,
        conversation: null,
        messages: [],
      });
    }

    return NextResponse.json({
      success: true,
      chatbotEnabled: centralSettings.isEnabled,
      welcomeMessage: centralSettings.welcomeMessage,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        status: conversation.status,
        handoverStatus: conversation.handoverStatus,
        customerName: conversation.customerName,
        customerPhone: conversation.customerPhone,
        customerEmail: conversation.customerEmail,
        messages: conversation.messages,
      },
      messages: conversation.messages,
    });
  } catch (error: any) {
    console.error('[API /chat/init] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Sohbet başlatılırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
