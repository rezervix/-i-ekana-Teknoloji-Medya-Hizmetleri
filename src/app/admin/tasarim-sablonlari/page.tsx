import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DesignTemplatesClient from "./DesignTemplatesClient";

export default async function DesignTemplatesPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const templates = await prisma.designTemplate.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
    },
    orderBy: { name: "asc" },
  });

  return <DesignTemplatesClient initialTemplates={templates} products={products} />;
}
