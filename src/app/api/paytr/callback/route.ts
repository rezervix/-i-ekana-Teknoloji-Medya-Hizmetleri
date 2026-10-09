import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

function hash(value: string, key: string) {
  return crypto.createHmac('sha256', key).update(value).digest('base64');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantKey || !merchantSalt) return new Response('NO', { status: 503 });

  try {
    const body = await request.text();
    const form = new URLSearchParams(body);
    const merchantOid = form.get('merchant_oid') || '';
    const status = form.get('status') || '';
    const totalAmount = form.get('total_amount') || '';
    const receivedHash = form.get('hash') || '';
    const expectedHash = hash(merchantOid + merchantSalt + status + totalAmount, merchantKey);

    if (!receivedHash || !safeEqual(expectedHash, receivedHash)) {
      logger.security({ event: 'PAYTR_INVALID_CALLBACK_HASH', details: { merchantOid, status } });
      return new Response('NO', { status: 400 });
    }

    // 1. merchant_oid string'inden orijinal orderId / subscriptionId değerini ayrıştır
    // Format: ORD_${orderId}_${timestamp} veya SUB_${subscriptionId}_${timestamp}
    let originalOrderId = merchantOid;
    if (merchantOid.startsWith('ORD_')) {
      const parts = merchantOid.split('_');
      if (parts.length >= 3) {
        // İlk parça 'ORD', son parça timestamp; aradaki kısım orijinal orderId
        originalOrderId = parts.slice(1, -1).join('_');
      } else if (parts.length === 2) {
        originalOrderId = parts[1];
      }
    }

    let originalSubId = merchantOid;
    if (merchantOid.startsWith('SUB_')) {
      const parts = merchantOid.split('_');
      if (parts.length >= 3) {
        originalSubId = parts.slice(1, -1).join('_');
      } else if (parts.length === 2) {
        originalSubId = parts[1];
      }
    }

    // Abonelik kontrolü (doğrudan ID, ayrıştırılan ID veya paytrCustomerCode üzerinden)
    let subscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { id: merchantOid },
          { id: originalSubId },
          { paytrCustomerCode: merchantOid },
          { paytrCustomerCode: originalSubId },
        ],
      },
    });

    if (subscription) {
      const receivedAmount = /^\d+$/.test(totalAmount) ? Number(totalAmount) : NaN;
      if (
        !Number.isSafeInteger(receivedAmount) ||
        receivedAmount !== subscription.priceAtPurchase
      ) {
        logger.security({
          event: 'PAYTR_SUBSCRIPTION_AMOUNT_MISMATCH',
          details: { merchantOid, originalSubId, status },
        });
        return new Response('NO', { status: 400 });
      }
      if (subscription.status !== 'PENDING') return new Response('OK');
      if (status === 'success') {
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        await prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'PENDING' },
          data: { status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: end },
        });
        logger.info({ event: 'PAYTR_SUBSCRIPTION_ACTIVATED', details: { merchantOid, originalSubId } });
      } else if (status === 'failed') {
        await prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'PENDING' },
          data: { status: 'FAILED' },
        });
        logger.info({ event: 'PAYTR_SUBSCRIPTION_FAILED', details: { merchantOid, originalSubId } });
      }
      return new Response('OK');
    }

    // Sipariş kontrolü (ayrıştırılan orijinal orderId veya tam merchantOid üzerinden)
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: originalOrderId },
          { orderNumber: originalOrderId },
          { id: merchantOid },
          { orderNumber: merchantOid },
        ],
      },
      include: { items: true },
    });
    if (!order) {
      logger.error({
        event: 'PAYTR_CALLBACK_ORDER_NOT_FOUND',
        details: { merchantOid, originalOrderId },
      });
      return new Response('OK');
    }

    if (order.paymentStatus !== 'PENDING') return new Response('OK');

    if (status === 'success') {
      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: order.id, paymentStatus: 'PENDING' },
          data: { paymentStatus: 'COMPLETED', status: 'CONFIRMED', paymentMethod: 'paytr' },
        });
        if (claimed.count !== 1) return false;
        for (const item of order.items) {
          const result = await tx.product.updateMany({
            where: { id: item.productId, OR: [{ stock: null }, { stock: { gte: item.quantity } }] },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count !== 1) throw new Error(`Insufficient stock for ${item.productId}`);
        }
        return true;
      });
      logger.info({
        event: 'PAYTR_PAYMENT_COMPLETED',
        details: { merchantOid, originalOrderId, orderId: order.id, orderNumber: order.orderNumber, updated },
      });
    } else if (status === 'failed') {
      await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: 'PENDING' },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          notes: form.get('failed_reason_msg') || 'PayTR ödeme başarısız.',
        },
      });
      logger.info({
        event: 'PAYTR_PAYMENT_FAILED',
        details: { merchantOid, originalOrderId, orderId: order.id, orderNumber: order.orderNumber, reason: form.get('failed_reason_msg') },
      });
    }

    return new Response('OK');
  } catch (error) {
    logger.error({
      event: 'PAYTR_CALLBACK_ERROR',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return new Response('NO', { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
