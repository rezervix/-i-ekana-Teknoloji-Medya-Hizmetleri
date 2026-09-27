import React from "react";
import { prisma } from "@/lib/prisma";
import { FolderGit2 } from "lucide-react";
import ClientProjectsClient from "./ClientProjectsClient";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  let projects: any[] = [];
  try {
    projects = await prisma.clientProject.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyTitle: true,
          },
        },
        milestones: {
          orderBy: { order: "asc" },
        },
        deliverables: {
          orderBy: { uploadedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching client projects", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <FolderGit2 size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Müşteri Projeleri</h1>
            <p className="text-sm text-corp-gray">
              Müşteri projelerini görüntüleyin, oluşturun ve yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-6">
        <ClientProjectsClient initialProjects={projects} />
      </div>
    </div>
  );
}