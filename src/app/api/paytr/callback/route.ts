import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
  sendSubscriptionStartedEmail,
  sendAdminSubscriptionAlertEmail,
  sendOrderConfirmationEmail,
} from '@/lib/email';

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
    // Yeni biçim (alfanumerik): ORD<orderId><13 hane ms><3 hane rastgele> / SUB<subId>...
    // Eski biçim (geriye dönük):  ORD_<orderId>_<timestamp> / SUB_<subId>_<timestamp>
    const SUFFIX_LEN = 16;
    const parseOid = (prefix: 'ORD' | 'SUB'): string => {
      if (merchantOid.startsWith(`${prefix}_`)) {
        const parts = merchantOid.split('_');
        if (parts.length >= 3) return parts.slice(1, -1).join('_');
        if (parts.length === 2) return parts[1];
        return merchantOid;
      }
      if (
        merchantOid.startsWith(prefix) &&
        /^[A-Za-z0-9]+$/.test(merchantOid) &&
        merchantOid.length > prefix.length + SUFFIX_LEN &&
        /^\d{16}$/.test(merchantOid.slice(-SUFFIX_LEN))
      ) {
        return merchantOid.slice(prefix.length, -SUFFIX_LEN);
      }
      return merchantOid;
    };
    const originalOrderId = parseOid('ORD');
    const originalSubId = parseOid('SUB');

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

        let finalUserId = subscription.userId;

        // Misafir kullanıcı ise ödeme sonrasında hesabı kesinleştir
        if (!finalUserId && subscription.pendingPhone) {
          let user = await prisma.user.findFirst({
            where: { phone: subscription.pendingPhone },
          });

          if (!user) {
            const fallbackEmail = `${subscription.pendingPhone}@musteri.cicekanatechmedia.com`;
            const desiredEmail = subscription.pendingEmail || fallbackEmail;

            // E-posta çakışması kontrolü
            const existingEmailUser = await prisma.user.findUnique({
              where: { email: desiredEmail },
            });

            const safeEmail = existingEmailUser ? fallbackEmail : desiredEmail;

            user = await prisma.user.create({
              data: {
                name: subscription.pendingName || 'Müşteri',
                phone: subscription.pendingPhone,
                email: safeEmail,
                passwordHash: subscription.pendingPasswordHash,
                role: 'EDITOR',
                isActive: true,
                isEmailVerified: false,
              },
            });
          }
          finalUserId = user.id;
        }

        await prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'PENDING' },
          data: {
            status: 'ACTIVE',
            userId: finalUserId,
            currentPeriodStart: start,
            currentPeriodEnd: end,
            pendingPasswordHash: null, // Hash kullanıldıktan sonra temizlenir
          },
        });

        logger.info({
          event: 'PAYTR_SUBSCRIPTION_ACTIVATED',
          details: { merchantOid, originalSubId, userId: finalUserId },
        });

        // Bildirim e-postaları (hata ödemeyi asla bozmaz)
        try {
          const [plan, tier, targetUser] = await Promise.all([
            prisma.plan.findUnique({ where: { id: subscription.planId }, select: { name: true } }),
            subscription.planTierId
              ? prisma.planTier.findUnique({
                  where: { id: subscription.planTierId },
                  select: { name: true },
                })
              : null,
            finalUserId
              ? prisma.user.findUnique({
                  where: { id: finalUserId },
                  select: { name: true, email: true, phone: true },
                })
              : null,
          ]);

          const customerEmail = targetUser?.email || subscription.pendingEmail;
          const isSynthetic = customerEmail?.endsWith('@musteri.cicekanatechmedia.com');

          if (customerEmail && !isSynthetic) {
            sendSubscriptionStartedEmail({
              to: customerEmail,
              customerName: targetUser?.name || subscription.pendingName || 'Değerli Müşterimiz',
              planName: plan?.name || 'AI Automation Paketi',
              tierName: tier?.name || 'Abonelik Paketi',
              amountTL: subscription.priceAtPurchase / 100,
              startDate: start.toLocaleDateString('tr-TR'),
            }).catch((e) => console.error('Subscription customer email error:', e));
          }

          sendAdminSubscriptionAlertEmail({
            customerName: targetUser?.name || subscription.pendingName || 'Müşteri',
            customerPhone: targetUser?.phone || subscription.pendingPhone || '-',
            customerEmail: customerEmail || '-',
            planName: plan?.name || 'AI Automation Paketi',
            tierName: tier?.name || 'Abonelik Paketi',
            amountTL: subscription.priceAtPurchase / 100,
            subscriptionId: subscription.id,
          }).catch((e) => console.error('Subscription admin email error:', e));
        } catch (mailErr) {
          logger.warn({
            event: 'SUBSCRIPTION_NOTIFICATION_ERROR',
            details: { error: String(mailErr) },
          });
        }
      } else if (status === 'failed') {
        await prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'PENDING' },
          data: { status: 'FAILED', pendingPasswordHash: null },
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
      include: { items: true, user: true },
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

      // ── Sipariş Onay E-postası ve Dönüşüm (Yalnızca ödeme kesinleştiğinde & idempotent) ──
      if (updated) {
        const customerEmail =
          order.guestEmail?.trim() ||
          order.user?.email?.trim() ||
          null;
        const customerName =
          order.guestName?.trim() ||
          order.user?.name?.trim() ||
          'Değerli Müşterimiz';

        if (customerEmail) {
          // Idempotency kontrolü: Bu sipariş için daha önce onay e-postası iletildi mi?
          const emailLogKey = `order_confirmation_${order.id}`;
          try {
            const alreadySent = await prisma.emailLog.findFirst({
              where: {
                templateId: emailLogKey,
                status: 'sent',
              },
            });

            if (!alreadySent) {
              const emailSuccess = await sendOrderConfirmationEmail({
                to: customerEmail,
                orderNumber: order.orderNumber,
                customerName,
                customerType: order.customerType,
                finalAmount: order.finalAmount,
              });

              if (emailSuccess) {
                await prisma.emailLog.create({
                  data: {
                    recipient: customerEmail,
                    subject: `Siparişiniz Alındı — #${order.orderNumber} — Çiçekana Teknoloji & Medya`,
                    templateId: emailLogKey,
                    status: 'sent',
                  },
                });
                logger.info({
                  event: 'ORDER_CONFIRMATION_EMAIL_SENT',
                  details: {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    recipient: customerEmail,
                  },
                });
              }
            } else {
              logger.info({
                event: 'ORDER_CONFIRMATION_EMAIL_ALREADY_SENT',
                details: { orderId: order.id, orderNumber: order.orderNumber },
              });
            }
          } catch (mailErr) {
            logger.error({
              event: 'ORDER_CONFIRMATION_EMAIL_ERROR',
              details: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                error: mailErr instanceof Error ? mailErr.message : String(mailErr),
              },
            });
          }
        }

        // Terk edilen sepet dönüşümü (Gerçekleşen başarılı ödeme anında)
        try {
          const orFilters: any[] = [];
          if (customerEmail) orFilters.push({ email: customerEmail.toLowerCase() });
          const shippingAddress = order.shippingAddress as any;
          if (shippingAddress?.phone) orFilters.push({ phone: shippingAddress.phone });
          if (order.userId) orFilters.push({ userId: order.userId });

          if (orFilters.length > 0) {
            await prisma.cartAbandonmentLog.updateMany({
              where: {
                OR: orFilters,
                converted: false,
              },
              data: {
                converted: true,
                recoveredAt: new Date(),
                status: 'RECOVERED',
              },
            });
          }
        } catch (convErr) {
          logger.warn({
            event: 'CART_ABANDONMENT_CONVERSION_ERROR',
            details: { error: String(convErr) },
          });
        }
      }
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
