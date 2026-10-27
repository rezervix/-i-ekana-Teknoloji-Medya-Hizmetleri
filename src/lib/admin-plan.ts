import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { PLAN_ICON_NAMES } from "@/lib/plan-icons";

export const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

const icon = z.enum(PLAN_ICON_NAMES).optional().default("Sparkles");
const text = (max: number) => z.string().trim().max(max);
const nullableText = (max: number) => z.preprocess((value) => value ?? "", text(max));
const url = z.preprocess((value) => value ?? "", z.string().trim().refine((value) => !value || /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value), "Yalnızca güvenli bağlantılar kullanılabilir").default(""));
const stringList = (maxItems: number, maxLength: number) => z.array(text(maxLength)).max(maxItems).default([]);

const stats = z.array(z.object({ value: text(80), label: text(80) })).max(4).default([]);
const benefits = z.array(z.object({
  icon,
  title: text(80),
  description: text(160), // 1 cümle kuralı
  order: z.number().int().default(0),
})).max(6).default([]);

const highlights = z.array(z.object({
  icon,
  title: text(80),
  description: text(300),
  badge: text(80).optional().default(""),
})).max(8).default([]);

const steps = z.array(z.object({
  icon: icon.optional(),
  title: text(80),
  description: text(300),
  order: z.number().int().default(0),
})).max(4).default([]);

const demoScreenshots = z.array(z.object({
  url: z.string().trim(),
  caption: text(160).optional().default(""),
  alt: text(120).optional().default(""),
  order: z.number().int().default(0),
})).max(6).default([]);

const trustBlocks = z.array(z.object({
  key: z.string().trim(),
  title: text(100),
  text: text(300),
  icon: z.string().default("ShieldCheck"),
  isEnabled: z.boolean().default(true),
})).default([]);

const comparisonFeatureKeys = z.array(z.object({
  key: z.string().trim(),
  label: text(100),
  order: z.number().int().default(0),
})).default([]);

const faqs = z.array(z.object({
  question: text(120),
  answer: text(1000),
  order: z.number().int().default(0),
})).max(15).default([]);

export const planSchema = z.object({
  name: z.string().trim().min(1, "Hizmet adı zorunludur").max(120),
  slug: z.string().trim().min(1, "Slug zorunludur").max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  shortDescription: z.string().trim().min(1, "Açıklama zorunludur").max(300),
  cardSummary: nullableText(120), // Liste kartı için kısa özet (max 120)
  category: nullableText(80),
  isListed: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  priceMonthly: z.coerce.number().int().nonnegative().default(0),
  fullContentHtml: z.string().default(""),
  features: z.unknown().optional().default([]),
  imageUrl: z.preprocess((value) => value ?? "", z.string().trim().url("Geçerli bir logo URL'si girin").or(z.literal(""))),

  // Hero Bölümü
  tagline: nullableText(120),
  heroHeadline: nullableText(70), // Sonuç odaklı ana başlık (max 70)
  heroSubheadline: nullableText(160), // Alt metin (max 160)
  primaryCtaLabel: nullableText(60).default("Paketleri İncele"),
  primaryCtaUrl: url.default("#paketler"),
  secondaryCtaLabel: nullableText(60),
  secondaryCtaUrl: url,
  heroMockupUrl: z.preprocess((value) => value ?? "", z.string().trim().url("Geçerli bir hero görsel URL'si girin").or(z.literal(""))),
  heroImageAlt: nullableText(120),
  showStartingPrice: z.boolean().default(true),

  // Bölümler
  trustPoints: stringList(5, 120),
  stats,
  benefits,
  highlights,
  steps,
  demoScreenshots,
  trustBlocks,
  comparisonFeatureKeys,
  faqs,

  // Demo & WhatsApp
  whatsappNumber: nullableText(30).default("+90 530 341 21 56"),
  whatsappTemplate: nullableText(300).default("Merhaba, {ürün} hakkında bilgi ve canlı demo almak istiyorum."),
  isDemoFormActive: z.boolean().default(false),

  // SEO & Görünürlük
  metaTitle: nullableText(100),
  metaDescription: nullableText(200),
  ogImageUrl: z.preprocess((value) => value ?? "", z.string().trim().url("Geçerli bir paylaşım görseli URL'si girin").or(z.literal(""))),
  sectionVisibility: z.object({
    hero: z.boolean().default(true),
    benefits: z.boolean().default(true),
    steps: z.boolean().default(true),
    demoScreenshots: z.boolean().default(true),
    pricing: z.boolean().default(true),
    trustBlocks: z.boolean().default(true),
    faqs: z.boolean().default(true),
    whatsappCta: z.boolean().default(true),
  }).default({
    hero: true,
    benefits: true,
    steps: true,
    demoScreenshots: true,
    pricing: true,
    trustBlocks: true,
    faqs: true,
    whatsappCta: true,
  }),

  vatNote: nullableText(160),
  disclaimer: nullableText(800),
});

export async function requireAdmin() {
  const session = await auth();
  return session?.user && roles.has(String((session.user as { role?: string }).role)) ? session : null;
}

export function sanitizePlanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a", "img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "blockquote", "code", "pre", "span", "div"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], "*": ["class"] },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard"
  });
}

export function normalizeTiers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((tier, index) => ({
    id: typeof tier?.id === "string" ? tier.id : undefined,
    name: String(tier?.name ?? "").trim(),
    description: String(tier?.description ?? "").trim().slice(0, 300) || null,
    priceMonthly: Math.round(Number(tier?.priceMonthly) * 100),
    badge: String(tier?.badge ?? "").trim() || null,
    isRecommended: Boolean(tier?.isRecommended),
    vatNote: String(tier?.vatNote ?? "").trim() || null,
    renewalNote: String(tier?.renewalNote ?? "").trim() || null,
    buttonText: String(tier?.buttonText ?? "").trim() || null,
    displayOrder: Number.isInteger(Number(tier?.displayOrder)) ? Number(tier.displayOrder) : index,
    isActive: tier?.isActive !== false,
    features: Array.isArray(tier?.features)
      ? tier.features.map(String).map((item: string) => item.trim()).filter(Boolean)
      : [],
    comparisonFeatures: Array.isArray(tier?.comparisonFeatures)
      ? tier.comparisonFeatures
      : [],
  })).filter((tier) => tier.name && tier.priceMonthly > 0);
}

