import { notFound } from "next/navigation";

export const metadata = {
  title: "Hizmet Bulunamadı — Çiçekana",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ETicaretPage() {
  notFound();
}
