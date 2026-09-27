import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SupportTicketDetailClient from "./SupportTicketDetailClient";

export const dynamic = "force-dynamic";

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyTitle: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return <SupportTicketDetailClient ticket={ticket} />;
}