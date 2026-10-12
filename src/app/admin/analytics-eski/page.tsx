import React, { Suspense } from "react";
import AnalyticsClient from "./components/AnalyticsClient";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Eski analitik paneli yükleniyor...</p>
          </div>
        </div>
      }
    >
      <AnalyticsClient />
    </Suspense>
  );
}
