import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
} as any);

async function main() {
  const email = "admin@cicekanatechmedia.com";
  const password = "admin123456";
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash,
      role: "SUPER_ADMIN" as any,
      isActive: true
    }
  });

  console.log("-----------------------------------------");
  console.log("Admin account created successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error creating admin:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
