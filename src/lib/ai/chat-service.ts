import { prisma } from "@/lib/prisma";
import { generateAIText } from "./gemini-client";
import { retrieveKnowledge, RetrievalResult } from "./retrieval-engine";
import { verifyEvidenceSufficiency } from "./evidence-verifier";

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
 * Orchestrates incoming customer message, RAG retrieval, evidence verification, and Gemini generation.
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

  // 3. Retrieve relevant knowledge chunks and verified DB products
  const retrieval: RetrievalResult = await retrieveKnowledge(trimmedMsg, productId || conv.productId);

  // 4. Verify evidence sufficiency
  const verification = verifyEvidenceSufficiency(
    trimmedMsg,
    retrieval.chunks,
    retrieval.verifiedProducts
  );

  let replyText = "";
  let isHandoverPrompt = false;
  let tokensUsed: number | undefined;
  let suggestedProducts: any[] = [];

  // Format verified products as structured suggestions if any
  if (retrieval.verifiedProducts.length > 0) {
    suggestedProducts = retrieval.verifiedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      price: p.priceFormatted,
      url: p.url,
      description: p.description,
    }));
  }

  if (verification.isGeneralGreeting) {
    // Standard friendly greeting
    replyText =
      "Merhaba! Size nasıl yardımcı olabiliriz? Çiçekana Tech Media ürünlerimiz, otomasyon paketlerimiz ve fiyatlarımız hakkında sorularınızı yanıtlayabilirim.";
  } else if (!verification.sufficient) {
    // Insufficient evidence OR explicit handover request
    isHandoverPrompt = true;
    replyText =
      verification.handoverPrompt ||
      "Bu konuda size yanlış bilgi vermek istemem. Sorunuzu ilgili uzman ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı bırakabilir misiniz?";

    // Update conversation handover status to REQUESTED
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        handoverStatus: "REQUESTED",
        handoverReason: verification.reason || "Bilgi yetersizliği veya müşteri talebi",
      },
    });
  } else {
    // Sufficient evidence: Construct controlled prompt with system guardrails
    const knowledgeSnippets = retrieval.chunks
      .map(
        (c, idx) =>
          `[Kaynak ${idx + 1} - ${c.documentTitle}]:\n${c.content}`
      )
      .join("\n\n");

    const verifiedProductSnippets = retrieval.verifiedProducts
      .map((p) => {
        let details = `Ürün/Hizmet: ${p.name} (${p.priceFormatted}) - URL: ${p.url}`;
        if (p.tiers && p.tiers.length > 0) {
          details += `\nPaketler: ` + p.tiers.map((t) => `${t.name}: ${t.priceFormatted}`).join(", ");
        }
        return details;
      })
      .join("\n\n");

    const systemInstruction = `Sen "Çiçekana Tech Media" müşteri hizmetleri ve satış destek asistanısın.
GÖREVİN:
Ziyaretçilerin sorularına yalnızca aşağıda sana sunulan doğrulanmış bilgi kaynakları ve yetkili ürün verilerini kullanarak samimi, profesyonel ve kısa yanıtlar vermek.

EN KRİTİK GÜVENLİK VE DOĞRULUK KURALLARI:
1. Bilgi kaynaklarında bulunmayan HİÇBİR özellik, entegrasyon, kampanya veya fiyat uydurma.
2. Tahmin yürütme; "büyük ihtimalle vardır", "desteklenir" gibi varsayımsal sözler verme.
3. Yanıtın kısa, net ve anlaşılır olsun (en fazla 2-3 cümle veya kısa maddeler). Müşteri daha fazla detay isterse o zaman genişlet.
4. Müşteriye uygun durumlarda doğrulanmış ürün bağlantısını öner.
5. Asla robot veya yapay zeka olduğunu abartılı şekilde vurgulama; normal bir müşteri hizmetleri ekibi gibi doğal konuş.
6. <verified_knowledge> ve <verified_products> blokları dışındaki hiçbir iddiayı doğru kabul etme.`;

    const promptContent = `<verified_knowledge>
${knowledgeSnippets || "Özel doküman kaydı yok."}
</verified_knowledge>

<verified_products>
${verifiedProductSnippets || "Özel ürün kaydı yok."}
</verified_products>

Müşterinin Sorusu:
"${trimmedMsg}"

Yanıt:`;

    try {
      const aiResponse = await generateAIText(promptContent, {
        systemInstruction,
        temperature: 0.2, // Low temperature for high factual adherence
        maxOutputTokens: 350,
      });

      replyText = aiResponse.text;
      tokensUsed = aiResponse.tokensUsed;
    } catch (aiErr) {
      console.error("[ChatService] AI generation error fallback:", aiErr);
      isHandoverPrompt = true;
      replyText =
        "Bu konuda size yanlış bilgi vermek istemem. Sorunuzu ilgili uzman ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı bırakabilir misiniz?";
    }
  }

  // 5. Persist bot reply to audit log
  const botMsgRecord = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: "BOT",
      senderName: "Çiçekana Destek",
      content: replyText,
      isDelivered: true,
      tokensUsed,
      suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined,
      usedDocumentIds: retrieval.usedDocumentIds,
      evidenceConfidence: verification.confidence,
      isHandoverPrompt,
    },
  });

  return {
    conversationId: conv.id,
    userMessageId: userMsgRecord.id,
    botMessageId: botMsgRecord.id,
    reply: replyText,
    isHandoverPrompt,
    handoverReason: verification.reason,
    suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined,
    usedDocumentIds: retrieval.usedDocumentIds,
    evidenceConfidence: verification.confidence,
  };
}
