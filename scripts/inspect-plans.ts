import { prisma } from '../src/lib/prisma';

async function main() {
  const plans = await prisma.plan.findMany({
    include: { tiers: true },
  });
  console.log("PLANS COUNT:", plans.length);
  for (const p of plans) {
    console.log(`- ${p.name} (slug: ${p.slug}, active: ${p.isActive}) - ${p.tiers.length} tiers`);
    console.log(`  stats:`, p.stats);
    console.log(`  benefits count:`, Array.isArray(p.benefits) ? p.benefits.length : 0);
    console.log(`  faqs count:`, Array.isArray(p.faqs) ? p.faqs.length : 0);
  }
}

main().catch(console.error).finally(() => process.exit(0));
