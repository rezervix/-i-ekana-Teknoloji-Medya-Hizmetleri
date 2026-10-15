import { prisma } from '../src/lib/prisma';

async function main() {
  const plan = await prisma.plan.findFirst({
    where: { slug: 'scoreform-musteri-deneyimi-itibar-yonetimi' },
    include: { tiers: true },
  });
  console.log(JSON.stringify(plan, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
