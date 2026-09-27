import { requireAdmin } from "@/lib/admin-plan";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSubscriptionsClient from "./AdminSubscriptionsClient";

export const metadata = { title: "Abonelikler — Admin" };

export default async function AdminSubscriptionsPage() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const subscriptions = await prisma.subscription.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } }, planTier: { select: { name: true } } } });
  return <AdminSubscriptionsClient initialSubscriptions={subscriptions} />;
}
