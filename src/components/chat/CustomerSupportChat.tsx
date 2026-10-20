"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  X,
  Send,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ChatMessageItem {
  id: string;
  senderType: "VISITOR" | "BOT" | "AGENT" | "SYSTEM";
  senderName?: string;
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

const QUICK_PROMPTS = [
  "Midvem WhatsApp desteği var mı?",
  "Sosyal medya ve reklam danışmanlığı paketleriniz neler?",
  "Baskı ürünlerinde kargo ücretsiz mi?",
  "Bir müşteri temsilcisiyle görüşmek istiyorum",
];

export default function CustomerSupportChat() {
  const pathname = usePathname();

  // Do not display the customer chat inside admin pages
  const isAdmin = pathname?.startsWith("/admin");

  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handover form state
  const [showHandoverForm, setShowHandoverForm] = useState(false);
  const [handoverPhone, setHandoverPhone] = useState("");
  const [handoverName, setHandoverName] = useState("");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);
  const [handoverError, setHandoverError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or restore session
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

    // Init chat session with server
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
            // Check if last message was a handover prompt
            const last = data.conversation.messages[data.conversation.messages.length - 1];
            if (last?.isHandoverPrompt) {
              setShowHandoverForm(true);
            }
          } else {
            // Initial friendly greeting
            setMessages([
              {
                id: "welcome-init",
                senderType: "BOT",
                senderName: "Çiçekana Destek",
                content:
                  "Merhaba! Size nasıl yardımcı olabiliriz? Ürünlerimiz, paketlerimiz ve fiyatlarımız hakkında sorularınızı yanıtlayabiliriz.",
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        }
      })
      .catch((err) => {
        console.warn("[CustomerSupportChat] Init error:", err);
      });
  }, [isAdmin, pathname]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, showHandoverForm, handoverSuccess]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  if (isAdmin) {
    return null;
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading || !conversationId) return;

    setErrorMsg(null);
    setInputValue("");
    setIsLoading(true);

    // Optimistically add visitor message
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

      // Add bot reply
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
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverPhone.trim() || handoverSubmitting || !conversationId) return;

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

      setHandoverSuccess(data.message);
      setShowHandoverForm(false);
      // Append system message locally
      setMessages((prev) => [
        ...prev,
        {
          id: "sys-" + Date.now(),
          senderType: "SYSTEM",
          senderName: "Sistem",
          content: `İletişim talebiniz (${handoverPhone}) başarıyla ekibimize iletildi.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setHandoverError(err.message || "Talebiniz iletilirken bir hata oluştu.");
    } finally {
      setHandoverSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Müşteri Hizmetleri Sohbetini Aç"
            className="flex items-center gap-2.5 px-4 py-3 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-corp-teal focus:ring-offset-2"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <span className="text-sm font-semibold tracking-wide font-display hidden sm:inline">
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
              <div className="relative w-9 h-9 rounded-full bg-corp-teal/20 border border-corp-teal/40 flex items-center justify-center">
                <span className="font-display font-bold text-corp-teal text-sm">Ç</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-corp-charcoal rounded-full" />
              </div>
              <div>
                <h3
                  id="chat-title"
                  className="font-display text-sm font-semibold tracking-wide text-white"
                >
                  Çiçekana Müşteri Hizmetleri
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Çevrimiçi Destek Ekibi</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Sohbeti Kapat"
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                      isVisitor
                        ? "bg-corp-teal text-white rounded-br-xs font-normal"
                        : "bg-white text-corp-charcoal border border-corp-border/80 rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>

                  {/* Suggested Products Card */}
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
                      ? "Temsilci"
                      : isVisitor
                      ? "Siz"
                      : "Destek Asistanı"}
                  </span>
                </div>
              );
            })}

            {/* Handover Form Card */}
            {showHandoverForm && !handoverSuccess && (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-sm my-2 text-sm text-corp-charcoal">
                <div className="flex items-center gap-2 font-display font-semibold text-xs text-amber-900 mb-1.5">
                  <Phone className="w-4 h-4 text-amber-600" />
                  Yetkili Ekibimiz Size Ulaşsın
                </div>
                <p className="text-xs text-corp-gray mb-3 leading-relaxed">
                  Konuyu detaylı inceleyebilmemiz ve sizi doğrudan doğru bilgiyle arayabilmemiz için iletişim numaranızı bırakabilirsiniz:
                </p>

                <form onSubmit={handleHandoverSubmit} className="space-y-2.5">
                  <div className="relative">
                    <input
                      type="tel"
                      value={handoverPhone}
                      onChange={(e) => setHandoverPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      required
                      className="w-full text-xs bg-white border border-amber-300 rounded-xl px-3 py-2 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={handoverName}
                      onChange={(e) => setHandoverName(e.target.value)}
                      placeholder="Adınız ve Soyadınız (İsteğe bağlı)"
                      className="w-full text-xs bg-white border border-amber-200 rounded-xl px-3 py-2 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
                    />
                  </div>

                  {handoverError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {handoverError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-corp-gray">
                      🔒 Bilgileriniz güvenle saklanır
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
                  <p className="font-semibold text-emerald-800">Talebiniz Alındı</p>
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

          {/* Quick Prompts (visible if conversation is young) */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-100/60 border-t border-corp-border/40 overflow-x-auto flex gap-1.5 no-scrollbar flex-shrink-0">
              {QUICK_PROMPTS.map((prompt, idx) => (
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
                className="flex-1 text-sm bg-slate-50 border border-corp-border rounded-xl px-3.5 py-2.5 text-corp-charcoal placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-corp-teal/30 focus:border-corp-teal"
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
