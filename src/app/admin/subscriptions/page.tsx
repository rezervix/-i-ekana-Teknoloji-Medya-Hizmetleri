import { requireAdmin } from "@/lib/admin-plan";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSubscriptionsClient from "./AdminSubscriptionsClient";

export const metadata = { title: "Abonelikler — Admin" };

export default async function AdminSubscriptionsPage() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      priceAtPurchase: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
      cancelledAt: true,
      cancelAtPeriodEnd: true,
      pendingName: true,
      pendingEmail: true,
      pendingPhone: true,
      paytrCustomerCode: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      plan: { select: { id: true, name: true } },
      planTier: { select: { id: true, name: true } },
    },
  });
  return <AdminSubscriptionsClient initialSubscriptions={subscriptions as any} />;
}
