import React from "react";
import { prisma } from "@/lib/prisma";
import { FolderKanban } from "lucide-react";
import ProjectList from "./ProjectList";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  let projects: any[] = [];
  try {
    projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching projects", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <FolderKanban size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Proje Yönetimi</h1>
            <p className="text-sm text-corp-gray">
              Portfolio projelerini yönetin ve yeni case study'ler ekleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <ProjectList initialProjects={projects} />
      </div>
    </div>
  );
}
