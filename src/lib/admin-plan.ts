import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { PLAN_ICON_NAMES } from "@/lib/plan-icons";

export const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

import { formatPlanZodError, parseGenericPlanError, type FormErrorDetail } from "@/lib/plan-validation-helper";

export { formatPlanZodError, parseGenericPlanError, type FormErrorDetail };

const icon = z.enum(PLAN_ICON_NAMES).optional().default("Sparkles");
const text = (max: number, label?: string) =>
  z.string()
    .trim()
    .max(max, `${label || 'Bu alan'} en fazla ${max} karakter olabilir`);

const nullableText = (max: number, label?: string) =>
  z.preprocess((value) => value ?? "", text(max, label));

const url = z.preprocess(
  (value) => value ?? "",
  z.string().trim().refine(
    (value) => !value || /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value),
    "Yalnızca geçerli ve güvenli bağlantılar kullanılabilir (http, https, /, #)"
  ).default("")
);

const stringList = (maxItems: number, maxLength: number, label?: string) =>
  z.array(text(maxLength, label)).max(maxItems, `${label || 'Liste'} en fazla ${maxItems} madde içerebilir`).default([]);

const stats = z.array(z.object({
  value: text(80, "İstatistik değeri"),
  label: text(80, "İstatistik etiketi"),
})).max(4, "En fazla 4 adet istatistik eklenebilir").default([]);

const benefits = z.array(z.object({
  icon,
  title: text(80, "Fayda kartı başlığı"),
  description: text(160, "Fayda kartı açıklaması"), // 1 cümle kuralı
  order: z.number().int().default(0),
})).max(6, "En fazla 6 adet fayda kartı eklenebilir").default([]);

const highlights = z.array(z.object({
  icon,
  title: text(80, "Özellik başlığı"),
  description: text(300, "Özellik açıklaması"),
  badge: text(80, "Özellik rozeti").optional().default(""),
})).max(8, "En fazla 8 adet öne çıkan özellik eklenebilir").default([]);

const steps = z.array(z.object({
  icon: icon.optional(),
  title: text(80, "Adım başlığı"),
  description: text(300, "Adım açıklaması"),
  order: z.number().int().default(0),
})).max(4, "En fazla 4 adet nasıl çalışır adımı eklenebilir").default([]);

const demoScreenshots = z.array(z.object({
  url: z.string().trim(),
  caption: text(160, "Ekran görüntüsü başlığı").optional().default(""),
  alt: text(120, "Ekran görüntüsü görsel açıklaması (alt)").optional().default(""),
  order: z.number().int().default(0),
})).max(6, "En fazla 6 adet ekran görüntüsü eklenebilir").default([]);

const trustBlocks = z.array(z.object({
  key: z.string().trim(),
  title: text(100, "Güven bloğu başlığı"),
  text: text(300, "Güven bloğu açıklaması"),
  icon: z.string().default("ShieldCheck"),
  isEnabled: z.boolean().default(true),
})).default([]);

const comparisonFeatureKeys = z.array(z.object({
  key: z.string().trim(),
  label: text(100, "Karşılaştırma özelliği başlığı"),
  order: z.number().int().default(0),
})).default([]);

const faqs = z.array(z.object({
  question: text(140, "SSS sorusu"),
  answer: text(1000, "SSS cevabı"),
  order: z.number().int().default(0),
})).max(15, "En fazla 15 adet SSS eklenebilir").default([]);

export const planSchema = z.object({
  name: z.string().trim().min(1, "Hizmet adı zorunludur").max(120, "Hizmet adı en fazla 120 karakter olabilir"),
  slug: z.string().trim().min(1, "Slug zorunludur").max(140, "Slug en fazla 140 karakter olabilir").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  shortDescription: z.string().trim().min(1, "Açıklama zorunludur").max(300, "Açıklama en fazla 300 karakter olabilir"),
  cardSummary: nullableText(200, "Liste kartı kısa özeti"), // Liste kartı için kısa özet (max 200 karakter)
  category: nullableText(80, "Kategori"),
  isListed: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  displayOrder: z.coerce.number().int().min(0, "Sıralama 0 veya pozitif bir tamsayı olmalıdır").default(0),
  isActive: z.boolean().default(true),
  priceMonthly: z.coerce.number().int().nonnegative("Aylık fiyat 0 veya daha büyük olmalıdır").default(0),
  fullContentHtml: z.string().default(""),
  features: z.unknown().optional().default([]),
  imageUrl: z.preprocess((value) => value ?? "", z.string().trim().url("Geçerli bir logo URL'si girin").or(z.literal(""))),

  // Hero Bölümü
  tagline: nullableText(120, "Hero üst rozet / slogan"),
  heroHeadline: nullableText(120, "Hero ana başlık"), // Sonuç odaklı ana başlık (max 120)
  heroSubheadline: nullableText(250, "Hero alt metin"), // Alt metin (max 250)
  primaryCtaLabel: nullableText(60, "Birincil buton metni").default("Paketleri İncele"),
  primaryCtaUrl: url.default("#paketler"),
  secondaryCtaLabel: nullableText(60, "İkincil buton metni"),
  secondaryCtaUrl: url,
  heroMockupUrl: z.preprocess((value) => value ?? "", z.string().trim().url("Geçerli bir hero görsel URL'si girin").or(z.literal(""))),
  heroImageAlt: nullableText(120, "Hero görsel açıklaması"),
  showStartingPrice: z.boolean().default(true),

  // Bölümler
  trustPoints: stringList(5, 120, "Güven maddesi"),
  stats,
  benefits,
  highlights,
  steps,
  demoScreenshots,
  trustBlocks,
  comparisonFeatureKeys,
  faqs,

  // Demo & WhatsApp
  whatsappNumber: nullableText(30, "WhatsApp numarası").default("+90 530 341 21 56"),
  whatsappTemplate: nullableText(300, "WhatsApp mesaj şablonu").default("Merhaba, {ürün} hakkında bilgi almak istiyorum."),
  isDemoFormActive: z.boolean().default(false),

  // SEO & Görünürlük
  metaTitle: nullableText(100, "SEO başlığı (Meta Title)"),
  metaDescription: nullableText(200, "SEO açıklaması (Meta Description)"),
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

  vatNote: nullableText(160, "KDV bilgi notu"),
  disclaimer: nullableText(800, "Yasal uyarı ve şartlar"),
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
