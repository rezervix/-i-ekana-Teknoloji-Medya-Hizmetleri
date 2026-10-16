import { z } from "zod";

export const SERVICE_OPTIONS = [
  "Sosyal medya hesap yönetimi",
  "İçerik stratejisi ve yayın takvimi",
  "Görsel tasarım ve içerik üretimi",
  "Reels ve kısa video içerikleri",
  "Meta Ads danışmanlığı ve yönetimi",
  "Google Ads danışmanlığı ve yönetimi",
  "Mevcut reklam hesaplarının değerlendirilmesi",
  "Reklam performansının iyileştirilmesi",
  "Sosyal medya ve reklam yönetiminin birlikte yürütülmesi",
  "Hangi hizmete ihtiyacım olduğunu birlikte belirlemek istiyorum",
] as const;

export const PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Diğer",
] as const;

export const GOAL_OPTIONS = [
  "Marka bilinirliğini artırmak",
  "Nitelikli müşteri adayları kazanmak",
  "Satışları artırmak",
  "Web sitesine trafik çekmek",
  "Mevcut reklamların performansını iyileştirmek",
  "Düzenli ve profesyonel içerik üretmek",
  "Yeni pazarlara ulaşmak",
  "Diğer",
] as const;

export const SERVICE_BUDGET_OPTIONS = [
  "15.000–25.000 TL",
  "25.000–50.000 TL",
  "50.000–100.000 TL",
  "100.000 TL ve üzeri",
] as const;

export const AD_SPEND_BUDGET_OPTIONS = [
  "Henüz reklam bütçem yok",
  "10.000 TL'den az",
  "10.000–30.000 TL",
  "30.000–75.000 TL",
  "75.000 TL ve üzeri",
  "Henüz karar vermedim",
] as const;

export const SECTOR_OPTIONS = [
  "E-Ticaret / Perakende",
  "B2B / Kurumsal Hizmetler",
  "Sağlık / Klinik / Medikal",
  "Turizm / Otel / Seyahat",
  "Yeme & İçme / Restoran / Kafe",
  "Gayrimenkul / İnşaat",
  "Eğitim / Akademi / Kurs",
  "Teknoloji / Yazılım / SaaS",
  "Tekstil / Moda / Giyim",
  "Diğer",
] as const;

export const CONTACT_METHOD_OPTIONS = [
  "Telefon Görüşmesi",
  "WhatsApp",
  "E-posta",
] as const;

export const START_PERIOD_OPTIONS = [
  "Hemen (Bu hafta)",
  "Önümüzdeki 2 hafta içinde",
  "Önümüzdeki ay",
  "Stratejik planlama aşamasındayız",
] as const;

export const APPLICATION_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  NEW: {
    label: "Yeni Başvuru",
    color: "#0A4D68",
    bg: "#E8F4F8",
    border: "#BAE0EC",
  },
  REVIEWING: {
    label: "İnceleniyor",
    color: "#6366F1",
    bg: "#EEF2FF",
    border: "#C7D2FE",
  },
  CONTACTED: {
    label: "İletişime Geçildi",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  PROPOSAL_PREPARING: {
    label: "Teklif Hazırlanıyor",
    color: "#0284C7",
    bg: "#E0F2FE",
    border: "#BAE6FD",
  },
  PROPOSAL_SENT: {
    label: "Teklif İletildi",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  WON: {
    label: "Kazanıldı",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  LOST: {
    label: "Kaybedildi",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  ARCHIVED: {
    label: "Arşivlendi",
    color: "#6B7280",
    bg: "#F3F4F6",
    border: "#E5E7EB",
  },
};

export const socialApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { message: "Ad ve soyad en az 3 karakter olmalıdır" })
    .max(100, { message: "Ad ve soyad en fazla 100 karakter olabilir" }),
  companyName: z
    .string()
    .trim()
    .min(2, { message: "İşletme / marka adı en az 2 karakter olmalıdır" })
    .max(120, { message: "İşletme adı en fazla 120 karakter olabilir" }),
  title: z.string().trim().max(100).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email({ message: "Lütfen geçerli bir e-posta adresi girin" })
    .max(120),
  phone: z
    .string()
    .trim()
    .min(10, { message: "Lütfen geçerli bir telefon numarası girin" })
    .max(25, { message: "Telefon numarası geçersiz" }),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  socialMediaUrl: z.string().trim().max(200).optional().or(z.literal("")),
  sector: z.string().min(1, { message: "Lütfen bir faaliyet sektörü seçin" }),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  services: z
    .array(z.string())
    .min(1, { message: "Lütfen en az bir hizmet seçeneği işaretleyin" }),
  platforms: z
    .array(z.string())
    .min(1, { message: "Lütfen yönetilmesini istediğiniz en az bir platform seçin" }),
  goals: z
    .array(z.string())
    .min(1, { message: "Lütfen işletmeniz için en az bir hedef belirleyin" }),
  monthlyServiceBudget: z.enum(SERVICE_BUDGET_OPTIONS, {
    message: "Lütfen aylık hizmet bütçesi aralığınızı seçin (Minimum 15.000 TL).",
  }),
  monthlyAdSpendBudget: z.enum(AD_SPEND_BUDGET_OPTIONS, {
    message: "Lütfen reklam harcaması bütçenizi seçin.",
  }),
  preferredPeriod: z.string().max(100).optional().or(z.literal("")),
  currentAccountStatus: z.string().max(200).optional().or(z.literal("")),
  currentAdExperience: z.string().max(300).optional().or(z.literal("")),
  notes: z
    .string()
    .max(2000, { message: "Açıklama 2000 karakteri geçemez" })
    .optional()
    .or(z.literal("")),
  preferredContactMethod: z.string().max(50).optional().or(z.literal("")),
  budgetConfirmed: z.literal(true, {
    message:
      "Başvurunuza devam edebilmeniz için minimum hizmet bütçesi bilgilendirmesini onaylamanız gerekir.",
  }),
  kvkkConsent: z.literal(true, {
    message: "KVKK Aydınlatma Metni'ni onaylamanız gerekmektedir.",
  }),
  marketingConsent: z.boolean().default(false),
  honeypot: z.string().max(0).optional(),
  applicationType: z.literal("detailed").default("detailed").optional(),
});

export type SocialApplicationFormData = z.infer<typeof socialApplicationSchema>;

/**
 * Normalizes Turkish phone numbers into a consistent standard format.
 * Accepts: "05xx xxx xx xx", "5xx xxx xx xx", "+905xxxxxxxxx", "00905xxxxxxxxx", etc.
 * Normalizes to clean 10-digit mobile number and canonical "05XX XXX XX XX" display format.
 */
export function normalizeTurkishPhone(input: string): {
  isValid: boolean;
  coreDigits: string;
  formatted: string;
  errorMessage?: string;
} {
  if (!input) {
    return {
      isValid: false,
      coreDigits: "",
      formatted: "",
      errorMessage: "Lütfen telefon numaranızı giriniz",
    };
  }

  // Strip everything except digits
  let digits = input.replace(/\D/g, "");

  // Strip international prefix
  if (digits.startsWith("0090")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("90") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Strip leading 0
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // A valid Turkish mobile or geographic phone number is 10 digits
  if (digits.length !== 10) {
    return {
      isValid: false,
      coreDigits: digits,
      formatted: input,
      errorMessage: "Lütfen 10 haneli geçerli bir telefon numarası giriniz (Örn: 05XX XXX XX XX)",
    };
  }

  // Turkish mobile numbers start with 5 (e.g. 50x, 53x, 54x, 55x)
  if (!digits.startsWith("5")) {
    return {
      isValid: false,
      coreDigits: digits,
      formatted: input,
      errorMessage: "Lütfen 05 ile başlayan geçerli bir cep telefonu numarası giriniz",
    };
  }

  const formatted = `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;

  return {
    isValid: true,
    coreDigits: digits,
    formatted,
  };
}

export const quickApplicationSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, { message: "Lütfen telefon numaranızı giriniz" })
    .max(25, { message: "Telefon numarası geçersiz" })
    .refine((val) => normalizeTurkishPhone(val).isValid, {
      message: "Lütfen 05 ile başlayan geçerli bir telefon numarası giriniz (Örn: 05XX XXX XX XX)",
    }),
  budgetConfirmed: z.literal(true, {
    message: "Başvurunuza devam edebilmeniz için minimum hizmet bütçesi bilgilendirmesini onaylamanız gerekir.",
  }),
  honeypot: z.string().max(0).optional(),
  applicationType: z.literal("quick").default("quick"),
});

export type QuickApplicationFormData = z.infer<typeof quickApplicationSchema>;
