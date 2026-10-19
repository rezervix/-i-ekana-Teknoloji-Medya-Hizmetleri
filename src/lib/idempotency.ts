/**
 * src/lib/idempotency.ts
 *
 * Mükerrer Başvuru Önleme ve İstek Tekilleştirme Mekanizması
 *
 * - Client tarafından iletilen `idempotencyKey` veya `x-idempotency-key` başlığına göre tekilleştirme.
 * - Ağ kopması veya tekrar tıklamalarda aynı sonucun güvenle döndürülmesi.
 * - Kısa süreli (60 saniye) burst tekilleştirme: Aynı IP ve aynı içerik için kontrolsüz mükerrer kayıt oluşumunu engeller.
 * - Farklı zamanlarda yapılan gerçek yeni başvuruları asla engellemez.
 */

export interface IdempotencyRecord {
  id: string;
  response: any;
  status: number;
  createdAt: number;
}

const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000; // 15 dakika geçerlilik
const BURST_DEDUPLICATION_TTL_MS = 45 * 1000; // 45 saniye burst aralığı

class IdempotencyService {
  private keyStore = new Map<string, IdempotencyRecord>();
  private burstStore = new Map<string, { id: string; response: any; timestamp: number }>();

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.keyStore.entries()) {
      if (now - item.createdAt > IDEMPOTENCY_TTL_MS) {
        this.keyStore.delete(key);
      }
    }
    for (const [hash, item] of this.burstStore.entries()) {
      if (now - item.timestamp > BURST_DEDUPLICATION_TTL_MS) {
        this.burstStore.delete(hash);
      }
    }
  }

  /**
   * Belirtilen idempotencyKey ile daha önce tamamlanmış bir işlem olup olmadığını kontrol eder.
   */
  getByKey(key: string): IdempotencyRecord | null {
    if (!key || typeof key !== "string") return null;
    this.cleanup();
    const found = this.keyStore.get(key.trim());
    return found || null;
  }

  /**
   * Başarılı bir işlem sonucunu idempotency anahtarıyla saklar.
   */
  setByKey(key: string, id: string, response: any, status = 201): void {
    if (!key || typeof key !== "string") return;
    this.cleanup();
    this.keyStore.set(key.trim(), {
      id,
      response,
      status,
      createdAt: Date.now(),
    });
  }

  /**
   * Kısa süreli burst isteklerini (örn. 45 sn içinde aynı IP'den gelen özdeş başvuru) kontrol eder.
   */
  checkBurst(fingerprint: string): { duplicate: boolean; id?: string; response?: any } {
    if (!fingerprint) return { duplicate: false };
    this.cleanup();
    const existing = this.burstStore.get(fingerprint);
    if (existing && Date.now() - existing.timestamp < BURST_DEDUPLICATION_TTL_MS) {
      return { duplicate: true, id: existing.id, response: existing.response };
    }
    return { duplicate: false };
  }

  /**
   * Yeni işlenen kaydı burst deposuna kaydeder.
   */
  registerBurst(fingerprint: string, id: string, response: any): void {
    if (!fingerprint) return;
    this.cleanup();
    this.burstStore.set(fingerprint, {
      id,
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Test ortamları için belleği temizleme yardımcısı.
   */
  clear(): void {
    this.keyStore.clear();
    this.burstStore.clear();
  }
}

export const idempotencyService = new IdempotencyService();
