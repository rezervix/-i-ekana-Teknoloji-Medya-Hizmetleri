import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profilim — Çiçekana Teknoloji & Medya",
  description: "Hesap bilgileriniz, sipariş geçmişiniz ve ayarlarınız.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const tab = resolvedParams?.tab;
  const session = await auth();

  // If not logged in, redirect to login with callbackUrl
  if (!session || !session.user) {
    const callback = tab ? `/profile?tab=${encodeURIComponent(tab)}` : "/profile";
    redirect(`/auth?callbackUrl=${encodeURIComponent(callback)}`);
  }

  // Fetch full user data and order history from DB
  // Use try-catch to handle DB being down
  let user = session.user;
  let orders: any[] = [];
  let subscriptions: any[] = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: {
        blogPosts: { take: 5, orderBy: { createdAt: "desc" } },
        accounts: { select: { provider: true } },
      },
    });

    if (dbUser) {
      user = { ...session.user, ...dbUser };
    }

    const orderOwnerFilters = [
      ...(dbUser?.id ? [{ userId: dbUser.id }] : []),
      ...(session.user.email ? [{ guestEmail: session.user.email }] : []),
    ];

    orders = orderOwnerFilters.length
      ? await prisma.order.findMany({
          where: { OR: orderOwnerFilters },
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { product: true },
            },
          },
        })
      : [];

    if (dbUser?.id) {
      subscriptions = await prisma.subscription.findMany({
        where: { userId: dbUser.id },
        include: { plan: true, planTier: true },
        orderBy: { createdAt: "desc" },
      });
    }
  } catch (error) {
    console.error("Profile Data Fetch Error:", error);
    // Continue with session data if DB is down
  }

  return (
    <ProfileClient
      user={user}
      orders={orders}
      subscriptions={subscriptions}
      initialTab={tab}
    />
  );
}
