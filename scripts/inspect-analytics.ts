import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Adding UTM columns to Order table safely via SQL...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" 
    ADD COLUMN IF NOT EXISTS "utmSource" TEXT,
    ADD COLUMN IF NOT EXISTS "utmMedium" TEXT,
    ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
    ADD COLUMN IF NOT EXISTS "referrer" TEXT;
  `);

  console.log('Columns added successfully!');

  // Verify
  const cols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Order' AND column_name IN ('utmSource', 'utmMedium', 'utmCampaign', 'referrer');
  `);
  console.log('Verified columns in Order:', cols);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
