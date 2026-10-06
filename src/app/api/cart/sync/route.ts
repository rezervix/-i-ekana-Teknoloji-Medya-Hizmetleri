import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = (token?.sub as string) || (token?.id as string) || null;

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (userId) {
      // Synchronize/upsert items into database cart for logged-in user
      for (const item of items) {
        if (!item.productId) continue;

        try {
          // Check if same item already exists in user's cart
          const existing = await prisma.cartItem.findFirst({
            where: {
              userId,
              productId: item.productId,
            },
          });

          if (existing) {
            await prisma.cartItem.update({
              where: { id: existing.id },
              data: {
                quantity: existing.quantity + (item.quantity || 1),
                price: item.price || existing.price,
                customizationData: item.customizationData || existing.customizationData,
              },
            });
          } else {
            await prisma.cartItem.create({
              data: {
                userId,
                productId: item.productId,
                quantity: item.quantity || 1,
                price: item.price || 0,
                customizationData: item.customizationData || null,
              },
            });
          }
        } catch (dbErr) {
          // Ignore individual row error to prevent entire sync failure
          console.error("Cart sync item error:", dbErr);
        }
      }
    }

    return NextResponse.json({ success: true, synced: items.length });
  } catch (error: any) {
    console.error("Error in cart sync route:", error);
    return NextResponse.json(
      { error: "Cart sync failed", message: error.message },
      { status: 500 }
    );
  }
}
