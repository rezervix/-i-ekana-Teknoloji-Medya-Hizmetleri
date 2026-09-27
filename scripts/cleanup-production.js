require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const getPrismaClient = () => {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
};

const prisma = getPrismaClient();

async function cleanup() {
  console.log("🚀 Üretim Öncesi Temizlik İşlemi Başlatıldı...");

  try {
    // 1. Transactional Data
    console.log("- Siparişler siliniyor...");
    await prisma.orderItem.deleteMany({});
    const orders = await prisma.order.deleteMany({});
    
    console.log("- Sepet verileri temizleniyor...");
    await prisma.cartItem.deleteMany({});
    await prisma.cartAbandonmentLog.deleteMany({});
    
    console.log("- Müşteri talepleri siliniyor...");
    await prisma.leadNote.deleteMany({});
    await prisma.lead.deleteMany({});
    
    console.log("- Teklifler ve yorumlar temizleniyor...");
    await prisma.quoteItem.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.review.deleteMany({});

    // 2. Content Data
    console.log("- Blog yazıları ve projeler temizleniyor...");
    await prisma.blogPost.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.testimonial.deleteMany({});
    await prisma.faq.deleteMany({});

    // 3. Products (Keep scraped, delete test)
    console.log("- Test ürünleri ayıklanıyor...");
    const deletedProducts = await prisma.product.deleteMany({
      where: {
        OR: [
          { name: { contains: "Test", mode: 'insensitive' } },
          { name: { contains: "Dummy", mode: 'insensitive' } },
          { name: { contains: "Örnek", mode: 'insensitive' } },
          { slug: { contains: "test", mode: 'insensitive' } },
          { slug: { contains: "dummy", mode: 'insensitive' } }
        ]
      }
    });

    console.log(`\n✅ TEMİZLİK TAMAMLANDI.`);
    console.log(`-----------------------------`);
    console.log(`Silinen Sipariş: ${orders.count}`);
    console.log(`Silinen Test Ürünü: ${deletedProducts.count}`);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('Can\'t reach database')) {
      console.error("\n❌ HATA: Veritabanına bağlanılamadı. Lütfen PostgreSQL servisinizin (Port: 51214) çalıştığından emin olun.");
    } else {
      console.error("❌ Temizlik sırasında hata oluştu:", error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
