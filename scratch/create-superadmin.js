require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const dbUrl = process.env.DATABASE_URL;
const options = {};
if (dbUrl) {
  options.accelerateUrl = dbUrl;
}

const prisma = new PrismaClient(options);

async function main() {
  const email = "mrcicekana@cicekanatechmedia.com";
  const password = "mrcicekana47MF";
  const name = "Mr. Cicekana (Super Admin)";

  try {
    console.log(`İşlem başlatılıyor...`);
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
        name,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });

    console.log("-----------------------------------------");
    console.log("🚀 SUPER ADMIN OLUŞTURULDU");
    console.log(`👤 E-posta: ${user.email}`);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Hata:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
