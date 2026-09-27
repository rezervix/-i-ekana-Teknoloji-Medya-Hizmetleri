import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

function hash(value: string, key: string) {
  return crypto.createHmac("sha256", key).update(value).digest("base64");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantKey || !merchantSalt) return new Response("NO", { status: 503 });

  try {
    const body = await request.text();
    const form = new URLSearchParams(body);
    const merchantOid = form.get("merchant_oid") || "";
    const status = form.get("status") || "";
    const totalAmount = form.get("total_amount") || "";
    const receivedHash = form.get("hash") || "";
    const expectedHash = hash(merchantOid + merchantSalt + status + totalAmount, merchantKey);

    if (!receivedHash || !safeEqual(expectedHash, receivedHash)) {
      logger.security({ event: "PAYTR_INVALID_CALLBACK_HASH", details: { merchantOid, status } });
      return new Response("NO", { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { orderNumber: merchantOid }, include: { items: true } });
    if (!order) {
      logger.error({ event: "PAYTR_CALLBACK_ORDER_NOT_FOUND", details: { merchantOid } });
      return new Response("OK");
    }

    if (order.paymentStatus !== "PENDING") return new Response("OK");

    if (status === "success") {
      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({ where: { id: order.id, paymentStatus: "PENDING" }, data: { paymentStatus: "COMPLETED", status: "CONFIRMED", paymentMethod: "paytr" } });
        if (claimed.count !== 1) return false;
        for (const item of order.items) {
          const result = await tx.product.updateMany({ where: { id: item.productId, OR: [{ stock: null }, { stock: { gte: item.quantity } }] }, data: { stock: { decrement: item.quantity } } });
          if (result.count !== 1) throw new Error(`Insufficient stock for ${item.productId}`);
        }
        return true;
      });
      logger.info({ event: "PAYTR_PAYMENT_COMPLETED", details: { merchantOid, updated } });
    } else if (status === "failed") {
      await prisma.order.updateMany({ where: { id: order.id, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED", status: "CANCELLED", notes: form.get("failed_reason_msg") || "PayTR ödeme başarısız." } });
      logger.info({ event: "PAYTR_PAYMENT_FAILED", details: { merchantOid, reason: form.get("failed_reason_msg") } });
    }

    return new Response("OK");
  } catch (error) {
    logger.error({ event: "PAYTR_CALLBACK_ERROR", details: { error: error instanceof Error ? error.message : String(error) } });
    return new Response("NO", { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
