/**
 * variantLabelDetector.ts
 *
 * "Özellik_N" CSV sütunundaki değerleri analiz ederek
 * dimension label'ını otomatik tahmin eder.
 *
 * Test edilebilir saf fonksiyon — yan etkisi yok.
 * Yeni bir pattern eklemek için RULES dizisine satır eklemek yeterlidir.
 */

export interface LabelDetectionResult {
  label: string;
  /** true = otomatik tahmin edildi, false = eşleşme bulunamadı (admin düzenlemeli) */
  autoDetected: boolean;
}

interface DetectionRule {
  /** Test edilecek regex — sütundaki değerlere karşı */
  pattern: RegExp;
  /** Eşleşirse kullanılacak Türkçe label */
  label: string;
}

/**
 * Sıralı eşleşme kuralları.
 * Daha spesifik kurallar üste yazılmalı; ilk eşleşen kazanır.
 */
const RULES: DetectionRule[] = [
  // Kesim Türü
  {
    pattern: /kesim/i,
    label: "Kesim Türü",
  },
  // Kağıt Cinsi — "gr.", "Bristol", "Kuşe", "kağıt/kağıd"
  {
    pattern: /gr\.|bristol|kuşe|ka[gğ][iı][dt]/i,
    label: "Kağıt Cinsi",
  },
  // Selefon Türü
  {
    pattern: /selefon/i,
    label: "Selefon Türü",
  },
  // Ebat / Kullanım — "8.4x10.6 cm" gibi boyut ifadeleri
  {
    pattern: /\d+[.,]?\d*\s*[xX]\s*\d+[.,]?\d*/,
    label: "Ebat / Kullanım",
  },
  // Yaldız Çeşidi
  {
    pattern: /yaldız/i,
    label: "Yaldız Çeşidi",
  },
  // Baskı Türü — "Tek Yön Baskı", "Çift Yön", "Yön" gibi
  {
    pattern: /baskı|yön/i,
    label: "Baskı Türü",
  },
  // Kaplama / Laminasyon — "Lak", "Mat", "Parlak", "Kadife"
  {
    pattern: /lak|laminasyon|kadife|^mat$|parlak/i,
    label: "Kaplama Türü",
  },
  // Renk seçeneği — "Tek Renk", "4+0", "4+4" gibi
  {
    pattern: /tek renk|\d\+\d|cmyk/i,
    label: "Baskı Rengi",
  },
];

/**
 * Bir Özellik_N sütunundaki tüm değerleri (benzersizler) inceleyerek
 * dimension label'ını tahmin eder.
 *
 * @param values - Sütundaki tüm değerler (tekrarlı olabilir, boşlar filtrelenir)
 * @param dimensionIndex - Fallback için sıra numarası (1'den başlar)
 */
export function detectDimensionLabel(
  values: string[],
  dimensionIndex: number
): LabelDetectionResult {
  // Boş değerleri filtrele, benzersiz yap
  const uniqueValues = Array.from(
    new Set(values.map((v) => v.trim()).filter(Boolean))
  );

  if (uniqueValues.length === 0) {
    return { label: `Seçenek ${dimensionIndex}`, autoDetected: false };
  }

  // Her kural için, sütundaki değerlerin en az birinin eşleşip eşleşmediğini kontrol et
  for (const rule of RULES) {
    const matched = uniqueValues.some((val) => rule.pattern.test(val));
    if (matched) {
      return { label: rule.label, autoDetected: true };
    }
  }

  // Hiçbir kural eşleşmedi → admin manuel düzenlemeli
  return { label: `Seçenek ${dimensionIndex}`, autoDetected: false };
}

/**
 * Tek bir değerden label tahmini (birden fazla değer yokken kullanım).
 */
export function detectLabelFromSingleValue(
  value: string,
  dimensionIndex: number
): LabelDetectionResult {
  return detectDimensionLabel([value], dimensionIndex);
}
