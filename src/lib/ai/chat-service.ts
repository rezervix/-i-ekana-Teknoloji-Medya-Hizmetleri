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
    isHandoverPrompt = false;
    replyText =
      "Merhaba! Size nasıl yardımcı olabiliriz? Çiçekana Tech Media ürünlerimiz, otomasyon paketlerimiz ve fiyatlarımız hakkında sorularınızı yanıtlayabilirim.";
  } else if (verification.isExplicitHandoverRequest) {
    // ONLY prompt for handover phone when user explicitly requested callback or human agent
    isHandoverPrompt = true;
    replyText =
      verification.handoverPrompt ||
      "Talebinizi memnuniyetle müşteri temsilcimize aktarabiliriz. Size en kısa sürede ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?";

    // Update conversation handover status to REQUESTED
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        handoverStatus: "REQUESTED",
        handoverReason: verification.reason || "Müşteri doğrudan temsilci veya arama talep etti",
      },
    });
  } else if (!verification.sufficient) {
    // Insufficient evidence in knowledge base, but user did NOT request handover
    // Politely state lack of verification WITHOUT demanding phone numbers
    isHandoverPrompt = false;
    replyText =
      verification.handoverPrompt ||
      "Bu konuda sistemimizde doğrulanmış yeterli bilgi bulunamadı. Dilerseniz sorunuzu biraz daha detaylandırabilir veya müşteri temsilcimize bağlanmak istediğinizi belirtebilirsiniz.";
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

    const systemInstruction = `Sen "Çiçekana Tech Media" merkezi müşteri hizmetleri ve satış danışmanı asistanısın.

GÖREVİN:
Web sitemize giren ziyaretçilerin tüm sorularına yalnızca sana sunulan doğrulanmış bilgi kaynakları (<verified_knowledge>) ve yetkili ürün verilerini (<verified_products>) kullanarak samimi, profesyonel, kurumsal ve kısa yanıtlar vermek.

MİMARİ VE KAPSAM PRENSİPLERİ:
1. MERKEZİ ASİSTAN: Tek bir ürüne veya tek bir sayfaya hapsolma. Çiçekana Tech Media'nın sunduğu bütün çözümler (Web tasarımı & geliştirme, e-ticaret altyapıları, sosyal medya & Google Ads reklam danışmanlığı, yapay zekâ ve otomasyon sistemleri -Midvem, Microsoft Call Center AI, Faktura, ScoreForm, Kuşçu-, genç girişimci desteği, kurumsal matbaa/baskı ürünleri) hakkında bilgi ver. Kullanıcı hangi sayfada olursa olsun farklı bir ürün veya hizmet sorduğunda o konuyu memnuniyetle yanıtla.
2. FİYATLANDIRMA KURALLARI:
   - Doğrulanmış fiyat bilgisi varsa (örn. Midvem Başlangıç 7.500 TL/ay, Pro 15.000 TL/ay, Kurumsal 25.000 TL/ay; Faktura 7.500 TL/ay; ScoreForm 5.000 TL/ay; Kuşçu 15.000 TL/ay) bunu net ve şeffafça paylaş.
   - Küçük esnaf için paket sorulduğunda doğrulanmış en uygun başlangıç paketini belirt.
   - Sistemlerin bedava/ücretsiz olmadığını açıkça ifade et; hiçbir zaman ücretsiz paket veya doğrulanmamış indirim uydurma.
   - Web tasarımı ve özel yazılım gibi projeye göre değişen hizmetlerde sabit fiyat olmadığını, kapsam analizine göre müşteri temsilcisi tarafından tekliflendirildiğini belirt.
3. SHOPIFY VE E-TİCARET ENTEGRASYONLARI:
   - Destek görüşmesi sırasında müşteri siparişleri, tutarları ve kargo teslimat durumları ekranı kapatmadan sohbetin sağ yan panelinde anlık olarak görüntülenebilir (Shopify'a her seferinde ayrı sekmeden bakmaya gerek kalmaz).
   - Bu yeteneğin hazır bir özellik olduğunu ancak aktif olabilmesi için müşterinin aktif bir Shopify mağazasının bulunması ve mağaza entegrasyon bağlantısının yapılmış olması gerektiğini açıkça vurgula (otomatik açık gelmez).
4. DOĞRULUK VE GÜVENLİK:
   - Bilgi kaynaklarında bulunmayan HİÇBİR özellik, entegrasyon veya ticari koşul uydurma.
   - Kesin bilgi bulunmuyorsa durumu dürüstçe açıkla.
   - Doğal, kibar ve profesyonel bir müşteri temsilcisi dili kullan; aşırı robotik kalıplardan kaçın.
5. İLETİŞİM VE TELEFON İSTEMEME KURALI (KRİTİK):
   - KULLANICI AÇIKÇA ARANMAK YA DA MÜŞTERİ TEMSİLCİSİNE BAĞLANMAK İSTEMEDİKÇE: Kesinlikle kullanıcıdan telefon numarası, iletişim bilgisi veya arama talebi İSTEME.
   - "Telefon numaranızı bırakın sizi arayalım", "İletişim bilgilerinizi bırakırsanız uzman ekibimiz ulaşabilir" gibi ifadeleri ASLA kendi inisiyatifinle yanıta ekleme.
   - Soruyu net, kurumsal ve bilgilendirici şekilde yanıtla ve normal sohbete devam et.`;

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
        maxOutputTokens: 400,
      });

      replyText = aiResponse.text;
      tokensUsed = aiResponse.tokensUsed;
      isHandoverPrompt = false;
    } catch (aiErr: any) {
      console.error("[ChatService] AI generation error fallback:", aiErr);
      isHandoverPrompt = false; // Never force phone collection on transient AI errors
      replyText =
        "Şu anda yanıtınızı hazırlarken geçici bir teknik yoğunluk yaşandı. Lütfen sorunuzu birazdan tekrar deneyiniz veya dilerseniz müşteri temsilcimizle görüşmek istediğinizi iletebilirsiniz.";
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
