import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PaymentSuccessClient from "./PaymentSuccessClient";
import OrderTrackingSuccess from "@/components/analytics/OrderTrackingSuccess";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ödeme Başarılı — Çiçekana Teknoloji & Medya",
  description: "Siparişiniz başarıyla alındı ve işleme koyuldu.",
};

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string; merchant_oid?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const orderNumber = resolvedParams?.order || resolvedParams?.merchant_oid || "";

  const session = await auth();
  const isAuthenticated = Boolean(session && session.user);

  let orderData: any = null;

  if (orderNumber) {
    try {
      const dbOrder = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (dbOrder) {
        orderData = {
          orderNumber: dbOrder.orderNumber,
          finalAmount: dbOrder.finalAmount,
          status: dbOrder.status,
          createdAt: dbOrder.createdAt,
          guestName: dbOrder.guestName || session?.user?.name || null,
          guestEmail: dbOrder.guestEmail || session?.user?.email || null,
          shippingAddress: dbOrder.shippingAddress,
          items: dbOrder.items.map((it: any) => ({
            id: it.id,
            name: it.product?.name || "Ürün",
            quantity: it.quantity,
            price: it.price,
            image: it.product?.images?.[0] || undefined,
          })),
        };
      }
    } catch (err) {
      console.error("[PaymentSuccessPage] Order fetch error:", err);
    }
  }

  return (
    <main className="min-h-screen bg-corp-surface flex flex-col justify-between">
      <Header />
      {orderNumber && <OrderTrackingSuccess orderNumber={orderNumber} />}
      <div className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-3.5 sm:px-6 md:px-10 max-w-4xl mx-auto w-full">
        <PaymentSuccessClient
          orderNumber={orderNumber}
          order={orderData}
          isAuthenticated={isAuthenticated}
        />
      </div>
      <Footer />
    </main>
  );
}
