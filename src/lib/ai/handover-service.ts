import { prisma } from '@/lib/prisma';
import { sendChatEventNotification } from './chat-notifications';
import { buildSlaFollowupConfirmationMessage } from '@/lib/nlp/knowledge-engine';
import { getVerifiedCatalog, inferProductKeyFromContext } from './product-catalog';

export interface SubmitHandoverParams {
  conversationId?: string;
  sessionId?: string;
  phone?: string;
  name?: string;
  email?: string;
  productInterest?: string;
  unansweredQuestion?: string;
  handoverReason?: string;
  pageUrl?: string;
}

/**
 * Müşteri telefon numarası veya e-posta adresi bıraktığında (form veya sohbet üzerinden)
 * takip kaydını (ChatHandover) oluşturur ve yöneticiye e-posta bildirimi gönderir.
 */
export async function submitCustomerHandover(params: SubmitHandoverParams) {
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
  } = params;

  const cleanPhone = (phone || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  const hasValidPhone = cleanPhone.replace(/\D/g, '').length >= 7;
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  if (!hasValidPhone && !hasValidEmail) {
    throw new Error('Lütfen geçerli bir telefon numarası veya e-posta adresi giriniz.');
  }

  // 1. Mevcut konuşmayı bul veya gerekirse oluştur
  let conv = conversationId
    ? await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 15,
          },
          handovers: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
    : null;

  if (!conv && sessionId) {
    conv = await prisma.chatConversation.findFirst({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 15,
        },
        handovers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!conv) {
    conv = await prisma.chatConversation.create({
      data: {
        sessionId: sessionId || `handover_${Date.now()}`,
        pageUrl: pageUrl || null,
        status: 'ACTIVE',
        title: name?.trim() ? `${name.trim()} - İletişim Talebi` : 'Müşteri İletişim Talebi',
      },
      include: {
        messages: true,
        handovers: true,
      },
    });
  }

  // 2. Konuşma özetini ve son soruyu çıkar
  const visitorMessages = conv.messages.filter((m) => m.senderType === 'VISITOR');
  const lastVisitorQuestion =
    unansweredQuestion ||
    (visitorMessages.length > 0
      ? visitorMessages[visitorMessages.length - 1].content
      : 'Müşteri doğrudan iletişim/geri dönüş talep etti.');

  const summaryLines = conv.messages.slice(-6).map((m) => {
    const role =
      m.senderType === 'VISITOR' ? 'Müşteri' : m.senderType === 'AGENT' ? 'Temsilci' : 'Asistan';
    return `${role}: ${m.content.slice(0, 140)}${m.content.length > 140 ? '...' : ''}`;
  });
  const conversationSummary =
    summaryLines.join('\n') || 'Müşteri iletişim bilgilerini paylaşarak geri dönüş talep etti.';

  // 3. İlgili ürünü belirle
  const catalog = await getVerifiedCatalog();
  const inferredKey = inferProductKeyFromContext(
    pageUrl || conv.pageUrl,
    productInterest || conv.productId
  );
  const catalogProduct = inferredKey ? catalog.find((c) => c.key === inferredKey) : null;
  const resolvedProduct =
    productInterest?.trim() || catalogProduct?.name || conv.productId || 'Genel Bilgi / Satış';

  const finalReason =
    handoverReason ||
    conv.handoverReason ||
    'Müşteri iletişim bilgisi bırakarak geri dönüş talep etti.';

  // 4. Mevcut açık handover varsa güncelle, yoksa yeni oluştur (mükerrer kayıt önleme)
  const existingHandover = conv.handovers?.[0];
  let handover;
  if (existingHandover && existingHandover.status === 'NEW') {
    handover = await prisma.chatHandover.update({
      where: { id: existingHandover.id },
      data: {
        customerPhone: hasValidPhone ? cleanPhone : existingHandover.customerPhone || '',
        customerEmail: hasValidEmail ? cleanEmail : existingHandover.customerEmail,
        customerName: name?.trim() || existingHandover.customerName || conv.customerName,
        relatedProduct: resolvedProduct,
        unansweredQuestion: lastVisitorQuestion,
        conversationSummary,
        handoverReason: finalReason,
      },
    });
  } else {
    handover = await prisma.chatHandover.create({
      data: {
        conversationId: conv.id,
        customerPhone: hasValidPhone ? cleanPhone : conv.customerPhone || '',
        customerEmail: hasValidEmail ? cleanEmail : conv.customerEmail || null,
        customerName: name?.trim() || conv.customerName || null,
        relatedProduct: resolvedProduct,
        unansweredQuestion: lastVisitorQuestion,
        conversationSummary,
        handoverReason: finalReason,
        status: 'NEW',
      },
    });
  }

  // 5. Konuşma kaydını güncelle
  await prisma.chatConversation.update({
    where: { id: conv.id },
    data: {
      customerPhone: hasValidPhone ? cleanPhone : conv.customerPhone,
      customerEmail: hasValidEmail ? cleanEmail : conv.customerEmail,
      customerName: name?.trim() || conv.customerName,
      handoverStatus: 'PENDING_CONTACT',
      handoverReason: finalReason,
    },
  });

  // 6. Onay mesajını sohbete ekle (Bölüm 8.3 SLA mesajı)
  const confirmationText = buildSlaFollowupConfirmationMessage('tr');
  const confirmMessage = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: 'BOT',
      senderName: 'Çiçekana Asistan',
      content: confirmationText,
      isHandoverPrompt: false,
    },
  });

  // 7. Yöneticiye e-posta bildirimi gönder (hata olursa akışı bozmaz)
  await sendChatEventNotification({
    eventType: 'SALES_OPPORTUNITY',
    conversationId: conv.id,
    sessionId: conv.sessionId,
    productName: resolvedProduct,
    pageUrl: pageUrl || conv.pageUrl,
    customerMessage: lastVisitorQuestion,
    conversationSummary,
    customerName: name?.trim() || conv.customerName,
    customerPhone: hasValidPhone ? cleanPhone : conv.customerPhone,
    customerEmail: hasValidEmail ? cleanEmail : conv.customerEmail,
    recommendedAction:
      'Müşteri iletişim bilgilerini bıraktı. Mesai saatleri içinde 30 dakika içerisinde (mesai dışında ilk iş günü) dönüş yapılması hedeflenmektedir.',
  });

  return {
    handover,
    confirmMessage,
    conversationId: conv.id,
  };
}
