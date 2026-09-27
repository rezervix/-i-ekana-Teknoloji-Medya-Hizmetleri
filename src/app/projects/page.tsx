import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectsHero from "./components/ProjectsHero";
import ProjectsGrid from "./components/ProjectsGrid";
import PartnerCTA from "./components/PartnerCTA";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: any[] = [];
  try {
    projects = await prisma.project.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        client: true,
        category: true,
        challenge: true,
        solution: true,
        heroImage: true,
        techTags: true,
        metrics: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <ProjectsHero />
      <ProjectsGrid projects={projects} />
      <PartnerCTA />
      <Footer />
    </main>
  );
}