import { prisma } from "@/lib/prisma";

export interface ConfiguratorStepTitles {
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step4Title: string;
}

export const DEFAULT_CONFIGURATOR_TITLES: ConfiguratorStepTitles = {
  step1Title: "Ebat ve Kağıt Özellikleri",
  step2Title: "Sipariş Adedi",
  step3Title: "Tasarımınızı Belirleyin",
  step4Title: "Fiyat Özeti ve Sipariş",
};

export interface DynamicContentDTO {
  id?: string;
  key: string;
  content: string;
  locale?: string;
  description?: string | null;
  group?: string;
  updatedBy?: string | null;
  updatedAt?: Date | string;
}

/**
 * Tekil dinamik içerik değerini getirir. Hata veya kayıt yokluğunda fallback döner.
 */
export async function getDynamicContent(
  key: string,
  locale: string = "tr",
  fallback: string = ""
): Promise<string> {
  try {
    const item = await prisma.dynamicContent.findUnique({
      where: {
        key_locale: {
          key,
          locale,
        },
      },
      select: { content: true },
    });
    return item?.content?.trim() || fallback;
  } catch (error) {
    console.warn(`[DynamicContent] Failed to fetch key: ${key}`, error);
    return fallback;
  }
}

/**
 * Belirtilen gruptaki veya anahtarlardaki tüm dinamik içerikleri Key-Value map olarak getirir.
 */
export async function getDynamicContentMap(options?: {
  keys?: string[];
  group?: string;
  locale?: string;
}): Promise<Record<string, string>> {
  const locale = options?.locale || "tr";
  try {
    const where: any = { locale };
    if (options?.keys && options.keys.length > 0) {
      where.key = { in: options.keys };
    }
    if (options?.group) {
      where.group = options.group;
    }

    const items = await prisma.dynamicContent.findMany({
      where,
      select: { key: true, content: true },
    });

    const result: Record<string, string> = {};
    for (const item of items) {
      result[item.key] = item.content;
    }
    return result;
  } catch (error) {
    console.warn("[DynamicContent] Failed to fetch content map", error);
    return {};
  }
}

/**
 * Ürün için en uygun yapılandırıcı adım başlıklarını hiyerarşik olarak belirler:
 * 1. Ürün seviyesinde özel tanımlanmış başlık (Product.customizationOptions.step1Title / stepTitles)
 * 2. Ürün adı / alt kategorisi ile eşleşen override (örn. Kaşe ürünleri -> "Kaşe ve Mürekkep Özellikleri")
 * 3. Kategoriye özel override (örn. Teknoloji -> "Ürün ve Donanım Özellikleri")
 * 4. Genel sistem ayarı (DynamicContent "product_configurator.step1_title")
 * 5. Hardcoded varsayılan değer ("Ebat ve Kağıt Özellikleri")
 */
export async function resolveConfiguratorStepTitles(product?: {
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  customizationOptions?: any;
}): Promise<ConfiguratorStepTitles> {
  // 1. Ürün üzerindeki doğrudan tanımlamayı kontrol et
  const productOpts = product?.customizationOptions;
  const productCustomStep1 =
    productOpts?.step1Title ||
    productOpts?.stepTitles?.step1Title ||
    productOpts?.stepTitles?.step1;
  const productCustomStep2 =
    productOpts?.step2Title ||
    productOpts?.stepTitles?.step2Title ||
    productOpts?.stepTitles?.step2;
  const productCustomStep3 =
    productOpts?.step3Title ||
    productOpts?.stepTitles?.step3Title ||
    productOpts?.stepTitles?.step3;
  const productCustomStep4 =
    productOpts?.step4Title ||
    productOpts?.stepTitles?.step4Title ||
    productOpts?.stepTitles?.step4;

  // DB'den yapılandırıcı metinlerini tek sorguda çek
  const contentMap = await getDynamicContentMap({ group: "product_configurator", locale: "tr" });

  const nameLower = (product?.name || "").toLowerCase();
  const subcategoryLower = (product?.subcategory || "").toLowerCase();
  const category = product?.category || "";

  // Step 1 Çözümleme
  let step1Title = DEFAULT_CONFIGURATOR_TITLES.step1Title;

  if (productCustomStep1 && typeof productCustomStep1 === "string" && productCustomStep1.trim()) {
    step1Title = productCustomStep1.trim();
  } else if (
    (nameLower.includes("kaşe") ||
      nameLower.includes("kase") ||
      subcategoryLower.includes("kaşe") ||
      subcategoryLower.includes("kase")) &&
    contentMap["product_configurator.step1_title_kase"]
  ) {
    step1Title = contentMap["product_configurator.step1_title_kase"];
  } else if (category === "Teknoloji" && contentMap["product_configurator.step1_title_teknoloji"]) {
    step1Title = contentMap["product_configurator.step1_title_teknoloji"];
  } else if (category === "Medya" && contentMap["product_configurator.step1_title_medya"]) {
    step1Title = contentMap["product_configurator.step1_title_medya"];
  } else if (category === "Baski" && contentMap["product_configurator.step1_title_baski"]) {
    step1Title = contentMap["product_configurator.step1_title_baski"];
  } else if (contentMap["product_configurator.step1_title"]) {
    step1Title = contentMap["product_configurator.step1_title"];
  }

  // Step 2, 3, 4 Çözümleme
  const step2Title =
    productCustomStep2?.trim() ||
    contentMap["product_configurator.step2_title"] ||
    DEFAULT_CONFIGURATOR_TITLES.step2Title;

  const step3Title =
    productCustomStep3?.trim() ||
    contentMap["product_configurator.step3_title"] ||
    DEFAULT_CONFIGURATOR_TITLES.step3Title;

  const step4Title =
    productCustomStep4?.trim() ||
    contentMap["product_configurator.step4_title"] ||
    DEFAULT_CONFIGURATOR_TITLES.step4Title;

  return {
    step1Title,
    step2Title,
    step3Title,
    step4Title,
  };
}
