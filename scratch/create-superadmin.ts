import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Prisma 7 "Client Engine" uyumluluğu için bağlantı mantığı
const dbUrl = process.env.DATABASE_URL;
const options: any = {};

if (dbUrl) {
  // Prisma 7 requirement for certain engine types
  options.accelerateUrl = dbUrl;
}

const prisma = new PrismaClient(options);

async function main() {
  const email = "mrcicekana@cicekanatechmedia.com";
  const password = "mrcicekana47MF";
  const name = "Mr. Cicekana (Super Admin)";

  try {
    console.log(`Bağlantı kontrol ediliyor...`);
    
    // Şifreyi hashle
    const passwordHash = await bcrypt.hash(password, 12);

    // Kullanıcıyı oluştur veya güncelle
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
      create: {
        email,
        name,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });

    console.log("-----------------------------------------");
    console.log("🚀 SUPER ADMIN KULLANICISI BAŞARIYLA OLUŞTURULDU");
    console.log(`👤 E-posta: ${user.email}`);
    console.log(`🔑 Rol: ${user.role}`);
    console.log("-----------------------------------------");
  } catch (error: any) {
    console.error("❌ Hata oluştu:", error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
