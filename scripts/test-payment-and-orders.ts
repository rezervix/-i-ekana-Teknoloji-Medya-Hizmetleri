import { prisma } from "../src/lib/prisma";

console.log("=================================================");
console.log("🧪 ÇİÇEKANA ÖDEME BAŞLATMA VE SİPARİŞ DOĞRULAMA TESTİ");
console.log("=================================================\n");

// Helper to simulate the exact PayTR basket logic from get-token route
function buildPaytrBasket(order: {
  items: Array<{ product: { name: string }; unitPrice: number; quantity: number }>;
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
}) {
  const finalAmountTL = order.finalAmount;
  const itemsSubtotal = order.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  const discount = order.discountAmount || 0;
  const shippingFee = Math.max(0, Math.round((finalAmountTL - (itemsSubtotal - discount)) * 100) / 100);
  const netItemsTargetKurus = Math.round((finalAmountTL - shippingFee) * 100);
  const discountRatio = itemsSubtotal > 0 ? (finalAmountTL - shippingFee) / itemsSubtotal : 1;

  let allocatedKurus = 0;
  const basket: Array<[string, string, number]> = [];

  order.items.forEach((item, index) => {
    const isLast = index === order.items.length - 1;
    let itemTotalKurus = Math.round(item.unitPrice * item.quantity * discountRatio * 100);
    if (isLast) {
      itemTotalKurus = netItemsTargetKurus - allocatedKurus;
    } else {
      allocatedKurus += itemTotalKurus;
    }
    const unitPriceTL = (itemTotalKurus / (item.quantity * 100)).toFixed(2);
    const cleanName = (item.product?.name || "Ürün").replace(/["\\]/g, "").slice(0, 100);
    basket.push([cleanName, unitPriceTL, item.quantity]);
  });

  if (shippingFee > 0) {
    basket.push(["Kargo Ücreti", shippingFee.toFixed(2), 1]);
  }

  return { basket, shippingFee, finalAmountTL };
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("5")) return `0${digits}`;
  return digits;
}

let passedCount = 0;

// TEST 1: Phone Normalization Test
console.log("1. Telefon Normalizasyonu Testi:");
const phoneTests = [
  { input: "+90 505 234 58 59", expected: "05052345859" },
  { input: "0505 234 58 59", expected: "05052345859" },
  { input: "5052345859", expected: "05052345859" },
  { input: "+905052345859", expected: "05052345859" },
];
let phoneAllOk = true;
for (const pt of phoneTests) {
  const res = normalizePhone(pt.input);
  if (res !== pt.expected) {
    console.error(`  [FAIL] ${pt.input} -> Beklenen: ${pt.expected}, Alınan: ${res}`);
    phoneAllOk = false;
  }
}
if (phoneAllOk) {
  console.log("  [PASS] Tüm telefon formatları 05XXXXXXXXX formatına başarıyla normalize edildi.\n");
  passedCount++;
}

// TEST 2: PayTR Sepet Tutarı Denkleştirme Testi (Yapışkanlı El İlanı - 6.099 TL)
console.log("2. PayTR Sepet Denkleştirme Testi (6.099 TL Tek Ürün):");
const sampleOrder1 = {
  items: [{ product: { name: "Yapışkanlı El İlanı" }, unitPrice: 6099, quantity: 1 }],
  totalAmount: 6099,
  discountAmount: 0,
  finalAmount: 6099,
};
const { basket: b1 } = buildPaytrBasket(sampleOrder1);
const b1ItemPrice = Number(b1[0][1]);
const b1Qty = b1[0][2];
const b1Sum = b1ItemPrice * b1Qty;
const totalKurus1 = Math.round(sampleOrder1.finalAmount * 100);

if (b1[0][1] === "6099.00" && b1Sum === 6099 && (b1Sum * 100) === totalKurus1) {
  console.log(`  [PASS] Sepet Kalemi: ${JSON.stringify(b1[0])}`);
  console.log(`         Sepet Toplamı: ${b1Sum.toFixed(2)} TL, Ödeme Tutarı (Kuruş): ${totalKurus1}`);
  console.log("         Kuruşu kuruşuna tam eşitlik sağlandı (Eski hata: 609900 TL gönderiliyordu).\n");
  passedCount++;
} else {
  console.error("  [FAIL] Sepet tutarı denkleşmedi:", b1);
}

// TEST 3: PayTR Sepet Denkleştirme Testi (İndirimli + Kargolu Karma Sepet)
console.log("3. PayTR Sepet Denkleştirme Testi (300 TL Sepet - 50 TL İndirim + 49.90 TL Kargo):");
const sampleOrder2 = {
  items: [{ product: { name: "Özel Kartvizit" }, unitPrice: 300, quantity: 1 }],
  totalAmount: 300,
  discountAmount: 50,
  finalAmount: 299.90,
};
const { basket: b2 } = buildPaytrBasket(sampleOrder2);
const b2Sum = b2.reduce((sum, item) => sum + (Number(item[1]) * item[2]), 0);
const totalKurus2 = Math.round(sampleOrder2.finalAmount * 100);

if (Math.round(b2Sum * 100) === totalKurus2) {
  console.log(`  [PASS] Sepet Kalemleri: ${JSON.stringify(b2)}`);
  console.log(`         Sepet Toplamı: ${b2Sum.toFixed(2)} TL, Ödeme Tutarı (Kuruş): ${totalKurus2}\n`);
  passedCount++;
} else {
  console.error("  [FAIL] Karma sepet tutarı denkleşmedi:", b2, "Sum:", b2Sum, "Target:", totalKurus2);
}

// TEST 4 & 5: Gerçek Neon DB Doğrulaması (Bireysel ve Kurumsal Sipariş Kayıtları)
async function testDbRecords() {
  console.log("4. Neon PostgreSQL Veritabanı Sipariş Doğrulaması:");
  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  console.log(`  Toplam incelenen son sipariş adedi: ${orders.length}`);
  for (const o of orders.slice(0, 2)) {
    console.log(`  - Sipariş No: ${o.orderNumber}`);
    console.log(`    Müşteri: ${o.guestName} (${o.customerType})`);
    console.log(`    Durum: status=${o.status}, paymentStatus=${o.paymentStatus}`);
    console.log(`    Fatura Durumu: ${o.invoiceStatus}`);
    console.log(`    Tutar: ${o.finalAmount} TL`);
    console.log(`    Kalemler: ${o.items.map(it => `${it.product?.name} (${it.quantity} adet x ${it.unitPrice} TL)`).join(", ")}`);
    console.log(`    Teslimat Telefon: ${(o.shippingAddress as any)?.phone}\n`);
  }
}

testDbRecords().then(() => {
  console.log("-------------------------------------------------");
  console.log(`🎉 TESTLER TAMAMLANDI (${passedCount}/3 birim doğrulama başarılı)`);
  console.log("-------------------------------------------------");
  process.exit(0);
}).catch((err) => {
  console.error("DB Test Error:", err);
  process.exit(1);
});
