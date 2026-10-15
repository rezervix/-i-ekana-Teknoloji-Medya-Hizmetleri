import type { Metadata } from "next";
import ETicaretClient from "./ETicaretClient";

export const metadata: Metadata = {
  title: "E-Ticaret Altyapı ve Danışmanlık Çözümleri — Çiçekana",
  description:
    "Uçtan uca yönetilen profesyonel e-ticaret altyapısı, sepet kurtarma, çapraz satış ve yapay zeka destekli dönüşüm araçlarıyla satışlarınızı katlayın.",
  keywords: [
    "e-ticaret",
    "e-ticaret altyapısı",
    "sepet kurtarma",
    "çapraz satış",
    "çiçekana e-ticaret",
    "e-ticaret danışmanlığı",
  ],
  openGraph: {
    title: "E-Ticaret Altyapı ve Danışmanlık Çözümleri — Çiçekana",
    description:
      "Daha fazla satış, daha az terk edilmiş sepet. Uçtan uca yönetilen profesyonel e-ticaret altyapısı.",
    type: "website",
    locale: "tr_TR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ETicaretPage() {
  return <ETicaretClient />;
}
