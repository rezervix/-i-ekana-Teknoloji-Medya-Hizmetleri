import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MicrosoftCallCenterAIContent from "./MicrosoftCallCenterAIContent";

export const metadata: Metadata = {
  title: "Microsoft Call Center AI - Yapay Zeka Destekli Çağrı Merkezi Çözümü",
  description: "Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, her dili anlayan ve insan doğallığında konuşan yapay zeka çözümünüz.",
};

export default function MicrosoftCallCenterAIPage() {
  return (
    <main className="min-h-screen bg-[#fcf9f8]">
      <Header />
      <MicrosoftCallCenterAIContent />
      <Footer />
    </main>
  );
}
