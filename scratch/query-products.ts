import "dotenv/config";

// Read password from .env or default to postgres
const envUrl = process.env.DATABASE_URL || "";
let password = "postgres";
const match = envUrl.match(/postgres:\/\/([^:]+):([^@]+)@/);
if (match && match[2]) {
  password = match[2];
}

const prodUrl = `postgresql://postgres:${password}@localhost:5432/cicekana_website?schema=public&client_encoding=UTF8`;

async function testConnection(url: string, name: string) {
  console.log(`\nTesting connection for ${name}...`);
  process.env.DATABASE_URL = url;
  
  // Clean require cache for the prisma module so it gets re-instantiated with the new env var
  delete require.cache[require.resolve("../src/lib/prisma")];
  const { prisma } = await import("../src/lib/prisma");

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
      },
      take: 50,
    });
    console.log(`Connection successful for ${name}!`);
    console.log(`Found ${products.length} products:`);
    console.log(JSON.stringify(products.map(p => ({ name: p.name, category: p.category, subcategory: p.subcategory })), null, 2));
    return true;
  } catch (err: any) {
    console.error(`Connection failed for ${name}:`);
    console.error(err);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const originalUrl = process.env.DATABASE_URL;
  
  // 1. Try env URL (which is localhost:51214)
  const envOk = await testConnection(envUrl, "ENV_URL");
  if (!envOk) {
    // 2. Try Prod 5432 URL
    await testConnection(prodUrl, "PROD_5432_URL");
  }
  
  if (originalUrl) {
    process.env.DATABASE_URL = originalUrl;
  }
}

run();
