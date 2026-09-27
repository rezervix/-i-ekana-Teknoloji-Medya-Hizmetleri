import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// Prisma 7 configuration
const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
} as any);

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isActive: true,
    }
  });
  console.log("USERS_LIST_START");
  console.log(JSON.stringify(users, null, 2));
  console.log("USERS_LIST_END");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
