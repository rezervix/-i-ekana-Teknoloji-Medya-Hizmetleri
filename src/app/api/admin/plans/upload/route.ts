import { put } from "@vercel/blob";
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
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Yalnızca görsel dosyaları yüklenebilir" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Görsel en fazla 5 MB olabilir" }, { status: 400 });

  try {
    const blob = await put(`plans/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, file, { access: "public", addRandomSuffix: false });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[v0] Plan görseli yükleme hatası", error);
    return NextResponse.json({ error: "Görsel yüklenemedi" }, { status: 500 });
  }
}
