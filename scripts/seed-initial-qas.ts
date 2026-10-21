import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { BASELINE_CURATED_QAS } from "../src/lib/nlp/knowledge-engine";

async function seedQAs() {
  console.log("Seeding baseline Q&As into knowledge_qas table...");

  for (const item of BASELINE_CURATED_QAS) {
    const existing = await prisma.knowledgeQA.findFirst({
      where: { question: item.question },
    });

    if (existing) {
      await prisma.knowledgeQA.update({
        where: { id: existing.id },
        data: {
          answer: item.answer,
          category: item.category,
          productId: item.productId || null,
          variations: item.variations,
          isActive: true,
        },
      });
      console.log(`Updated QA: "${item.question.slice(0, 40)}..."`);
    } else {
      await prisma.knowledgeQA.create({
        data: {
          question: item.question,
          answer: item.answer,
          category: item.category,
          productId: item.productId || null,
          variations: item.variations,
          isActive: true,
        },
      });
      console.log(`Created QA: "${item.question.slice(0, 40)}..."`);
    }
  }

  const count = await prisma.knowledgeQA.count();
  console.log(`Total QAs in DB: ${count}`);
}

seedQAs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed QAs error:", err);
    process.exit(1);
  });
