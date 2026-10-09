import { redirect } from "next/navigation";

export const metadata = {
  title: "Aboneliklerim — Çiçekana Teknoloji & Medya",
  description: "Abonelik paketlerinizi ve faturalandırmanızı yönetin.",
};

export default function SubscriptionsRedirectPage() {
  redirect("/profile?tab=subscriptions");
}
