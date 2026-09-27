import { NextResponse } from "next/server";
import { generateAndPublishBlog } from "@/lib/gemini-blog";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz Erisim" }, { status: 401 });
  }

  try {
    const result = await generateAndPublishBlog();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
