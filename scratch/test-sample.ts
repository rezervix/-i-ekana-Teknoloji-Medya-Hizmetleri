import "dotenv/config";
import { executeDeterministicKnowledgeEngine } from "../src/lib/nlp/knowledge-engine";

async function main() {
  const q = "Yahu bizim dükkanda elemanlar WhatsApp'a bakmaktan çıldırdı, Instagram ayrı bi yerde çalıyor. Bunları tek ekranda toplayacaz dediniz de, bu şey mi yani, bütün mesajlar birbirine girip çorbaya dönmesin sonra? Nasıl anlıcaz kimin hangisinden yazdığını?";
  const res = await executeDeterministicKnowledgeEngine(q);
  console.log("=== ANSWER ===");
  console.log(res.answer);
  console.log("=== CONFIDENCE ===", res.confidence, res.confidenceLevel);
  console.log("=== MATCHED EVIDENCE ===");
  console.log(res.matchedEvidence);
}

main().catch(console.error);
