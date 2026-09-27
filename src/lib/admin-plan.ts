import { z } from "zod";
import { auth } from "@/lib/auth";

export const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);
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
});

export async function requireAdmin() {
  const session = await auth();
  return session?.user && roles.has(String((session.user as { role?: string }).role)) ? session : null;
}

export async function sanitizePlanHtml(html: string) {
  return html
    .replace(/<(iframe|object|embed|script|style|base|link)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(iframe|object|embed|script|style|base|link)[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi, "");
}
