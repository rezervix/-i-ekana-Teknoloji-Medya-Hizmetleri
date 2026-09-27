import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { rating, guestName, text } = await req.json();

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json(
        { error: "Lütfen 1 ile 5 arasında geçerli bir puan seçin." },
        { status: 400 }
      );
    }

    if (!guestName || !guestName.trim()) {
      return NextResponse.json(
        { error: "Lütfen isminizi girin." },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Lütfen yorum metninizi yazın." },
        { status: 400 }
      );
    }

    // Find the product by its slug
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
    });

    if (!product) {
      return NextResponse.json(
        { error: "İlgili ürün bulunamadı." },
        { status: 404 }
      );
    }

    // Check if user is logged in to store their userId
    const session = await auth();
    const userId = session?.user?.id || null;

    // Create the review, default isApproved is false
    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId,
        guestName: guestName.trim(),
        rating: Number(rating),
        text: text.trim(),
        isApproved: false,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error("[Reviews POST Error]", error);
    return NextResponse.json(
      { error: "Yorum kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
