import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function main() {
  const sql = fs.readFileSync('prisma/migrations/20261015120000_add_guest_subscription_and_phone_unique/migration.sql', 'utf8');
  console.log('Applying migration to database...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Migration successfully applied to database!');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
