import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// En sade Prisma başlatma - .env'den otomatik okur
const prisma = new PrismaClient();

async function main() {
  const email = "mrcicekana@cicekanatechmedia.com";
  const password = "mrcicekana47MF";

  try {
    console.log("👉 Süperadmin oluşturma işlemi başlıyor...");
    
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
      create: {
        email,
        name: "Mr. Cicekana",
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });

    console.log("-----------------------------------------");
    console.log("✅ BAŞARILI: Süperadmin hesabı hazır.");
    console.log(`📧 Giriş: ${user.email}`);
    console.log("-----------------------------------------");
  } catch (error: any) {
    console.error("❌ Hata:", error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
