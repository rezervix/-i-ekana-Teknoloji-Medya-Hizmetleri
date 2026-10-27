import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber, isValidTurkishPhone } from "@/lib/auth-security";

export interface CreateHandoverParams {
  conversationId: string;
  sessionId: string;
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
}

export interface HandoverResult {
  success: boolean;
  handoverId?: string;
  message: string;
  error?: string;
}

/**
 * Handles customer contact registration and human lead dispatch.
 */
export async function submitCustomerHandover(
  params: CreateHandoverParams
): Promise<HandoverResult> {
  const { conversationId, sessionId, phone, name, email, notes } = params;

  // 1. Phone validation using Turkish phone validator
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!isValidTurkishPhone(normalizedPhone)) {
    return {
      success: false,
      error: "INVALID_PHONE",
      message:
        "Lütfen geçerli bir cep telefonu numarası giriniz (örn: 0532 123 45 67 veya +90 532 123 45 67).",
    };
  }

  // 2. Load conversation
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!conv || conv.sessionId !== sessionId) {
    return {
      success: false,
      error: "CONVERSATION_NOT_FOUND",
      message: "Sohbet oturumu bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.",
    };
  }

  // Find the unanswered question or last visitor inquiry
  const visitorMessages = conv.messages.filter((m) => m.senderType === "VISITOR");
  const lastQuestion = visitorMessages.length > 0 ? visitorMessages[0].content : "Genel müşteri talebi";

  // Build conversation summary snippet
  const summarySnippet = conv.messages
    .slice()
    .reverse()
    .map((m) => `[${m.senderType}]: ${m.content}`)
    .join("\n");

  try {
    // 3. Check for existing pending handover for this conversation (Idempotency check)
    let handover = await prisma.chatHandover.findFirst({
      where: {
        conversationId: conv.id,
        status: { in: ["NEW", "IN_REVIEW"] },
      },
    });

    if (handover) {
      // Update existing record
      handover = await prisma.chatHandover.update({
        where: { id: handover.id },
        data: {
          customerPhone: normalizedPhone,
          customerName: name?.trim() || handover.customerName,
          customerEmail: email?.trim() || handover.customerEmail,
          agentNotes: notes ? `${handover.agentNotes || ""}\nMüşteri ek notu: ${notes}` : handover.agentNotes,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new handover lead
      handover = await prisma.chatHandover.create({
        data: {
          conversationId: conv.id,
          customerPhone: normalizedPhone,
          customerName: name?.trim() || null,
          customerEmail: email?.trim() || null,
          relatedProduct: conv.productId || null,
          unansweredQuestion: lastQuestion,
          conversationSummary: summarySnippet.slice(0, 3000),
          handoverReason: conv.handoverReason || "Müşteri temsilcisi talebi",
          status: "NEW",
          agentNotes: notes ? `Müşteri notu: ${notes}` : null,
        },
      });
    }

    // 4. Update conversation state
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        customerPhone: normalizedPhone,
        customerName: name?.trim() || conv.customerName,
        customerEmail: email?.trim() || conv.customerEmail,
        status: "HANDED_OVER",
        handoverStatus: "PENDING_CONTACT",
      },
    });

    // 5. Append system message to chat log
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderType: "SYSTEM",
        senderName: "Sistem",
        content: `Müşteri temsilcisine yönlendirme talebi oluşturuldu. İletişim: ${normalizedPhone}`,
        isDelivered: true,
      },
    });

    // 6. Return honest customer-facing status confirmation
    return {
      success: true,
      handoverId: handover.id,
      message:
        "Talebinizi ekibimize ilettik. İletişim bilgileriniz ve sorunuz kayıt altına alındı. Müşteri temsilcimiz en kısa sürede sizinle iletişime geçecektir.",
    };
  } catch (err: any) {
    console.error("[HandoverService] Error saving handover:", err);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message:
        "Talebiniz kaydedilirken geçici bir hata oluştu. Lütfen birazdan tekrar deneyiniz veya iletişim sayfamızdan bize ulaşınız.",
    };
  }
}
