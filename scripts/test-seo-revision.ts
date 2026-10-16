import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { prisma } from "../src/lib/prisma";
import { buildPlanJsonLd, buildAIAutomationListJsonLd, DEFAULT_SITE_URL } from "../src/lib/seo-schema";

async function test() {
  console.log("=== 1. TESTING ROBOTS.TS ===");
  const robotsConfig = robots();
  console.log("Robots rules count:", Array.isArray(robotsConfig.rules) ? robotsConfig.rules.length : 1);
  console.log("Robots sitemap:", robotsConfig.sitemap);
  console.log("Robots sample rule:", JSON.stringify(robotsConfig.rules, null, 2));

  console.log("\n=== 2. TESTING DYNAMIC SITEMAP.TS ===");
  const sm = await sitemap();
  console.log(`Total URLs in sitemap: ${sm.length}`);

  const aiUrls = sm.filter((entry) => entry.url.includes("/services/ai-automation"));
  console.log("AI Automation URLs in sitemap:");
  aiUrls.forEach((entry) => console.log(`  - [${entry.priority}] ${entry.url} (changeFreq: ${entry.changeFrequency})`));

  const hasMidvem = sm.some((entry) => entry.url.includes("midvem"));
  const hasMsCallCenter = sm.some((entry) => entry.url.includes("microsoft-call-center-ai"));
  const hasAIParent = sm.some((entry) => entry.url.endsWith("/services/ai-automation"));

  console.log(`\nVerification:`);
  console.log(`- Midvem in sitemap: ${hasMidvem}`);
  console.log(`- Microsoft Call Center in sitemap: ${hasMsCallCenter}`);
  console.log(`- /services/ai-automation in sitemap: ${hasAIParent}`);

  console.log("\n=== 3. TESTING MIDVEM JSON-LD SCHEMA ===");
  const midvem = await prisma.plan.findFirst({
    where: { slug: { contains: "midvem" } },
    include: { tiers: true },
  });

  if (!midvem) {
    console.error("Midvem not found in DB!");
    return;
  }

  const jsonLd = buildPlanJsonLd(midvem as any, DEFAULT_SITE_URL);
  console.log("Midvem JSON-LD generated successfully!");
  console.log("Context:", jsonLd["@context"]);
  console.log("Graph types:", jsonLd["@graph"].map((item: any) => item["@type"]));

  console.log("\n--- Full Midvem JSON-LD Output ---");
  console.log(JSON.stringify(jsonLd, null, 2));
}

test()
  .catch(console.error)
  .finally(() => process.exit(0));
