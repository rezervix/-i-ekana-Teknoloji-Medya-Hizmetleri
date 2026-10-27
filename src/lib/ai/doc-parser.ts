import zlib from "zlib";

/**
 * Knowledge Base Document Parser & Semantic Chunker
 * Supports Markdown (.md), Plain Text (.txt), Word (.docx), and PDF (.pdf).
 * 
 * Features:
 * - Semantic section & heading preservation (never cuts sentences or bullet lists mid-stream)
 * - Automatic detection and extraction of structured Q&As (e.g. Soru X: ... Cevap: ...)
 * - Contextual section tagging ([Bölüm: 3.1. Çok Kanallı Ortak Gelen Kutusu])
 * - Preamble / cover title flagging so introductory boilerplates don't outrank substantive features
 */

export interface ParsedQAPair {
  question: string;
  answer: string;
  sectionTitle?: string;
  category?: string;
}

export interface ParsedChunk {
  chunkIndex: number;
  sectionTitle: string;
  content: string;
  keywords: string[];
  isPreamble: boolean;
  chunkType: "qa" | "feature" | "table" | "preamble" | "general";
}

export interface ParsedDocument {
  title: string;
  cleanContent: string;
  rawContent: string;
  chunks: ParsedChunk[];
  extractedQAs: ParsedQAPair[];
}

// Prompt injection patterns to neutralize in untrusted document uploads
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /system\s*prompt/gi,
  /you\s+are\s+now\s+an?\s+unrestricted/gi,
  /tüm\s+(önceki\s+)?talimatları\s+(yok\s+say|unut)/gi,
  /sen\s+artık\s+kısıtlamasız/gi,
  /api[_\s-]?key/gi,
  /gizli\s+anahtar/gi,
  /admin\s+şifresi/gi,
];

export function sanitizeDocContent(text: string): string {
  let sanitized = text;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[ENGELENDİ]");
  }
  return sanitized
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extracts plain text from a DOCX buffer.
 */
export function extractTextFromDocx(buffer: Buffer): string {
  try {
    let text = "";
    let offset = 0;

    while (offset < buffer.length - 30) {
      if (buffer.readUInt32LE(offset) !== 0x04034b50) {
        offset++;
        continue;
      }

      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const fileNameStart = offset + 30;
      const fileName = buffer.toString("utf8", fileNameStart, fileNameStart + fileNameLength);
      const dataStart = fileNameStart + fileNameLength + extraFieldLength;

      if (fileName === "word/document.xml") {
        const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
        let xmlData = "";

        if (compressionMethod === 8) {
          xmlData = zlib.inflateRawSync(compressedData).toString("utf8");
        } else if (compressionMethod === 0) {
          xmlData = compressedData.toString("utf8");
        }

        if (xmlData) {
          const textMatches = xmlData.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (textMatches) {
            text = textMatches
              .map((tag) => tag.replace(/<[^>]+>/g, ""))
              .join(" ");
          }
        }
        break;
      }

      offset = dataStart + compressedSize;
    }

    if (!text) {
      text = buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ");
    }

    return text.trim();
  } catch (err) {
    console.warn("[DocParser] DOCX extraction fallback:", err);
    return buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ").trim();
  }
}

/**
 * Extracts text from a PDF buffer.
 */
export function extractTextFromPdf(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    let extractedText = "";

    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      let decoded = "";

      try {
        const streamBuffer = Buffer.from(streamContent, "latin1");
        decoded = zlib.inflateSync(streamBuffer).toString("utf8");
      } catch {
        try {
          const streamBuffer = Buffer.from(streamContent, "latin1");
          decoded = zlib.inflateRawSync(streamBuffer).toString("utf8");
        } catch {
          decoded = streamContent;
        }
      }

      const tjMatches = decoded.match(/\((.*?)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const t = tj.replace(/\s*Tj$/, "").replace(/^\(/, "").replace(/\)$/, "");
        extractedText += t + " ";
      }

      const arrayTjMatches = decoded.match(/\[(.*?)\]\s*TJ/g) || [];
      for (const atj of arrayTjMatches) {
        const parts = atj.match(/\((.*?)\)/g) || [];
        for (const p of parts) {
          extractedText += p.replace(/^\(/, "").replace(/\)$/, "") + " ";
        }
      }
    }

    if (!extractedText.trim()) {
      extractedText = buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ");
    }

    return extractedText.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.warn("[DocParser] PDF extraction fallback:", err);
    return buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ").trim();
  }
}

/**
 * Extracts Turkish-friendly keywords.
 */
export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const stopWords = new Set([
    "ve", "ile", "bir", "bu", "şu", "için", "gibi", "kadar", "olan", "daha",
    "çok", "ama", "fakat", "lakin", "ancak", "veya", "ya", "hem", "de", "da",
    "ise", "ki", "mi", "mı", "mu", "mü", "ne", "nasıl", "neden", "biz", "siz",
    "onlar", "tarafından", "üzerine", "göre", "yani", "olarak"
  ]);

  const unique = Array.from(new Set(words.filter((w) => !stopWords.has(w))));
  return unique.slice(0, 50);
}

/**
 * Automatically extracts structured Q&A pairs from text.
 * Matches patterns:
 * Soru \d+: ... \n Cevap: ...
 * or ### Soru: ... \n Cevap: ...
 */
export function extractQAPairsFromText(text: string): ParsedQAPair[] {
  const qas: ParsedQAPair[] = [];
  const lines = text.split("\n");

  let currentQuestion = "";
  let currentAnswer = "";
  let isCollectingAnswer = false;

  const questionRegex = /^(?:#{1,4}\s*)?(?:Soru\s*\d*[:.]?|Q\s*[:.]?)\s*(.+)$/i;
  const answerRegex = /^(?:#{1,4}\s*)?(?:Cevap\s*[:.]?|A\s*[:.]?)\s*(.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const qMatch = trimmed.match(questionRegex);
    const aMatch = trimmed.match(answerRegex);

    if (qMatch) {
      // Save previous QA if exists
      if (currentQuestion && currentAnswer) {
        qas.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.trim(),
        });
      }
      currentQuestion = qMatch[1].trim();
      currentAnswer = "";
      isCollectingAnswer = false;
    } else if (aMatch) {
      currentAnswer = aMatch[1].trim();
      isCollectingAnswer = true;
    } else if (isCollectingAnswer) {
      if (trimmed.startsWith("#") || trimmed.startsWith("Kategori") || trimmed.startsWith("---")) {
        // Section end
        if (currentQuestion && currentAnswer) {
          qas.push({
            question: currentQuestion.trim(),
            answer: currentAnswer.trim(),
          });
          currentQuestion = "";
          currentAnswer = "";
        }
        isCollectingAnswer = false;
      } else if (trimmed) {
        currentAnswer += "\n" + trimmed;
      }
    }
  }

  if (currentQuestion && currentAnswer) {
    qas.push({
      question: currentQuestion.trim(),
      answer: currentAnswer.trim(),
    });
  }

  return qas;
}

/**
 * Intelligent semantic chunking respecting section headings, paragraphs, and lists.
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 1000
): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const lines = text.split("\n");

  let currentSectionTitle = "Genel";
  let currentBlock = "";
  let chunkIdx = 0;

  // Regex to detect markdown or numbered section headings
  const headingRegex = /^(?:#{1,4}\s+|(?:\d+\.)+\s+)([^\n]+)$/;

  const flushCurrentBlock = () => {
    const trimmed = currentBlock.trim();
    if (!trimmed || trimmed.length < 20) {
      currentBlock = "";
      return;
    }

    const isPreamble =
      chunkIdx === 0 ||
      trimmed.includes("Ürünün Adı ve Kısa Tanımı") ||
      trimmed.includes("Müşteri Bilgi Tabanı ve Ürün Dokümantasyonu") ||
      trimmed.includes("1. Ürünün Adı");

    let chunkType: ParsedChunk["chunkType"] = "general";
    if (isPreamble) {
      chunkType = "preamble";
    } else if (trimmed.includes("Soru") && trimmed.includes("Cevap")) {
      chunkType = "qa";
    } else if (trimmed.includes("Özelliğin Amacı") || trimmed.includes("Müşteriye Sağladığı Fayda")) {
      chunkType = "feature";
    } else if (trimmed.includes("|") && trimmed.includes("---")) {
      chunkType = "table";
    }

    chunks.push({
      chunkIndex: chunkIdx++,
      sectionTitle: currentSectionTitle,
      content: trimmed,
      keywords: extractKeywords(trimmed),
      isPreamble,
      chunkType,
    });

    currentBlock = "";
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.trim().match(headingRegex);

    if (headingMatch && line.trim().length < 120) {
      // Flush previous block before starting a new section
      if (currentBlock.trim().length > 100) {
        flushCurrentBlock();
      }
      currentSectionTitle = headingMatch[1].trim();
      currentBlock += (currentBlock ? "\n\n" : "") + `[Bölüm: ${currentSectionTitle}]\n` + line;
      continue;
    }

    // Check size limit: only flush on paragraph break (empty line), never inside a sentence
    if (currentBlock.length > maxChunkSize && line.trim() === "") {
      flushCurrentBlock();
      continue;
    }

    currentBlock += (currentBlock ? "\n" : "") + line;
  }

  if (currentBlock.trim()) {
    flushCurrentBlock();
  }

  return chunks;
}

/**
 * Main parse entry point
 */
export async function parseKnowledgeFile(
  fileName: string,
  buffer: Buffer
): Promise<ParsedDocument> {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  let rawContent = "";

  if (ext === "md" || ext === "txt") {
    rawContent = buffer.toString("utf8");
  } else if (ext === "docx") {
    rawContent = extractTextFromDocx(buffer);
  } else if (ext === "pdf") {
    rawContent = extractTextFromPdf(buffer);
  } else {
    throw new Error(`UNSUPPORTED_FILE_TYPE: '.${ext}' uzantısı desteklenmemektedir. Lütfen .md, .txt, .pdf veya .docx yükleyin.`);
  }

  if (!rawContent || rawContent.trim().length === 0) {
    throw new Error("EMPTY_DOCUMENT: Yüklenen belgeden okunabilir metin çıkarılamadı.");
  }

  const cleanContent = sanitizeDocContent(rawContent);

  // Derive a nice title from filename or first markdown heading
  let title = fileName.replace(/\.[^/.]+$/, "");
  const firstHeading = cleanContent.match(/^#\s+(.+)$/m);
  if (firstHeading && firstHeading[1]) {
    title = firstHeading[1].trim();
  }

  const chunks = chunkText(cleanContent);
  const extractedQAs = extractQAPairsFromText(cleanContent);

  return {
    title,
    rawContent,
    cleanContent,
    chunks,
    extractedQAs,
  };
}
