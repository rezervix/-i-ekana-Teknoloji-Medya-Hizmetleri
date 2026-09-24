import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MidvemContent from "./MidvemContent";

export const metadata: Metadata = {
  title: "Midvem — Müşteri Destek ve İletişim Sistemi | Çiçekana Teknoloji",
  description:
    "WhatsApp, Instagram, Canlı Destek ve E-postalar artık tek merkezde. Gelen talepleri akıllı yapay zeka taslaklarıyla saniyeler içinde yanıtlayın, kaçan müşteri kalmasın.",
  openGraph: {
    title: "Midvem | Müşteri Destek ve İletişim Sistemi",
    description:
      "Müşteri İletişiminizi Tek Ekranda Birleştirin, Yapay Zekayla Otomatize Edin. WhatsApp & AI destekli akıllı yanıt asistanı.",
    type: "website",
    images: ["/images/midvem-dashboard.svg"],
  },
};

export default function MidvemPage() {
  return (
    <main className="min-h-screen bg-[#f0f4f6]">
      <Header />
      <MidvemContent />
      <Footer />
    </main>
  );
}
