import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { PLAN_ICON_NAMES } from "@/lib/plan-icons";

export const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);
const icon = z.enum(PLAN_ICON_NAMES).optional().default("Sparkles");
const text = (max: number) => z.string().trim().max(max);
const url = z.string().trim().refine((value) => !value || /^(https?:\/\/|mailto:|tel:|\/)/i.test(value), "Yalnızca güvenli bağlantılar kullanılabilir").default("");
const stringList = (maxItems: number, maxLength: number) => z.array(text(maxLength)).max(maxItems).default([]);
const stats = z.array(z.object({ value: text(80), label: text(80) })).max(4).default([]);
const benefits = z.array(z.object({ icon, title: text(80), description: text(300) })).max(6).default([]);
const highlights = z.array(z.object({ icon, title: text(80), description: text(300), badge: text(80).optional().default("") })).max(8).default([]);
const steps = z.array(z.object({ title: text(80), description: text(300) })).max(5).default([]);
const faqs = z.array(z.object({ question: text(80), answer: text(800) })).max(10).default([]);

export const planSchema = z.object({
  name: z.string().trim().min(1, "Ürün adı zorunludur").max(120),
  slug: z.string().trim().min(1, "Slug zorunludur").max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  shortDescription: z.string().trim().min(1, "Kısa açıklama zorunludur").max(200),
  priceMonthly: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(false),
  fullContentHtml: z.string().default(""),
  features: z.unknown().optional().default([]),
  imageUrl: z.string().trim().url("Geçerli bir görsel URL'si girin").or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
  tagline: text(120).optional().default(""),
  heroHeadline: text(80).optional().default(""),
  heroSubheadline: text(300).optional().default(""),
  heroMockupUrl: z.string().trim().url("Geçerli bir ekran görüntüsü URL'si girin").or(z.literal("")).default(""),
  trustPoints: stringList(5, 120), stats, benefits, highlights, steps, faqs,
  vatNote: text(160).optional().default(""),
  disclaimer: text(800).optional().default(""),
  secondaryCtaLabel: text(80).optional().default(""),
  secondaryCtaUrl: url,
});

export async function requireAdmin() {
  const session = await auth();
  return session?.user && roles.has(String((session.user as { role?: string }).role)) ? session : null;
}

export function sanitizePlanHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a", "img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "blockquote", "code", "pre", "span", "div"], allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], "*": ["class"] }, allowedSchemes: ["http", "https", "mailto"], disallowedTagsMode: "discard" });
}
