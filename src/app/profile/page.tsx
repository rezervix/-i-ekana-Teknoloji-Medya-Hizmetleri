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

export default async function ProfilePage() {
  const session = await auth();

  // If not logged in, redirect to login
  if (!session || !session.user) {
    redirect("/auth?callbackUrl=/profile");
  }

  // Fetch full user data and order history from DB
  // Use try-catch to handle DB being down
  let user = session.user;
  let orders: any[] = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: {
        blogPosts: { take: 5, orderBy: { createdAt: "desc" } }
      }
    });
    
    if (dbUser) {
      user = { ...session.user, ...dbUser };
    }

    orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: dbUser?.id },
          { guestEmail: session.user.email as string }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
  } catch (error) {
    console.error("Profile Data Fetch Error:", error);
    // Continue with session data if DB is down
  }

  return <ProfileClient user={user} orders={orders} />;
}
