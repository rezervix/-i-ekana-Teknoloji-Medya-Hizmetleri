"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  X,
  Send,
  Phone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Headphones,
} from "lucide-react";
import Logo from "@/components/Logo";

interface ChatMessageItem {
  id: string;
  senderType: "VISITOR" | "BOT" | "AGENT" | "SYSTEM";
  senderName?: string | null;
  content: string;
  isHandoverPrompt?: boolean;
  suggestedProducts?: {
    id: string;
    name: string;
    price: string;
    url: string;
    description?: string;
  }[];
  createdAt: string | Date;
}

export default function CustomerSupportChat() {
  const pathname = usePathname();

  // Hide completely on admin routes
  const isAdmin = pathname?.startsWith("/admin");

  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handover state
  const [showHandoverForm, setShowHandoverForm] = useState(false);
  const [handoverDismissed, setHandoverDismissed] = useState(false);
  const [handoverPhone, setHandoverPhone] = useState("");
  const [handoverName, setHandoverName] = useState("");
  const [kvkkConsent, setKvkkConsent] = useState(true);
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);
  const [handoverError, setHandoverError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasTrackedFirstMessage = useRef(false);

  // Helper to send funnel analytics events
  const trackChatEvent = useCallback(
    (event: string, metadata: Record<string, any> = {}) => {
      try {
        if (!sessionId) return;
        const payload = {
          sessionId,
          event,
          device: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
          metadata: {
            pathname,
            ...metadata,
          },
        };

        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});

        // Optional Google Tag event if gtag is active
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", event, {
            event_category: "customer_support",
            event_label: pathname,
          });
        }
      } catch {
        // Analytics failure should never break UI
      }
    },
    [sessionId, pathname]
  );

  // Initialize session and teaser timer
  useEffect(() => {
    if (isAdmin) return;

    let sid = "";
    try {
      sid = localStorage.getItem("cicekana_chat_sid") || "";
      if (!sid) {
        sid = "sid_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
        localStorage.setItem("cicekana_chat_sid", sid);
      }
    } catch {
      sid = "sid_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
    }
    setSessionId(sid);

    // Initial greeting / restore conversation
    fetch("/api/chat/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        pageUrl: typeof window !== "undefined" ? window.location.href : pathname,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.conversation) {
          setConversationId(data.conversation.id);
          if (data.conversation.messages && data.conversation.messages.length > 0) {
            setMessages(data.conversation.messages);
            const last = data.conversation.messages[data.conversation.messages.length - 1];
            if (last?.isHandoverPrompt && !handoverDismissed) {
              setShowHandoverForm(true);
            } else {
              setShowHandoverForm(false);
            }
          } else {
            setMessages([
              {
                id: "welcome-init",
                senderType: "BOT",
                senderName: "Çiçekana Destek",
                content:
                  "Merhaba! Çiçekana Tech Media'ya hoş geldiniz. Ürünlerimiz, otomasyon paketlerimiz, web tasarımı, e-ticaret veya kurumsal çözümlerimiz hakkında sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?",
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        }
      })
      .catch((err) => {
        console.warn("[CustomerSupportChat] Init fallback:", err);
      });

    // Teaser appearance with 3.5s gentle delay on first visit
    const teaserDismissed = localStorage.getItem("cicekana_chat_teaser_dismissed");
    if (!teaserDismissed) {
      const timer = setTimeout(() => {
        setShowTeaser(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, pathname]);

  // Global listener for opening chat from CTA buttons across the website
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      setShowTeaser(false);
      const customMsg = e?.detail?.message;
      if (customMsg) {
        setInputValue(customMsg);
        setTimeout(() => inputRef.current?.focus(), 250);
      }
    };
    window.addEventListener("cicekana:open-chat", handleOpenChat);
    return () => window.removeEventListener("cicekana:open-chat", handleOpenChat);
  }, []);

  // Live polling: Check for new agent replies every 6s when chat is open
  useEffect(() => {
    if (!isOpen || !conversationId || !sessionId) return;

    const interval = setInterval(() => {
      const lastMsg = messages[messages.length - 1];
      const after = lastMsg ? new Date(lastMsg.createdAt).toISOString() : undefined;

      fetch("/api/chat/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          sessionId,
          after,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const fresh = data.messages.filter((m: ChatMessageItem) => !existingIds.has(m.id));
              if (fresh.length === 0) return prev;
              return [...prev, ...fresh];
            });
          }
        })
        .catch(() => {});
    }, 6000);

    return () => clearInterval(interval);
  }, [isOpen, conversationId, sessionId, messages]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, showHandoverForm, handoverSuccess]);

  // Focus input and track widget open
  useEffect(() => {
    if (isOpen) {
      setShowTeaser(false);
      trackChatEvent("chat_widget_opened");
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, trackChatEvent]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (isAdmin) {
    return null;
  }

  // Page-context aware quick prompts (advisory suggestions that also offer general topics)
  const getContextPrompts = (): string[] => {
    if (pathname?.includes("call-center")) {
      return [
        "Call Center AI özellikleri neler?",
        "Santral kurulumu nasıl yapılır?",
        "Web tasarımı da yapıyor musunuz?",
        "Yetkiliyle görüşmek istiyorum",
      ];
    }
    if (pathname?.includes("midvem")) {
      return [
        "Midvem paket fiyatları neler?",
        "Shopify siparişlerini görebilir miyim?",
        "Küçük esnafa uygun paket var mı?",
        "Diğer hizmetleriniz neler?",
      ];
    }
    if (pathname?.includes("ai-automation")) {
      return [
        "Yapay zekâ paketleri ve fiyatlar",
        "Küçük işletmeye uygun çözüm var mı?",
        "Web sitesi ve e-ticaret çözümleri",
        "Müşteri temsilcisine bağlan",
      ];
    }
    if (pathname?.includes("e-ticaret")) {
      return [
        "ikas e-ticaret altyapısı nedir?",
        "Shopify ve sepet kurtarma desteği",
        "E-ticaret paket fiyatları",
        "Yetkiliyle görüşmek istiyorum",
      ];
    }
    if (pathname?.includes("magaza")) {
      return [
        "Baskı ürünlerinde kargo ve teslimat",
        "Toplu siparişlerde özel indirim",
        "E-ticaret çözümleriniz neler?",
        "Yetkiliyle görüşmek istiyorum",
      ];
    }
    return [
      "Sunduğunuz hizmetler neler?",
      "Midvem ve AI paket fiyatları",
      "Web sitesi tasarımı yapıyor musunuz?",
      "Yetkiliyle görüşmek istiyorum",
    ];
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading || !conversationId) return;

    setErrorMsg(null);
    setInputValue("");
    setIsLoading(true);

    if (!hasTrackedFirstMessage.current) {
      trackChatEvent("chat_first_message", { length: text.length });
      hasTrackedFirstMessage.current = true;
    }

    const tempUserMsg: ChatMessageItem = {
      id: "temp-" + Date.now(),
      senderType: "VISITOR",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          sessionId,
          message: text,
          pageUrl: window.location.href,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Mesaj iletilemedi. Lütfen tekrar deneyiniz.");
      }

      const botMsg: ChatMessageItem = {
        id: data.botMessageId,
        senderType: "BOT",
        senderName: "Çiçekana Destek",
        content: data.reply,
        isHandoverPrompt: data.isHandoverPrompt,
        suggestedProducts: data.suggestedProducts,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.isHandoverPrompt) {
        setShowHandoverForm(true);
        setHandoverDismissed(false);
      } else {
        setShowHandoverForm(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverPhone.trim() || handoverSubmitting || !conversationId) return;

    if (!kvkkConsent) {
      setHandoverError("Lütfen iletişim izni onay kutusunu işaretleyiniz.");
      return;
    }

    setHandoverSubmitting(true);
    setHandoverError(null);

    try {
      const res = await fetch("/api/chat/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          sessionId,
          phone: handoverPhone,
          name: handoverName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kayıt oluşturulamadı.");
      }

      trackChatEvent("chat_lead_submitted");
      setHandoverSuccess(data.message);
      setShowHandoverForm(false);
      setMessages((prev) => [
        ...prev,
        {
          id: "sys-" + Date.now(),
          senderType: "SYSTEM",
          senderName: "Sistem",
          content: `İletişim talebiniz (${handoverPhone}) başarıyla yetkili ekibimize iletildi.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setHandoverError(err.message || "Talebiniz iletilirken bir hata oluştu.");
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const handleDismissTeaser = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTeaser(false);
    try {
      localStorage.setItem("cicekana_chat_teaser_dismissed", "true");
    } catch {}
  };

  return (
    <>
      {/* Floating Launcher and Teaser Bubble */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden flex flex-col items-end gap-3">
        {/* Soft Invitation Teaser Bubble */}
        {!isOpen && showTeaser && (
          <div
            onClick={() => setIsOpen(true)}
            className="cursor-pointer max-w-[320px] bg-white border border-corp-border/80 shadow-xl rounded-2xl p-4 text-xs text-corp-charcoal animate-in fade-in slide-in-from-bottom-2 duration-300 relative group hover:border-corp-teal transition-all"
          >
            <button
              onClick={handleDismissTeaser}
              aria-label="Daveti Kapat"
              className="absolute -top-2 -right-2 w-5 h-5 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-corp-gray hover:text-corp-charcoal transition-colors shadow-xs"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-corp-charcoal text-xs mb-1">
                  Yardımcı Olabiliriz
                </p>
                <p className="text-[11px] text-corp-gray leading-relaxed">
                  Size doğru ürünü veya hizmeti bulmanızda yardımcı olabiliriz. Paketler, fiyatlar ve özellikler hakkında sorularınızı yanıtlayabiliriz.
                </p>
                <div className="mt-2 text-corp-teal font-semibold text-[11px] flex items-center gap-1 group-hover:underline">
                  Sohbeti Başlat <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Launcher Button */}
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Müşteri Hizmetleri Canlı Desteği Aç"
            className="flex items-center gap-2.5 px-4 py-3 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-corp-teal focus:ring-offset-2"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <span className="text-xs sm:text-sm font-semibold tracking-wide font-display hidden sm:inline">
              Müşteri Hizmetleri
            </span>
          </button>
        ) : null}
      </div>

      {/* Main Chat Window */}
      {isOpen ? (
        <div
          role="dialog"
          aria-labelledby="chat-title"
          className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-[100dvh] sm:h-[620px] max-h-[100dvh] sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col border border-corp-border/80 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-corp-charcoal text-white border-b border-corp-border/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-white p-1 shadow-xs border border-corp-border/30 flex items-center justify-center flex-shrink-0">
                <Logo width={26} height={26} className="object-contain" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-corp-charcoal rounded-full" />
              </div>
              <div className="flex items-center">
                <h3
                  id="chat-title"
                  className="font-display text-sm font-semibold tracking-wide text-white leading-tight"
                >
                  Çiçekana Müşteri Hizmetleri
                </h3>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Sohbeti Kapat"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {messages.map((m) => {
              const isVisitor = m.senderType === "VISITOR";
              const isSystem = m.senderType === "SYSTEM";

              if (isSystem) {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-corp-gray bg-white border border-corp-border rounded-full shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {m.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isVisitor
                        ? "bg-corp-teal text-white rounded-br-xs font-normal"
                        : "bg-white text-corp-charcoal border border-corp-border/80 rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>

                  {/* Structured Product Suggestions (CRO) */}
                  {m.suggestedProducts && m.suggestedProducts.length > 0 && (
                    <div className="mt-2 space-y-2 w-full max-w-[90%]">
                      {m.suggestedProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white border border-corp-border rounded-xl p-3 shadow-xs hover:border-corp-teal transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-display text-xs font-bold text-corp-charcoal">
                                {prod.name}
                              </h4>
                              {prod.description && (
                                <p className="text-[11px] text-corp-gray line-clamp-1 mt-0.5">
                                  {prod.description}
                                </p>
                              )}
                              <span className="inline-block mt-1 text-xs font-semibold text-corp-teal">
                                {prod.price}
                              </span>
                            </div>
                            <a
                              href={prod.url}
                              onClick={() =>
                                trackChatEvent("chat_product_link_clicked", {
                                  productName: prod.name,
                                  url: prod.url,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-corp-teal hover:underline flex-shrink-0 bg-corp-teal/10 px-2.5 py-1 rounded-lg"
                            >
                              İncele
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-corp-gray-light mt-1 px-1">
                    {m.senderType === "AGENT"
                      ? `Müşteri Temsilcisi (${m.senderName || "Admin"})`
                      : isVisitor
                      ? "Siz"
                      : "Destek Asistanı"}
                  </span>
                </div>
              );
            })}

            {/* Handover Form Card with Explicit KVKK Consent */}
            {showHandoverForm && !handoverSuccess && !handoverDismissed && (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-sm my-2 text-xs text-corp-charcoal relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowHandoverForm(false);
                    setHandoverDismissed(true);
                  }}
                  aria-label="İletişim Formunu Kapat"
                  className="absolute top-3 right-3 p-1 text-amber-800/60 hover:text-amber-950 rounded-lg hover:bg-amber-100/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 font-display font-semibold text-xs text-amber-900 mb-1.5 pr-6">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                  Yetkili Ekibimiz Size Ulaşsın
                </div>
                <p className="text-[11px] text-corp-gray mb-3 leading-relaxed">
                  Sorunuzu doğrudan uzman ekibimize iletmemiz için telefon numaranızı bırakabilirsiniz:
                </p>

                <form onSubmit={handleHandoverSubmit} className="space-y-2.5">
                  <div>
                    <input
                      type="tel"
                      value={handoverPhone}
                      onChange={(e) => setHandoverPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      required
                      className="w-full text-xs bg-white border border-amber-300 rounded-xl px-3 py-2 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={handoverName}
                      onChange={(e) => setHandoverName(e.target.value)}
                      placeholder="Adınız ve Soyadınız (İsteğe bağlı)"
                      className="w-full text-xs bg-white border border-amber-200 rounded-xl px-3 py-2 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
                    />
                  </div>

                  {/* Explicit KVKK Privacy Disclosure */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="kvkkCheck"
                      checked={kvkkConsent}
                      onChange={(e) => setKvkkConsent(e.target.checked)}
                      className="w-3.5 h-3.5 mt-0.5 text-corp-teal rounded-sm"
                    />
                    <label htmlFor="kvkkCheck" className="text-[10px] text-corp-gray leading-tight cursor-pointer">
                      İletişim bilgilerimin bu talep kapsamında müşteri temsilcisi tarafından tarafıma ulaşılması amacıyla işlenmesini onaylıyorum.
                    </label>
                  </div>

                  {handoverError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {handoverError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-corp-gray flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Güvenli Kayıt
                    </span>
                    <button
                      type="submit"
                      disabled={handoverSubmitting || !handoverPhone.trim()}
                      className="px-3.5 py-1.5 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {handoverSubmitting ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> İletiliyor...
                        </span>
                      ) : (
                        "Talebi İlet"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Handover Success Card */}
            {handoverSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 my-2 shadow-xs flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">Talebiniz Kaydedildi</p>
                  <p className="text-emerald-700 mt-0.5">{handoverSuccess}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white border border-corp-border/80 rounded-2xl rounded-bl-xs px-4 py-3 text-xs text-corp-gray shadow-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-corp-teal rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-corp-teal rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-corp-teal rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-corp-gray-light ml-1">Yanıt hazırlanıyor...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Context-Aware Quick Prompts */}
          {messages.length <= 3 && (
            <div className="px-3 py-2 bg-slate-100/60 border-t border-corp-border/40 overflow-x-auto flex gap-1.5 no-scrollbar flex-shrink-0">
              {getContextPrompts().map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-slate-50 border border-corp-border rounded-full text-[11px] text-corp-charcoal font-medium shadow-2xs transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Area */}
          <div className="p-3 bg-white border-t border-corp-border flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Bir soru yazın..."
                maxLength={600}
                disabled={isLoading}
                className="flex-1 text-xs sm:text-sm bg-slate-50 border border-corp-border rounded-xl px-3.5 py-2.5 text-corp-charcoal placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-corp-teal/30 focus:border-corp-teal"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Mesaj Gönder"
                className="p-2.5 bg-corp-teal hover:bg-corp-teal-dark disabled:bg-slate-200 text-white rounded-xl shadow-xs transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-corp-teal"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-corp-gray-light">
              <span>Çiçekana Tech Media Müşteri Destek</span>
              <span>{inputValue.length}/600</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
