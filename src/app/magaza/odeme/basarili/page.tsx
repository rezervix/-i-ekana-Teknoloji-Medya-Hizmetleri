import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import PaymentSuccessClient from './PaymentSuccessClient';
import OrderTrackingSuccess from '@/components/analytics/OrderTrackingSuccess';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Ödeme Başarılı — Çiçekana Teknoloji & Medya',
  description: 'Siparişiniz başarıyla alındı ve işleme koyuldu.',
};

export const dynamic = 'force-dynamic';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string; merchant_oid?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const orderNumber = resolvedParams?.order || resolvedParams?.merchant_oid || '';

  const session = await auth();
  const isAuthenticated = Boolean(session && session.user);

  let orderData: any = null;
  let isPaymentVerified = false;

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
        if (dbOrder.paymentStatus === 'FAILED') {
          redirect(`/magaza/odeme/basarisiz?order=${encodeURIComponent(orderNumber)}`);
        }

        if (dbOrder.paymentStatus === 'COMPLETED') {
          isPaymentVerified = true;
        }

        orderData = {
          orderNumber: dbOrder.orderNumber,
          finalAmount: dbOrder.finalAmount,
          status: dbOrder.status,
          paymentStatus: dbOrder.paymentStatus,
          createdAt: dbOrder.createdAt,
          items: dbOrder.items.map((it: any) => ({
            id: it.id,
            name: it.product?.name || 'Ürün',
            quantity: it.quantity,
            price: it.unitPrice || it.price || 0,
            image: it.product?.images?.[0] || undefined,
          })),
        };
      }
    } catch (err) {
      console.error('[PaymentSuccessPage] Order fetch error:', err);
    }
  }

  return (
    <main className="min-h-screen bg-corp-surface flex flex-col justify-between">
      <Header />
      {/* Yalnızca ödemesi sunucu ve veritabanı tarafından doğrulanmış siparişlerde dönüşüm tetiklenir */}
      {isPaymentVerified && orderData && (
        <OrderTrackingSuccess
          orderNumber={orderNumber}
          finalAmount={orderData.finalAmount}
          items={orderData.items}
        />
      )}
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
