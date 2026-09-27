import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        client: true,
        year: true,
        category: true,
        challenge: true,
        solution: true,
        metrics: true,
        heroImage: true,
        images: true,
        techTags: true,
        createdAt: true,
      },
    });
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
