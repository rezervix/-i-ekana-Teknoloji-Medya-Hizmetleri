require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "mrcicekana@cicekanatechmedia.com";
  const password = "mrcicekana47MF";

  try {
    console.log("İşlem başlatılıyor...");
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
    console.log("✅ BAŞARILI: Kullanıcı oluşturuldu.");
    console.log(`📧 E-posta: ${user.email}`);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Hata:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
