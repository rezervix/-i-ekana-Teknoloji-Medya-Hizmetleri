import { prisma } from "@/lib/prisma";
import { executeDeterministicKnowledgeEngine } from "@/lib/nlp/knowledge-engine";

export interface ChatServiceResponse {
  conversationId: string;
  userMessageId: string;
  botMessageId: string;
  reply: string;
  isHandoverPrompt: boolean;
  handoverReason?: string;
  suggestedProducts?: any[];
  usedDocumentIds?: string[];
  evidenceConfidence?: number;
}

/**
 * Loads or initializes a conversation session.
 */
export async function getOrCreateConversation(params: {
  sessionId: string;
  pageUrl?: string;
  productId?: string;
  userId?: string;
}) {
  const { sessionId, pageUrl, productId, userId } = params;

  let conv = await prisma.chatConversation.findFirst({
    where: {
      sessionId,
      status: { in: ["ACTIVE", "HANDED_OVER"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
      },
    },
  });

  if (!conv) {
    conv = await prisma.chatConversation.create({
      data: {
        sessionId,
        pageUrl,
        productId,
        userId,
        status: "ACTIVE",
        title: "Yeni Müşteri Sohbeti",
      },
      include: {
        messages: true,
      },
    });
  }

  return conv;
}

/**
 * Orchestrates incoming customer message via 100% deterministic local knowledge engine.
 * Completely free of external Generative AI API calls (Zero Gemini, Zero OpenAI).
 */
export async function handleCustomerMessage(params: {
  conversationId: string;
  sessionId: string;
  message: string;
  pageUrl?: string;
  productId?: string;
}): Promise<ChatServiceResponse> {
  const { conversationId, sessionId, message, pageUrl, productId } = params;

  const trimmedMsg = message.trim();
  if (!trimmedMsg) {
    throw new Error("EMPTY_MESSAGE: Mesaj içeriği boş olamaz.");
  }
  if (trimmedMsg.length > 600) {
    throw new Error("MESSAGE_TOO_LONG: Mesajınız çok uzun (maksimum 600 karakter).");
  }

  // 1. Verify or find conversation
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conv || conv.sessionId !== sessionId) {
    throw new Error("CONVERSATION_NOT_FOUND: Geçersiz sohbet oturumu.");
  }

  // 2. Persist user message to audit log
  const userMsgRecord = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: "VISITOR",
      content: trimmedMsg,
      isDelivered: true,
    },
  });

  // Update conversation last touch
  await prisma.chatConversation.update({
    where: { id: conv.id },
    data: {
      updatedAt: new Date(),
      ...(pageUrl ? { pageUrl } : {}),
      ...(productId ? { productId } : {}),
    },
  });

  // 3. Process query through 100% Deterministic Local Engine (Zero external AI calls)
  const engineResult = await executeDeterministicKnowledgeEngine(
    trimmedMsg,
    productId || conv.productId
  );

  // 4. Update handover status on explicit handover requests
  if (engineResult.isHandoverPrompt) {
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        handoverStatus: "REQUESTED",
        handoverReason: engineResult.handoverReason || "Müşteri doğrudan temsilci veya arama talep etti",
      },
    });
  }

  // 5. If low confidence / fallback, safely record into unanswered question log for continuous improvement
  if (engineResult.isFallback || engineResult.confidenceLevel === "LOW") {
    try {
      await prisma.unansweredQuestionLog.create({
        data: {
          question: trimmedMsg,
          conversationId: conv.id,
          matchedScore: engineResult.matchedEvidence[0]?.score || 0,
          candidateDocId: engineResult.usedDocumentIds[0] || null,
          confidence: engineResult.confidence,
          status: "PENDING",
        },
      });
    } catch (logErr) {
      console.warn("[ChatService] Failed to record unanswered question:", logErr);
    }
  }

  // 6. Persist bot reply to audit log
  const botMsgRecord = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: "BOT",
      senderName: "Çiçekana Destek",
      content: engineResult.answer,
      isDelivered: true,
      tokensUsed: 0, // Deterministic local response consumes zero AI tokens
      suggestedProducts:
        engineResult.suggestedProducts && engineResult.suggestedProducts.length > 0
          ? engineResult.suggestedProducts
          : undefined,
      usedDocumentIds: engineResult.usedDocumentIds,
      evidenceConfidence: engineResult.confidence,
      isHandoverPrompt: engineResult.isHandoverPrompt,
    },
  });

  return {
    conversationId: conv.id,
    userMessageId: userMsgRecord.id,
    botMessageId: botMsgRecord.id,
    reply: engineResult.answer,
    isHandoverPrompt: engineResult.isHandoverPrompt,
    handoverReason: engineResult.handoverReason,
    suggestedProducts: engineResult.suggestedProducts,
    usedDocumentIds: engineResult.usedDocumentIds,
    evidenceConfidence: engineResult.confidence,
  };
}

