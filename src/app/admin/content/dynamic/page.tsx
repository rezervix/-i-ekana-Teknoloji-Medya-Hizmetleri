import React from "react";
import DynamicContentManager from "../../settings/DynamicContentManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dinamik İçerik Yönetimi — Çiçekana Admin",
  description:
    "Sistem genelindeki statik ve yarı dinamik içerikleri, yapılandırıcı başlıklarını ve parametreleri yönetin.",
};

export default function AdminDynamicContentPage() {
  return <DynamicContentManager />;
}
