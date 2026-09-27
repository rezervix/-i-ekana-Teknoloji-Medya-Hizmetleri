import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SubscriptionsClient from "./SubscriptionsClient";

export const metadata = { title: "Aboneliklerim — Çiçekana Teknoloji & Medya" };

export default async function SubscriptionsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth?callbackUrl=/profile/subscriptions");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId }, orderBy: { createdAt: "desc" },
    include: { plan: { select: { name: true, slug: true } }, planTier: { select: { name: true } } },
  });
  return <SubscriptionsClient initialSubscriptions={subscriptions} />;
}
