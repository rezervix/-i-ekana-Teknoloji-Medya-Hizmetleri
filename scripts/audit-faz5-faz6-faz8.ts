import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== FAZ 5, FAZ 6, FAZ 8 ALTYAPI DENETİMİ ===\n');

  // 1. Veritabanındaki Funnel Tabloları
  try {
    const funnelTables: any = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%funnel%'"
    );
    console.log('1. Funnel Tabloları:', funnelTables);
    if (funnelTables.length > 0) {
      const count: any = await prisma.$queryRawUnsafe("SELECT COUNT(*) FROM funnel_events");
      console.log('   funnel_events kayıt sayısı:', count[0]?.count);
    }
  } catch (err: any) {
    console.log('1. Funnel tablosu sorgu hatası:', err.message);
  }

  // 2. Terk Edilmiş Sepet Tablosu
  try {
    const cartTables: any = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%cart%'"
    );
    console.log('2. Cart Tabloları:', cartTables);
  } catch (err: any) {
    console.log('2. Cart tablosu hatası:', err.message);
  }

  // 3. Sipariş Sayısı
  try {
    const orderCount = await prisma.order.count();
    console.log('3. Toplam Sipariş:', orderCount);
  } catch (err: any) {
    console.log('3. Sipariş tablosu hatası:', err.message);
  }

  console.log('\n=== DENETİM TAMAMLANDI ===');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
