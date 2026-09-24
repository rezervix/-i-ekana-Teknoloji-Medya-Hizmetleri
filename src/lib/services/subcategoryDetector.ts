/**
 * Automatically detects the subcategory of a product based on its name.
 * Returns the detected subcategory name or null if no match is found.
 */
export function detectSubcategory(productName: string): string | null {
  if (!productName) return null;
  
  // Clean name and lowercase it for Turkish-friendly comparison
  const nameLower = productName.toLowerCase();
  
  if (nameLower.includes("kartvizit")) {
    return "Kartvizit";
  }
  if (nameLower.includes("broşür")) {
    return "Broşür";
  }
  if (nameLower.includes("davetiye")) {
    return "Davetiye";
  }
  if (nameLower.includes("el ilanı") || nameLower.includes("elilani")) {
    return "El İlanı";
  }
  if (nameLower.includes("katalog")) {
    return "Katalog";
  }
  if (nameLower.includes("magnet")) {
    return "Magnet";
  }
  if (nameLower.includes("etiket") || nameLower.includes("sticker")) {
    return "Etiket";
  }
  if (nameLower.includes("afiş") || nameLower.includes("poster")) {
    return "Afiş";
  }
  if (nameLower.includes("branda")) {
    return "Branda";
  }
  if (nameLower.includes("antetli") || nameLower.includes("zarf")) {
    return "Kırtasiye";
  }
  if (
    nameLower.includes("bloknot") ||
    nameLower.includes("cepli dosya") ||
    nameLower.includes("kupon") ||
    nameLower.includes("çanta") ||
    nameLower.includes("indirim çeki")
  ) {
    return "Promosyon";
  }
  
  return null;
}
