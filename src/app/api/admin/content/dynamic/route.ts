import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// Zod validation schemas
const dynamicContentItemSchema = z.object({
  key: z
    .string()
    .min(2, "Anahtar adı en az 2 karakter olmalıdır.")
    .max(100, "Anahtar adı en fazla 100 karakter olabilir.")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Anahtar adı sadece harf, rakam, alt tire, nokta ve tire içerebilir."
    ),
  content: z
    .string()
    .min(1, "İçerik boş olamaz.")
    .max(10000, "İçerik maksimum 10.000 karakter olabilir."),
  locale: z.string().min(2).max(10).default("tr"),
  description: z.string().max(500).optional().nullable(),
  group: z.string().min(2).max(50).default("product_configurator"),
});

const bulkUpdateSchema = z.object({
  items: z.array(
    z.object({
      key: z.string().min(2).max(100),
      content: z.string().min(1).max(10000),
      locale: z.string().min(2).max(10).optional().default("tr"),
      description: z.string().max(500).optional().nullable(),
      group: z.string().max(50).optional(),
    })
  ),
});

/**
 * Yetkilendirme kontrolü: Sadece ADMIN ve SUPER_ADMIN rolleri dinamik içerikleri yönetebilir.
 */
async function authorizeAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!session || !user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return null;
  }
  return user;
}

/**
 * GET: Admin için dinamik içerikleri listeler
 */
export async function GET(req: NextRequest) {
  const adminUser = await authorizeAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group");
    const q = searchParams.get("q");

    const where: any = {};
    if (group && group !== "all") {
      where.group = group;
    }
    if (q) {
      where.OR = [
        { key: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.dynamicContent.findMany({
      where,
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("[API:AdminDynamicContent:GET] Error:", error);
    return NextResponse.json(
      { error: "Dinamik içerikler getirilirken bir veritabanı hatası oluştu." },
      { status: 500 }
    );
  }
}

/**
 * POST: Tek bir dinamik içerik ekler veya günceller (Upsert)
 */
export async function POST(req: NextRequest) {
  const adminUser = await authorizeAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = dynamicContentItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Geçersiz form verisi.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { key, content, locale, description, group } = validation.data;
    const updatedBy = adminUser.email || adminUser.id || "admin";

    const updated = await prisma.dynamicContent.upsert({
      where: {
        key_locale: {
          key,
          locale,
        },
      },
      create: {
        key,
        content: content.trim(),
        locale,
        description: description?.trim() || null,
        group,
        updatedBy,
      },
      update: {
        content: content.trim(),
        description: description !== undefined ? description?.trim() || null : undefined,
        group: group || undefined,
        updatedBy,
      },
    });

    // Cache Invalidation
    try {
      revalidatePath("/magaza/urun/[slug]", "page");
      revalidatePath("/magaza");
      revalidatePath("/");
    } catch (e) {
      console.warn("[AdminDynamicContent] Revalidation warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: "İçerik başarıyla kaydedildi.",
      item: updated,
    });
  } catch (error) {
    console.error("[API:AdminDynamicContent:POST] Error:", error);
    return NextResponse.json(
      { error: "Dinamik içerik kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * PUT: Toplu (bulk) dinamik içerik güncelleme
 */
export async function PUT(req: NextRequest) {
  const adminUser = await authorizeAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Yetkisiz erişim. Yönetici yetkisi gereklidir." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { items } = validation.data;
    const updatedBy = adminUser.email || adminUser.id || "admin";

    // Toplu upsert işlemi
    const updatePromises = items.map((item) =>
      prisma.dynamicContent.upsert({
        where: {
          key_locale: {
            key: item.key,
            locale: item.locale || "tr",
          },
        },
        create: {
          key: item.key,
          content: item.content.trim(),
          locale: item.locale || "tr",
          description: item.description?.trim() || null,
          group: item.group || "product_configurator",
          updatedBy,
        },
        update: {
          content: item.content.trim(),
          description: item.description !== undefined ? item.description?.trim() || null : undefined,
          group: item.group || undefined,
          updatedBy,
        },
      })
    );

    await Promise.all(updatePromises);

    // Cache Invalidation
    try {
      revalidatePath("/magaza/urun/[slug]", "page");
      revalidatePath("/magaza");
      revalidatePath("/");
    } catch (e) {
      console.warn("[AdminDynamicContent] Revalidation warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: `${items.length} adet dinamik içerik başarıyla güncellendi.`,
    });
  } catch (error) {
    console.error("[API:AdminDynamicContent:PUT] Error:", error);
    return NextResponse.json(
      { error: "Toplu güncelleme sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Dinamik içerik silme
 */
export async function DELETE(req: NextRequest) {
  const adminUser = await authorizeAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const locale = searchParams.get("locale") || "tr";

    if (!key) {
      return NextResponse.json({ error: "Silinecek anahtar (key) parametresi zorunludur." }, { status: 400 });
    }

    await prisma.dynamicContent.delete({
      where: {
        key_locale: {
          key,
          locale,
        },
      },
    });

    try {
      revalidatePath("/magaza/urun/[slug]", "page");
      revalidatePath("/magaza");
    } catch (e) {
      console.warn("[AdminDynamicContent] Revalidation warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: `'${key}' anahtarlı içerik başarıyla silindi.`,
    });
  } catch (error) {
    console.error("[API:AdminDynamicContent:DELETE] Error:", error);
    return NextResponse.json(
      { error: "İçerik silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
