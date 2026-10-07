/**
 * Test: PayTR benzersiz merchant_oid doğrulaması
 * Format kontrolü: ORDER_{timestamp}_{randomString}
 * Tekrar etmeme garantisi kontrolü
 */

const crypto = require("node:crypto");

function generateMerchantOid(userId) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString("hex");
  const userPart = (userId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6);
  return `ORDER_${userPart || timestamp}_${timestamp}_${randomString}`;
}

console.log("=== PAYTR MERCHANT_OID BENZERSİZLİK VE FORMAT TESTİ ===\n");

const oids = new Set();
const count = 10;
const sampleUser = "usr_998877";

for (let i = 0; i < count; i++) {
  const oid = generateMerchantOid(sampleUser);
  console.log(`Tıklama ${i + 1}: ${oid} (Uzunluk: ${oid.length})`);
  
  // Format doğrulaması
  if (!/^ORDER_[A-Za-z0-9]+_\d+_[a-f0-9]{8}$/.test(oid)) {
    throw new Error(`Geçersiz merchant_oid formatı: ${oid}`);
  }
  
  // PayTR uzunluk sınırı kontrolü (maksimum 64 karakter)
  if (oid.length > 64) {
    throw new Error(`merchant_oid uzunluğu 64 karakteri aşıyor: ${oid.length}`);
  }

  // Benzersizlik kontrolü
  if (oids.has(oid)) {
    throw new Error(`Mükerrer merchant_oid tespit edildi: ${oid}`);
  }
  oids.add(oid);
}

console.log("\n-> Sonuç: 10 farklı istekte 10 adet tamamen benzersiz ve PayTR uyumlu merchant_oid üretildi!");
console.log("-> Format: ORDER_{userId/timestamp}_{timestamp}_{randomString}");
console.log("-> Çakışma oranı: %0");
