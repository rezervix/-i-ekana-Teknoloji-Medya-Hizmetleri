import "dotenv/config";
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const sqlPath = path.join(process.cwd(), 'prisma/migrations/20261015180000_add_social_media_applications/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Applying social media applications migration to database...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Social media applications migration successfully applied!');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
