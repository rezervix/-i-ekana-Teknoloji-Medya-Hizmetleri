import "server-only";

import { prisma } from "@/lib/prisma";
import {
  chargeWithSavedCard,
  translatePaytrErrorCode,
  DUNNING_CONFIG,
  SUBSCRIPTION_POLICIES,
} from "@/lib/paytr";
import {
  sendEmail,
  subscriptionRenewalReminderHtml,
  subscriptionCanceledHtml,
  subscriptionPaymentFailedHtml,
  subscriptionSuccessHtml,
  paymentSuccessfulReceiptHtml,
} from "@/lib/email";
import { logger } from "@/lib/logger";

export type FailedDetail = {
  subscriptionId: string;
  userEmail: string;
  errorCode?: string | null;
  errorMessageTr?: string | null;
};

export type BillingResult = {
  successCount: number;
  failedCount: number;
  processed: number;
  failedDetails: FailedDetail[];
};

function formatDateTr(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function runRecurringBilling(
  dryRun = false
): Promise<BillingResult> {
  const result: BillingResult = {
    successCount: 0,
    failedCount: 0,
    processed: 0,
    failedDetails: [],
  };

  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] as any },
      next_charge_at: { lte: now },
      savedCardId: { not: null },
    },
    include: {
      user: { select: { email: true, name: true } },
      savedCard: {
        select: { utoken: true, ctoken: true, masked_card_no: true, card_brand: true },
      },
      plan: { select: { name: true } },
      product: { select: { name: true } },
    },
  });

  result.processed = subscriptions.length;
  logger.info({
    event: "BILLING_RUN_START",
    details: { dryRun, totalToProcess: subscriptions.length },
  });

  for (const sub of subscriptions) {
    if (!sub.savedCard || !sub.user.email) {
      result.failedCount++;
      result.failedDetails.push({
        subscriptionId: sub.id,
        userEmail: sub.user.email ?? "unknown",
        errorMessageTr: "Kayıtlı kart veya kullanıcı e-postası eksik.",
      });
      continue;
    }

    const merchantOid = `SUB-${sub.id.slice(-8)}-${Date.now()}`;
    const amountTl = Number(sub.price_snapshot);
    const userName = sub.user.name ?? sub.user.email ?? "Değerli Müşterimiz";
    const planName =
      sub.plan?.name ?? sub.product?.name ?? "Abonelik";

    if (dryRun) {
      logger.info({
        event: "BILLING_DRY_RUN_SKIP",
        details: { subscriptionId: sub.id, merchantOid, amountTl },
      });
      result.successCount++;
      continue;
    }

    try {
      const chargeResult = await chargeWithSavedCard({
        merchant_oid: merchantOid,
        payment_amount_tl: amountTl,
        currency: "TL",
        utoken: sub.savedCard.utoken,
        ctoken: sub.savedCard.ctoken ?? undefined,
        email: sub.user.email,
        user_ip: "127.0.0.1",
        userId: sub.userId,
        userName,
      });

      if (chargeResult.success) {
        await prisma.$transaction(async (tx: any) => {
          await tx.paymentAttempt.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              amount: amountTl,
              currency: "TRY",
              status: "SUCCESS" as any,
              paytr_merchant_oid: merchantOid,
              paytr_transaction_id: chargeResult.transactionId,
              masked_card_no: chargeResult.maskedCardNo ?? sub.savedCard?.masked_card_no,
              is_recurring: true,
              attempt_number: 1,
              raw_response: chargeResult.rawResponse as any,
            },
          });

          const nextChargeAt = new Date(sub.next_charge_at);
          nextChargeAt.setDate(nextChargeAt.getDate() + SUBSCRIPTION_POLICIES.DEFAULT_INTERVAL_DAYS);

          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setDate(currentPeriodEnd.getDate() + SUBSCRIPTION_POLICIES.DEFAULT_INTERVAL_DAYS);

          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE" as any,
              past_due_at: null,
              next_charge_at: nextChargeAt,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              reminder_sent_at: null,
            },
          });
        });

        result.successCount++;

        try {
          const periodEndStr = formatDateTr(new Date(new Date().setDate(new Date().getDate() + SUBSCRIPTION_POLICIES.DEFAULT_INTERVAL_DAYS)));
          const masked = chargeResult.maskedCardNo ?? sub.savedCard.masked_card_no;

          await Promise.all([
            sendEmail(
              sub.user.email,
              `Abonelik Yenilendi - ${planName}`,
              subscriptionSuccessHtml(userName, planName, amountTl, periodEndStr)
            ),
            sendEmail(
              sub.user.email,
              `Ödeme Başarılı - ₺${amountTl.toFixed(2)}`,
              paymentSuccessfulReceiptHtml(
                userName,
                amountTl,
                (process.env.NEXT_PUBLIC_APP_URL || "") + "/profile",
                masked
              )
            ),
          ]);
        } catch (emailErr) {
          logger.error({
            event: "BILLING_SUCCESS_EMAIL_FAIL",
            details: { subscriptionId: sub.id, error: String(emailErr) },
          });
        }
      } else {
        const errorCode = chargeResult.errorCode;
        const errorMessageTr =
          chargeResult.errorMessageTr ?? translatePaytrErrorCode(errorCode);

        await prisma.$transaction(async (tx: any) => {
          try {
            await tx.paymentAttempt.create({
              data: {
                userId: sub.userId,
                subscriptionId: sub.id,
                amount: amountTl,
                currency: "TRY",
                status: "FAILED" as any,
                paytr_merchant_oid: merchantOid,
                error_code: errorCode,
                error_message: errorMessageTr,
                masked_card_no: sub.savedCard?.masked_card_no,
                is_recurring: true,
                attempt_number: 1,
                raw_response: chargeResult.rawResponse as any,
              },
            });
          } catch (paErr: any) {
            if (String(paErr?.message || "").includes("Unique constraint") ||
                String(paErr?.code || "") === "P2002") {
              logger.warning?.({
                event: "BILLING_DUPLICATE_PAYMENT_ATTEMPT",
                details: { merchantOid },
              });
            } else {
              throw paErr;
            }
          }

          if (sub.status !== ("PAST_DUE" as any)) {
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                status: "PAST_DUE" as any,
                past_due_at: new Date(),
              },
            });
          }
        });

        result.failedCount++;
        result.failedDetails.push({
          subscriptionId: sub.id,
          userEmail: sub.user.email,
          errorCode,
          errorMessageTr,
        });

        try {
          const updateCardUrl =
            (process.env.NEXT_PUBLIC_APP_URL || "") + "/profile";
          await sendEmail(
            sub.user.email,
            `Abonelik Ödemesi Başarısız - ${planName}`,
            subscriptionPaymentFailedHtml(
              userName,
              planName,
              errorMessageTr,
              updateCardUrl
            )
          );
        } catch (emailErr) {
          logger.error({
            event: "BILLING_FAILED_EMAIL_FAIL",
            details: { subscriptionId: sub.id, error: String(emailErr) },
          });
        }
      }
    } catch (err) {
      logger.error({
        event: "BILLING_UNEXPECTED_ERROR",
        details: { subscriptionId: sub.id, error: String(err) },
      });
      result.failedCount++;
      result.failedDetails.push({
        subscriptionId: sub.id,
        userEmail: sub.user.email,
        errorMessageTr: String(err),
      });
    }
  }

  logger.info({
    event: "BILLING_RUN_END",
    details: {
      dryRun,
      processed: result.processed,
      successCount: result.successCount,
      failedCount: result.failedCount,
    },
  });

  return result;
}

export async function sendRenewalReminders(): Promise<{ count: number }> {
  const now = new Date();
  const reminderCutoff = new Date();
  reminderCutoff.setDate(
    reminderCutoff.getDate() + SUBSCRIPTION_POLICIES.RENEWAL_REMINDER_DAYS_BEFORE
  );

  const subs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE" as any,
      reminder_sent_at: null,
      next_charge_at: {
        gte: now,
        lte: reminderCutoff,
      },
    },
    include: {
      user: { select: { email: true, name: true } },
      plan: { select: { name: true } },
      product: { select: { name: true } },
    },
  });

  let count = 0;

  for (const sub of subs) {
    if (!sub.user.email) continue;

    try {
      const userName = sub.user.name ?? sub.user.email ?? "Değerli Müşterimiz";
      const planName = sub.plan?.name ?? sub.product?.name ?? "Abonelik";
      const priceTl = Number(sub.price_snapshot);
      const daysLeft = Math.max(
        1,
        Math.ceil(
          (sub.next_charge_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      const nextChargeStr = formatDateTr(sub.next_charge_at);

      await sendEmail(
        sub.user.email,
        `Abonelik Yenileme Hatırlatması (${daysLeft} gün kaldı)`,
        subscriptionRenewalReminderHtml(
          userName,
          planName,
          priceTl,
          daysLeft,
          nextChargeStr
        )
      );

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { reminder_sent_at: new Date() },
      });

      count++;
    } catch (err) {
      logger.error({
        event: "RENEWAL_REMINDER_FAIL",
        details: { subscriptionId: sub.id, error: String(err) },
      });
    }
  }

  logger.info({
    event: "RENEWAL_REMINDERS_DONE",
    details: { sentCount: count, totalFound: subs.length },
  });

  return { count };
}

export async function cancelPastDueAfterGrace(): Promise<{ canceledCount: number }> {
  const now = new Date();
  const graceMs = DUNNING_CONFIG.PAST_DUE_GRACE_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - graceMs);

  const pastDues = await prisma.subscription.findMany({
    where: {
      status: "PAST_DUE" as any,
      past_due_at: { not: null, lte: cutoff },
    },
    include: {
      user: { select: { email: true, name: true } },
      plan: { select: { name: true } },
      product: { select: { name: true } },
    },
  });

  let canceledCount = 0;

  for (const sub of pastDues) {
    try {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: "CANCELED" as any,
          canceled_at: new Date(),
          cancel_reason: "payment_failed_grace_expired",
        },
      });

      canceledCount++;

      if (sub.user.email) {
        const userName = sub.user.name ?? sub.user.email ?? "Değerli Müşterimiz";
        const planName = sub.plan?.name ?? sub.product?.name ?? "Abonelik";
        const endDateStr = formatDateTr(sub.current_period_end);
        const reasonTr =
          "Abonelik ödemeniz için belirlenen 24 saatlik ek süre sona erdiği için aboneliğiniz otomatik olarak iptal edildi.";

        await sendEmail(
          sub.user.email,
          `Aboneliğiniz İptal Edildi - ${planName}`,
          subscriptionCanceledHtml(userName, planName, reasonTr, endDateStr)
        );
      }
    } catch (err) {
      logger.error({
        event: "PAST_DUE_CANCEL_FAIL",
        details: { subscriptionId: sub.id, error: String(err) },
      });
    }
  }

  logger.info({
    event: "PAST_DUE_CANCEL_DONE",
    details: { canceledCount, totalFound: pastDues.length },
  });

  return { canceledCount };
}
