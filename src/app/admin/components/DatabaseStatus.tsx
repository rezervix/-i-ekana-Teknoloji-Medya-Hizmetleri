"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Loader2 } from "lucide-react";

export default function DatabaseStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) setStatus("connected");
      else setStatus("disconnected");
    } catch (error) {
      setStatus("disconnected");
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative group px-3">
      <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${
        status === "connected" 
          ? "bg-green-50/50 border-green-100 text-green-700" 
          : status === "loading"
          ? "bg-gray-50 border-gray-100 text-gray-500"
          : "bg-red-50 border-red-100 text-red-700 animate-pulse"
      }`}>
        <div className="flex-shrink-0">
          {status === "connected" ? (
            <CheckCircle2 size={16} />
          ) : status === "loading" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <AlertCircle size={16} />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Sistem Durumu</span>
          <span className="text-[12px] font-bold">
            {status === "connected" ? "DB Bağlı" : status === "loading" ? "Kontrol Ediliyor..." : "DB Bağlantı Hatası"}
          </span>
        </div>
      </div>
      
      {status === "disconnected" && (
        <div className="absolute bottom-full left-3 right-3 mb-2 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <p className="font-bold text-red-400 mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Kritik Uyarı
          </p>
          PostgreSQL servisinin (Port: 51214) çalıştığından emin olun. Docker veya local Postgres servisini başlatın.
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
