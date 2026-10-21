import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { chunkText } from "../src/lib/ai/doc-parser";
import { invalidateKnowledgeCache } from "../src/lib/nlp/knowledge-engine";

async function main() {
  const activeDocs = await prisma.knowledgeDocument.findMany({
    where: { status: "ACTIVE" },
  });

  console.log(`Found ${activeDocs.length} active documents to re-chunk.`);

  for (const doc of activeDocs) {
    const textToChunk = doc.cleanContent || doc.rawContent;
    if (!textToChunk) continue;

    const semanticChunks = chunkText(textToChunk, 1000);
    console.log(`Document "${doc.title}": generated ${semanticChunks.length} semantic chunks.`);

    await prisma.$transaction([
      prisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } }),
      prisma.knowledgeChunk.createMany({
        data: semanticChunks.map((c) => ({
          documentId: doc.id,
          chunkIndex: c.chunkIndex,
          content: c.content,
          keywords: c.keywords,
        })),
      }),
      prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: {
          chunkCount: semanticChunks.length,
          updatedAt: new Date(),
        },
      }),
    ]);
  }

  invalidateKnowledgeCache();
  console.log("Re-indexing completed successfully!");
}

main().catch(console.error);
