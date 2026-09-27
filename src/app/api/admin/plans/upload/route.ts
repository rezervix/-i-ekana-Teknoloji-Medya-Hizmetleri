import { put } from "@vercel/blob";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const roles = new Set(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !roles.has(String((session.user as { role?: string }).role))) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Görsel seçilmedi" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Görsel en fazla 5 MB olabilir" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();
    const formats = {
      jpeg: { mime: "image/jpeg", extension: "jpg" },
      png: { mime: "image/png", extension: "png" },
      webp: { mime: "image/webp", extension: "webp" },
      gif: { mime: "image/gif", extension: "gif" },
    } as const;
    const detected = metadata.format ? formats[metadata.format as keyof typeof formats] : undefined;
    if (!detected) return NextResponse.json({ error: "Yalnızca geçerli JPEG, PNG, WebP veya GIF dosyaları yüklenebilir" }, { status: 400 });

    const blob = await put(`plans/${crypto.randomUUID()}.${detected.extension}`, new File([buffer], `plan.${detected.extension}`, { type: detected.mime }), { access: "public", addRandomSuffix: false });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[v0] Plan görseli yükleme hatası", error);
    return NextResponse.json({ error: "Görsel yüklenemedi" }, { status: 500 });
  }
}
