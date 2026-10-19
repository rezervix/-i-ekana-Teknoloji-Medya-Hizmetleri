import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  notifyOrderPaymentSuccess,
  notifySubscriptionPaymentSuccess,
} from '@/lib/order-notifications';
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
    const isSubscriptionOid = merchantOid.startsWith('SUB') || merchantOid.startsWith('SUB_');
    const isOrderOid = merchantOid.startsWith('ORD') || merchantOid.startsWith('ORD_');

    const receivedAmount = /^\d+$/.test(totalAmount) ? Number(totalAmount) : NaN;
    if (!Number.isSafeInteger(receivedAmount) || receivedAmount < 0) {
      logger.security({
        event: 'PAYTR_INVALID_AMOUNT_FORMAT',
        details: { merchantOid, totalAmount, status },
      });
      return new Response('NO', { status: 400 });
    }

    // ── 2. ABONELİK İŞLEME ───────────────────────────────────────────────────
    if (isSubscriptionOid || (!isOrderOid && (originalSubId !== merchantOid))) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            { id: merchantOid },
            { id: originalSubId },
            { paytrCustomerCode: merchantOid },
            { paytrCustomerCode: originalSubId },
          ],
        },
      });

      if (!subscription) {
        logger.error({
          event: 'PAYTR_CALLBACK_SUBSCRIPTION_NOT_FOUND',
          details: { merchantOid, originalSubId, status, retryNeeded: true },
        });
        return new Response('NO', { status: 404 });
      }

      // Tutar doğrulama (PayTR kuruş cinsinden gönderir)
      if (receivedAmount !== subscription.priceAtPurchase) {
        logger.security({
          event: 'PAYTR_SUBSCRIPTION_AMOUNT_MISMATCH',
          details: {
            merchantOid,
            originalSubId,
            status,
            receivedAmount,
            expectedAmount: subscription.priceAtPurchase,
          },
        });
        return new Response('NO', { status: 400 });
      }

      // İdempotency: Zaten işlenmiş abonelikte mükerrer işlem yapma
      if (subscription.status !== 'PENDING') {
        logger.info({
          event: 'PAYTR_SUBSCRIPTION_ALREADY_PROCESSED',
          details: { merchantOid, subscriptionId: subscription.id, currentStatus: subscription.status },
        });
        return new Response('OK');
      }

      if (status === 'success') {
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        let finalUserId = subscription.userId;

        // Misafir kullanıcı ise ödeme sonrasında hesabı kesinleştir / bağla
        if (!finalUserId && subscription.pendingPhone) {
          let user = await prisma.user.findFirst({
            where: { phone: subscription.pendingPhone },
          });

          if (!user) {
            const fallbackEmail = `${subscription.pendingPhone}@musteri.cicekanatechmedia.com`;
            const desiredEmail = subscription.pendingEmail || fallbackEmail;

            const existingEmailUser = await prisma.user.findUnique({
              where: { email: desiredEmail },
            });
            const safeEmail = existingEmailUser ? fallbackEmail : desiredEmail;

            try {
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
            } catch {
              // Eş zamanlı istekte başka bir işlem oluşturmuşsa yeniden sorgula
              user = await prisma.user.findFirst({
                where: { phone: subscription.pendingPhone },
              });
            }
          }
          if (user) {
            finalUserId = user.id;
          }
        }

        // Atomik güncelleme: Yalnızca durumu hala PENDING olan kaydı ACTIVE yap
        const updateResult = await prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'PENDING' },
          data: {
            status: 'ACTIVE',
            userId: finalUserId,
            currentPeriodStart: start,
            currentPeriodEnd: end,
            pendingPasswordHash: null, // Güvenlik: Hash tek kullanımlık olup temizlenir
          },
        });

        // Sadece bu çağrı PENDING -> ACTIVE geçişini gerçekleştirdiyse bildirim gönder
        if (updateResult.count === 1) {
          logger.info({
            event: 'PAYTR_SUBSCRIPTION_ACTIVATED',
            details: {
              merchantOid,
              originalSubId,
              subscriptionId: subscription.id,
              userId: finalUserId,
              amount: subscription.priceAtPurchase,
            },
          });

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

            // cicekanareklam@gmail.com kişisel iş bildirim adresine satış bildirimi
            notifySubscriptionPaymentSuccess(subscription.id, merchantOid).catch((err) => {
              logger.warn({
                event: 'SUBSCRIPTION_PAYMENT_NOTIFICATION_ERROR',
                details: { subscriptionId: subscription.id, error: String(err) },
              });
            });
          } catch (mailErr) {
            logger.warn({
              event: 'SUBSCRIPTION_NOTIFICATION_ERROR',
              details: { error: String(mailErr) },
            });
          }
        }
      } else if (status === 'failed') {
        await prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'PENDING' },
          data: { status: 'FAILED', pendingPasswordHash: null },
        });
        logger.info({
          event: 'PAYTR_SUBSCRIPTION_FAILED',
          details: {
            merchantOid,
            originalSubId,
            subscriptionId: subscription.id,
            reason: form.get('failed_reason_msg') || 'Failed',
          },
        });
      } else {
        logger.warn({
          event: 'PAYTR_UNKNOWN_STATUS',
          details: { merchantOid, status },
        });
        return new Response('NO', { status: 400 });
      }

      return new Response('OK');
    }

    // ── 3. STANDART SİPARİŞ İŞLEME ───────────────────────────────────────────
    const order = await prisma.order.findFirst({
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
        details: { merchantOid, originalOrderId, status, retryNeeded: true },
      });
      return new Response('NO', { status: 404 });
    }

    // Sipariş tutar doğrulama (Kuruş bazında tam eşleşme)
    const expectedOrderKurus = Math.round((order.finalAmount + Number.EPSILON) * 100);
    if (receivedAmount !== expectedOrderKurus) {
      logger.security({
        event: 'PAYTR_ORDER_AMOUNT_MISMATCH',
        details: {
          merchantOid,
          originalOrderId,
          status,
          receivedAmount,
          expectedAmount: expectedOrderKurus,
        },
      });
      return new Response('NO', { status: 400 });
    }

    // İdempotency: Zaten sonuçlandırılmış sipariş için mükerrer işlem yapma
    if (order.paymentStatus !== 'PENDING') {
      logger.info({
        event: 'PAYTR_ORDER_ALREADY_PROCESSED',
        details: { merchantOid, orderNumber: order.orderNumber, paymentStatus: order.paymentStatus },
      });
      return new Response('OK');
    }

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

        // ── Yönetici Satış Bildirimi (cicekanareklam@gmail.com - Asenkron & İdempotent) ──
        notifyOrderPaymentSuccess(order.id, merchantOid).catch((notifErr) => {
          logger.error({
            event: 'ORDER_PAYMENT_NOTIFICATION_ERROR',
            details: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              error: notifErr instanceof Error ? notifErr.message : String(notifErr),
            },
          });
        });
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
    } else {
      logger.warn({
        event: 'PAYTR_UNKNOWN_STATUS',
        details: { merchantOid, status },
      });
      return new Response('NO', { status: 400 });
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
