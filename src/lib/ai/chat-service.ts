import { prisma } from '@/lib/prisma';
import { resolveVerifiedContextFromUrl } from './retrieval-engine';
import {
  executeDeterministicKnowledgeEngine,
  cleanChunkTextForCustomer,
  type EngineResponse,
} from '@/lib/nlp/knowledge-engine';
import {
  getVerifiedCatalog,
  inferProductKeyFromContext,
  sanitizeAndResolveConflictsInKBText,
  isMagazaStoreQuery,
  type CatalogProduct,
} from './product-catalog';
import { sendChatEventNotification } from './chat-notifications';
import { executeDomainGeneration } from './core/ai-service-manager';
import { loadCentralAiVault } from './core/key-vault-and-models';
import {
  getChatbotCentralSettings,
  buildEnforcedSystemInstruction,
} from './chatbot-settings';

export interface ChatInitParams {
  sessionId: string;
  userId?: string | null;
  pageUrl?: string;
  productId?: string;
}

export interface SendMessageParams {
  conversationId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  message: string;
  pageUrl?: string;
  productId?: string;
}

/**
 * Sayfa açılışında veya sohbet penceresi açıldığında YALNIZCA mevcut ve gerçek mesaj içeren
 * bir konuşma varsa onu döndürür; veritabanında ASLA boş konuşma kaydı oluşturmaz (Bölüm 11.1).
 */
export async function getExistingConversationBySession(params: ChatInitParams) {
  const { sessionId } = params;
  if (!sessionId || !sessionId.trim()) return null;

  const existing = await prisma.chatConversation.findFirst({
    where: {
      sessionId: sessionId.trim(),
      status: { not: 'CLOSED' },
      OR: [
        { messages: { some: { senderType: 'VISITOR' } } },
        { messages: { some: { senderType: 'AGENT' } } },
        { handovers: { some: {} } },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return existing;
}

/**
 * Gerçek bir kullanıcı mesajı geldiğinde konuşmayı bulur veya ilk kez oluşturur.
 */
export async function getOrCreateConversation(params: ChatInitParams) {
  const { sessionId, userId, pageUrl, productId } = params;

  const existing = await prisma.chatConversation.findFirst({
    where: {
      sessionId,
      status: { not: 'CLOSED' },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const verifiedContext = await resolveVerifiedContextFromUrl(pageUrl);
  const resolvedProductId =
    productId ||
    verifiedContext?.productId ||
    inferProductKeyFromContext(pageUrl, productId) ||
    null;

  let customerName: string | null = null;
  let customerEmail: string | null = null;
  let customerPhone: string | null = null;

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true },
      });
      if (user) {
        customerName = user.name;
        customerEmail = user.email;
        customerPhone = user.phone;
      }
    } catch {
      // Ignore user lookup errors
    }
  }

  const conversation = await prisma.chatConversation.create({
    data: {
      sessionId,
      userId: userId || null,
      pageUrl: pageUrl || null,
      productId: resolvedProductId,
      customerName,
      customerEmail,
      customerPhone,
      status: 'ACTIVE',
      title: customerName ? `${customerName} ile Sohbet` : 'Yeni Müşteri Sohbeti',
    },
    include: {
      messages: true,
    },
  });

  return conversation;
}

function buildConversationSummary(
  messages: Array<{ senderType: string; content: string }>,
  latestVisitorMsg?: string
): string {
  const all = [...messages];
  if (latestVisitorMsg) {
    all.push({ senderType: 'VISITOR', content: latestVisitorMsg });
  }
  return all
    .slice(-6)
    .map((m) => {
      const label =
        m.senderType === 'VISITOR' ? 'Müşteri' : m.senderType === 'AGENT' ? 'Temsilci' : 'Asistan';
      return `${label}: ${m.content.slice(0, 150)}${m.content.length > 150 ? '...' : ''}`;
    })
    .join('\n');
}

/**
 * Gemini API entegrasyonu:
 * Doğrulanmış katalog verisi, bilgi bankası kanıtları ve Merkezi Chatbot Ayarlarını
 * (anahtar havuzu, model önceliği, sistem talimatı, üslup) kullanarak doğal ve
 * satış/destek kurallarına %100 uyumlu yanıt üretir; hata veya politika ihlali riskinde
 * deterministik yanıta geri döner (Fallback).
 */
async function synthesizeWithGeminiIfApplicable(params: {
  userMessage: string;
  engineResult: EngineResponse;
  matchedProduct: CatalogProduct | null;
  conversationHistory: Array<{ senderType: string; content: string }>;
  conversationId?: string;
}): Promise<{ finalAnswer: string; usedGemini: boolean }> {
  const { userMessage, engineResult, matchedProduct, conversationHistory, conversationId } = params;

  // Policy-locked categories MUST use deterministic verified output directly
  const policyLockedCategories = new Set([
    'injection_blocked',
    'magaza_excluded',
    'out_of_scope',
    'contact_captured',
    'support_escalation',
    'unanswered_in_scope',
    'special_offer_service',
    'sales_catalog',
    'needs_analysis',
    'greeting',
    'handover',
  ]);

  if (
    !engineResult.responseCategory ||
    policyLockedCategories.has(engineResult.responseCategory) ||
    process.env.CHAT_DISABLE_GEMINI === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    return { finalAnswer: engineResult.answer, usedGemini: false };
  }

  const centralSettings = await getChatbotCentralSettings();
  if (!centralSettings.isEnabled) {
    return { finalAnswer: engineResult.answer, usedGemini: false };
  }

  const vault = await loadCentralAiVault();
  const hasVaultKey = vault.keys.some(
    (k) =>
      k.isActive &&
      k.status !== 'INACTIVE' &&
      k.status !== 'INVALID' &&
      k.purpose !== 'PRODUCT_EDIT'
  );
  const hasEnvKey = Boolean(
    process.env.GEMINI_SUPPORT_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
  );

  if (!hasVaultKey && !hasEnvKey) {
    return { finalAnswer: engineResult.answer, usedGemini: false };
  }

  try {
    const productContextBlock = matchedProduct
      ? [
          `İLGİLİ ÜRÜN: ${matchedProduct.name}`,
          `AÇIKLAMA: ${matchedProduct.shortDescription}`,
          `GÜNCEL ÜRÜN SAYFASI PAKET VE FİYATLARI (KESİN ÖNCELİKLİ):`,
          ...matchedProduct.tiers.map(
            (t) => `- ${t.name}: ${t.priceFormatted} (${t.features.join(', ')})`
          ),
          `SATIN ALMA / DETAY URL: ${matchedProduct.purchaseUrl}`,
        ].join('\n')
      : 'Genel Çiçekana Teknoloji & Medya Hizmetleri';

    const evidenceBlock = engineResult.matchedEvidence
      .slice(0, centralSettings.maxRetrievalChunks || 3)
      .map((ev, i) => `[Kanıt ${i + 1} - ${ev.sourceTitle}]: ${ev.snippet}`)
      .join('\n\n');

    const historyBlock = conversationHistory
      .slice(-6)
      .map((m) => `${m.senderType === 'VISITOR' ? 'Müşteri' : 'Asistan'}: ${m.content}`)
      .join('\n');

    const systemInstruction = buildEnforcedSystemInstruction(centralSettings);

    const prompt = [
      '--- DOĞRULANMIŞ ÜRÜN VERİSİ ---',
      productContextBlock,
      '',
      '--- BİLGİ BANKASI KANITLARI ---',
      evidenceBlock || engineResult.answer,
      '',
      '--- SON KONUŞMA GEÇMİŞİ ---',
      historyBlock || '(İlk mesaj)',
      '',
      `MÜŞTERİ SORUSU: ${userMessage}`,
      '',
      `REFERANS DOĞRULANMIŞ YANIT: ${engineResult.answer}`,
      '',
      'Yukarıdaki doğrulanmış bilgilere sadık kalarak müşteriye doğrudan, net ve profesyonel yanıt ver:',
    ].join('\n');

    const aiResponse = await executeDomainGeneration('SUPPORT', prompt, {
      systemInstruction,
      temperature: centralSettings.temperature ?? 0.2,
      maxOutputTokens: centralSettings.maxOutputTokens ?? 350,
      timeoutMs: centralSettings.requestTimeoutMs ?? 15000,
    });

    if (!aiResponse.text?.trim()) {
      return { finalAnswer: engineResult.answer, usedGemini: false };
    }

    const cleaned = cleanChunkTextForCustomer(aiResponse.text.trim());
    // Never allow /magaza links or prompt leakage
    if (
      isMagazaStoreQuery(cleaned) ||
      cleaned.includes('REFERANS DOĞRULANMIŞ YANIT') ||
      cleaned.length < 15
    ) {
      return { finalAnswer: engineResult.answer, usedGemini: false };
    }

    const { sanitizedText } = sanitizeAndResolveConflictsInKBText(cleaned, matchedProduct);
    return { finalAnswer: sanitizedText, usedGemini: true };
  } catch (err: any) {
    console.warn('[ChatService] Gemini synthesis fallback to deterministic engine:', err?.message);
    if (centralSettings.notifyOnSystemError && conversationId) {
      sendChatEventNotification({
        eventType: 'SYSTEM_ERROR',
        conversationId,
        customerMessage: userMessage,
        conversationSummary: `AI Sentez Yedek Geçiş Uyarısı: ${err?.message || 'Bilinmeyen hata'}`,
      }).catch(() => {});
    }
    return { finalAnswer: engineResult.answer, usedGemini: false };
  }
}

/**
 * Gerçek müşteri mesajını işler:
 * - Gerekirse konuşma kaydını ilk mesaj anında oluşturur (boş oturum oluşmasını önler).
 * - İlk mesaj bildirimini ve olay bazlı (takip, satış fırsatı, destek) e-posta bildirimlerini gönderir.
 * - Müşteri sohbet içinde telefon veya e-posta paylaştıysa otomatik olarak yakalar ve kaydeder.
 */
export async function handleCustomerMessage(params: SendMessageParams) {
  const { conversationId, sessionId, userId, message, pageUrl, productId } = params;

  const trimmedMsg = (message || '').trim();
  if (!trimmedMsg) {
    throw new Error('Mesaj içeriği boş olamaz.');
  }

  const centralSettings = await getChatbotCentralSettings();

  // 1. Konuşmayı bul veya ilk gerçek mesaj geldiği için şimdi oluştur
  let conv = conversationId
    ? await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
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
      where: {
        sessionId,
        status: { not: 'CLOSED' },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        handovers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!conv) {
    const created = await getOrCreateConversation({
      sessionId: sessionId || `sid_${Date.now()}`,
      userId,
      pageUrl,
      productId,
    });
    conv = {
      ...created,
      handovers: [],
    };
  }

  const priorVisitorMessages = conv.messages.filter((m) => m.senderType === 'VISITOR');
  const isFirstVisitorMessage = priorVisitorMessages.length === 0;

  const effectivePageUrl = pageUrl || conv.pageUrl || null;
  const effectiveProductId =
    productId || conv.productId || inferProductKeyFromContext(effectivePageUrl, productId) || null;

  // 2. Ziyaretçi mesajını kaydet
  const visitorMessage = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: 'VISITOR',
      senderName: conv.customerName || 'Ziyaretçi',
      content: trimmedMsg,
    },
  });

  // İlk mesajda konuşma başlığını anlamlı hale getir
  if (isFirstVisitorMessage && (!conv.title || conv.title === 'Yeni Müşteri Sohbeti')) {
    const shortTitle = trimmedMsg.slice(0, 60) + (trimmedMsg.length > 60 ? '...' : '');
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        title: conv.customerName ? `${conv.customerName}: ${shortTitle}` : shortTitle,
        pageUrl: effectivePageUrl,
        productId: effectiveProductId,
      },
    });
  } else {
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        updatedAt: new Date(),
        ...(effectivePageUrl && !conv.pageUrl ? { pageUrl: effectivePageUrl } : {}),
        ...(effectiveProductId && !conv.productId ? { productId: effectiveProductId } : {}),
      },
    });
  }

  // 3. Eğer temsilci devralmışsa (HANDED_OVER) bot araya girmez
  if (conv.status === 'HANDED_OVER') {
    return {
      conversationId: conv.id,
      visitorMessage,
      botMessage: null,
      status: 'HANDED_OVER',
    };
  }

  // 3b. Eğer yönetici merkezi ayarlardan Chatbot'u pasif duruma aldıysa (isEnabled === false),
  // müşteri mesajını kaybetmeden kibar bir çevrimdışı/iletişim yanıtı dön.
  if (!centralSettings.isEnabled) {
    const offlineMessage = await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderType: 'BOT',
        senderName: 'Çiçekana Asistan',
        content:
          'Mesajınız ekibimize iletilmiştir. Dijital asistanımız şu anda bakım/pasif modundadır; uzman müşteri temsilcimizin size en kısa sürede dönüş yapabilmesi için telefon numaranızı veya e-posta adresinizi paylaşabilirsiniz.',
        isHandoverPrompt: true,
      },
    });

    if (isFirstVisitorMessage) {
      await sendChatEventNotification({
        eventType: 'FIRST_MESSAGE',
        conversationId: conv.id,
        sessionId: conv.sessionId,
        productName: effectiveProductId || 'Genel',
        pageUrl: effectivePageUrl,
        customerMessage: trimmedMsg,
        conversationSummary: trimmedMsg,
      });
    }

    return {
      conversationId: conv.id,
      visitorMessage,
      botMessage: offlineMessage,
      isHandoverPrompt: true,
      shouldShowHandoverForm: true,
      status: conv.status,
    };
  }

  // 4. Bilgi, katalog ve kural motorunu çalıştır (konuşma geçmişi ve sayfa bağlamıyla)
  const conversationHistory = conv.messages.map((m) => ({
    senderType: m.senderType,
    content: m.content,
  }));

  const engineResult = await executeDeterministicKnowledgeEngine(trimmedMsg, effectiveProductId, {
    pageUrl: effectivePageUrl,
    conversationHistory,
  });

  const catalog = await getVerifiedCatalog();
  const matchedProduct = engineResult.detectedProductKey
    ? catalog.find((c) => c.key === engineResult.detectedProductKey) || null
    : null;

  // Opsiyonel Gemini sentezi (feature_qa kategorisinde kanıtları doğal cümlelerle sunar)
  const { finalAnswer } = await synthesizeWithGeminiIfApplicable({
    userMessage: trimmedMsg,
    engineResult,
    matchedProduct,
    conversationHistory,
    conversationId: conv.id,
  });

  // 5. Bot mesajını kaydet
  const botMessage = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: 'BOT',
      senderName: 'Çiçekana Asistan',
      content: finalAnswer,
      usedDocumentIds: engineResult.usedDocumentIds,
      evidenceConfidence: engineResult.confidence,
      isHandoverPrompt: engineResult.isHandoverPrompt,
      suggestedProducts:
        engineResult.suggestedProducts && engineResult.suggestedProducts.length > 0
          ? engineResult.suggestedProducts
          : undefined,
    },
  });

  const resolvedProductName =
    engineResult.detectedProductName ||
    matchedProduct?.name ||
    conv.productId ||
    'Genel Bilgi / Satış';

  const summaryText = buildConversationSummary(conversationHistory, trimmedMsg);

  // 6. Müşteri sohbet mesajında telefon veya e-posta paylaştıysa kaydet (Bölüm 8.2 & Test H)
  if (
    engineResult.responseCategory === 'contact_captured' &&
    engineResult.extractedContact &&
    (engineResult.extractedContact.phone || engineResult.extractedContact.email)
  ) {
    const { phone, email, name } = engineResult.extractedContact;
    const lastQuestionBeforeContact =
      priorVisitorMessages.length > 0
        ? priorVisitorMessages[priorVisitorMessages.length - 1].content
        : trimmedMsg;

    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        customerPhone: phone || conv.customerPhone,
        customerEmail: email || conv.customerEmail,
        customerName: name || conv.customerName,
        handoverStatus: 'PENDING_CONTACT',
        handoverReason:
          engineResult.handoverReason || 'Müşteri sohbet içinde iletişim bilgisini paylaştı.',
      },
    });

    const existingHandover = conv.handovers?.[0];
    if (existingHandover && existingHandover.status === 'NEW') {
      await prisma.chatHandover.update({
        where: { id: existingHandover.id },
        data: {
          customerPhone: phone || existingHandover.customerPhone || '',
          customerEmail: email || existingHandover.customerEmail || null,
          customerName: name || existingHandover.customerName || conv.customerName,
          relatedProduct: resolvedProductName,
          unansweredQuestion: lastQuestionBeforeContact,
          conversationSummary: summaryText,
        },
      });
    } else {
      await prisma.chatHandover.create({
        data: {
          conversationId: conv.id,
          customerPhone: phone || conv.customerPhone || '',
          customerEmail: email || conv.customerEmail || null,
          customerName: name || conv.customerName || null,
          relatedProduct: resolvedProductName,
          unansweredQuestion: lastQuestionBeforeContact,
          conversationSummary: summaryText,
          handoverReason:
            engineResult.handoverReason || 'Müşteri sohbet içinde iletişim bilgisini paylaştı.',
          status: 'NEW',
        },
      });
    }
  } else if (engineResult.isHandoverPrompt && engineResult.handoverReason) {
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: {
        handoverStatus: conv.handoverStatus === 'PENDING_CONTACT' ? 'PENDING_CONTACT' : 'REQUESTED',
        handoverReason: engineResult.handoverReason,
      },
    });
  }

  // 7. Kapsam içi cevapsız soruları UnansweredQuestionLog tablosuna kaydet (kapsam dışı soruları kaydetme!)
  if (engineResult.shouldLogUnanswered) {
    try {
      await prisma.unansweredQuestionLog.create({
        data: {
          question: trimmedMsg,
          conversationId: conv.id,
          matchedScore: engineResult.matchedEvidence[0]?.score || 0,
          candidateDocId: engineResult.usedDocumentIds[0] || null,
          confidence: engineResult.confidence,
          status: 'PENDING',
        },
      });
    } catch (logErr) {
      console.warn('[ChatService] Failed to log unanswered question:', logErr);
    }
  }

  // 8. E-posta Bildirimlerini Gönder (Bölüm 10)
  // A) İlk gerçek müşteri mesajı geldiğinde 1 adet Yeni Görüşme bildirimi gönder
  if (isFirstVisitorMessage) {
    await sendChatEventNotification({
      eventType: 'FIRST_MESSAGE',
      conversationId: conv.id,
      sessionId: conv.sessionId,
      productName: resolvedProductName,
      pageUrl: effectivePageUrl,
      customerMessage: trimmedMsg,
      conversationSummary: summaryText,
      customerName: engineResult.extractedContact?.name || conv.customerName,
      customerPhone: engineResult.extractedContact?.phone || conv.customerPhone,
      customerEmail: engineResult.extractedContact?.email || conv.customerEmail,
    });
  }

  // B) Önemli olay bildirimleri (Takip gereken ürün sorusu, Satış fırsatı/İletişim bilgisi, Teknik destek yönlendirmesi)
  if (engineResult.shouldNotifyEvent) {
    await sendChatEventNotification({
      eventType: engineResult.shouldNotifyEvent,
      conversationId: conv.id,
      sessionId: conv.sessionId,
      productName: resolvedProductName,
      pageUrl: effectivePageUrl,
      customerMessage: trimmedMsg,
      conversationSummary: summaryText,
      customerName: engineResult.extractedContact?.name || conv.customerName,
      customerPhone: engineResult.extractedContact?.phone || conv.customerPhone,
      customerEmail: engineResult.extractedContact?.email || conv.customerEmail,
    });
  }

  return {
    conversationId: conv.id,
    visitorMessage,
    botMessage,
    isHandoverPrompt: engineResult.isHandoverPrompt,
    shouldShowHandoverForm: engineResult.isHandoverPrompt,
    intent: engineResult.detectedIntent,
    responseCategory: engineResult.responseCategory,
    confidenceLevel: engineResult.confidenceLevel,
    clarifyingOptions:
      centralSettings.clarifyingQuestionPolicy === 'disabled'
        ? undefined
        : engineResult.clarifyingOptions,
    status: conv.status,
  };
}
