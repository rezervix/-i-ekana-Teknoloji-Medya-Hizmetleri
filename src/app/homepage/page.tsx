import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "./components/HeroSection";
import PartnersSection from "./components/PartnersSection";
import BusinessPartnersSection from "./components/BusinessPartnersSection";
import ServicesBento from "./components/ServicesBento";
import MetricsSection from "./components/MetricsSection";
import TestimonialsSection from "./components/TestimonialsSection";
import ContactSection from "./components/ContactSection";
import { Toaster } from "sonner";
import CookieConsent from "@/components/ui/CookieConsent";

export default function HomepagePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <PartnersSection />
      <BusinessPartnersSection />
      <ServicesBento />
      <MetricsSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
      <Toaster theme="light" position="bottom-right" richColors />
      <CookieConsent />
    </main>
  );
}
