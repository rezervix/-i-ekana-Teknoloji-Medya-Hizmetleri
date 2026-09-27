import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductsHero from "./components/ProductsHero";
import ProductsGrid from "./components/ProductsGrid";
import InfrastructureSection from "./components/InfrastructureSection";

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <ProductsHero />
      <InfrastructureSection />
      <ProductsGrid />
      <Footer />
    </main>
  );
}