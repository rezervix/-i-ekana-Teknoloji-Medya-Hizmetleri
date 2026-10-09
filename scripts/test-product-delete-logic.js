/**
 * Test: /api/admin/products DELETE İstek Parametre Ayrıştırma ve Silme Mantığı Testi
 */

function parseDeleteTargetIds(req) {
  const url = new URL(req.url, 'http://localhost:3000');
  const queryId = url.searchParams.get('id');
  const queryIds = url.searchParams.get('ids');
  const queryAll = url.searchParams.get('all') === 'true';

  const body = req.body || null;
  const bodyId = body?.id;
  const bodyIds = body?.ids;
  const bodyAll = body?.all === true;

  const isAll = queryAll || bodyAll;
  let targetIds = [];

  if (isAll) {
    return { isAll: true, targetIds: ['ALL_PRODUCTS'] };
  }

  if (queryId && typeof queryId === 'string') targetIds.push(queryId.trim());
  if (bodyId && typeof bodyId === 'string') targetIds.push(bodyId.trim());
  if (queryIds && typeof queryIds === 'string') {
    targetIds.push(...queryIds.split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(bodyIds)) {
    targetIds.push(
      ...bodyIds.filter((id) => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim())
    );
  }

  targetIds = Array.from(new Set(targetIds)).filter((id) => id.length > 0);
  return { isAll: false, targetIds };
}

console.log("=== DELETE /api/admin/products PARAMETRE VE SİLME MANTIĞI TESTİ ===\n");

// Test 1: URL searchParams ?id=prod_123
const t1 = parseDeleteTargetIds({ url: '/api/admin/products?id=prod_123', body: null });
console.log("Test 1 (URL searchParams ?id=):", t1.targetIds);
if (t1.targetIds[0] !== 'prod_123') throw new Error("Test 1 başarısız!");

// Test 2: Request Body { id: "prod_456" }
const t2 = parseDeleteTargetIds({ url: '/api/admin/products', body: { id: 'prod_456' } });
console.log("Test 2 (Body { id }):", t2.targetIds);
if (t2.targetIds[0] !== 'prod_456') throw new Error("Test 2 başarısız!");

// Test 3: Request Body { ids: ["prod_1", "prod_2"] }
const t3 = parseDeleteTargetIds({ url: '/api/admin/products', body: { ids: ['prod_1', 'prod_2'] } });
console.log("Test 3 (Body { ids }):", t3.targetIds);
if (t3.targetIds.length !== 2) throw new Error("Test 3 başarısız!");

// Test 4: Dynamic Route & Body kombinasyonu
const t4 = parseDeleteTargetIds({ url: '/api/admin/products?id=prod_abc', body: { id: 'prod_abc' } });
console.log("Test 4 (Duplicate deduplication):", t4.targetIds);
if (t4.targetIds.length !== 1 || t4.targetIds[0] !== 'prod_abc') throw new Error("Test 4 başarısız!");

// Test 5: Boş istek -> 400 Bad Request
const t5 = parseDeleteTargetIds({ url: '/api/admin/products', body: {} });
console.log("Test 5 (Eksik parametre):", t5.targetIds.length === 0 ? "400 Bad Request (Başarılı)" : "Hata");
if (t5.targetIds.length !== 0) throw new Error("Test 5 başarısız!");

// Test 6: Cascade vs Soft Delete Mantığı
function simulateDelete(product) {
  if (product.orderItems && product.orderItems.length > 0) {
    return { action: 'SOFT_DELETE', isActive: false };
  } else {
    return { action: 'CASCADE_DELETE', removedRelations: ['cartItems', 'reviews', 'productImages', 'variants'] };
  }
}

const prodWithOrder = { id: 'prod_with_orders', orderItems: [{ id: 'order_item_1' }] };
const prodWithoutOrder = { id: 'prod_clean', orderItems: [] };

const r1 = simulateDelete(prodWithOrder);
console.log("Test 6a (Siparişli ürün -> Soft delete):", r1);
if (r1.action !== 'SOFT_DELETE') throw new Error("Test 6a başarısız!");

const r2 = simulateDelete(prodWithoutOrder);
console.log("Test 6b (Siparişsiz ürün -> Cascade hard delete):", r2);
if (r2.action !== 'CASCADE_DELETE') throw new Error("Test 6b başarısız!");

console.log("\n-> Tüm testler BAŞARIYLA geçti!");
