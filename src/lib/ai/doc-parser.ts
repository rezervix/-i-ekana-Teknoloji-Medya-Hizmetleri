import zlib from "zlib";

/**
 * Knowledge Base Document Parser & Chunker
 * Supports Markdown (.md), Plain Text (.txt), Word (.docx), and PDF (.pdf).
 */

export interface ParsedDocument {
  title: string;
  cleanContent: string;
  rawContent: string;
  chunks: {
    chunkIndex: number;
    content: string;
    keywords: string[];
  }[];
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
  // Normalize whitespace
  return sanitized
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extracts plain text from a DOCX buffer (DOCX is a zip file with word/document.xml).
 */
export function extractTextFromDocx(buffer: Buffer): string {
  try {
    // Basic PK zip parsing without heavy external dependencies
    let text = "";
    let offset = 0;

    while (offset < buffer.length - 30) {
      // Local file header signature = 0x04034b50
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
          // Deflated
          xmlData = zlib.inflateRawSync(compressedData).toString("utf8");
        } else if (compressionMethod === 0) {
          // Stored
          xmlData = compressedData.toString("utf8");
        }

        if (xmlData) {
          // Extract text inside <w:t> tags
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
      // Fallback: search for readable text strings if zip decompression didn't match
      text = buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ");
    }

    return text.trim();
  } catch (err) {
    console.warn("[DocParser] DOCX extraction fallback:", err);
    return buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ").trim();
  }
}

/**
 * Extracts text from a PDF buffer by reading text streams and font encodings.
 */
export function extractTextFromPdf(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    let extractedText = "";

    // Find all stream / endstream blocks
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      let decoded = "";

      try {
        // Try inflating FlateDecode
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

      // Extract text in TJ or Tj operators
      const tjMatches = decoded.match(/\((.*?)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const t = tj.replace(/\s*Tj$/, "").replace(/^\(/, "").replace(/\)$/, "");
        extractedText += t + " ";
      }

      // Also match text in arrays [ (text) -12 (more text) ] TJ
      const arrayTjMatches = decoded.match(/\[(.*?)\]\s*TJ/g) || [];
      for (const atj of arrayTjMatches) {
        const parts = atj.match(/\((.*?)\)/g) || [];
        for (const p of parts) {
          extractedText += p.replace(/^\(/, "").replace(/\)$/, "") + " ";
        }
      }
    }

    if (!extractedText.trim()) {
      // Fallback: extract plain ascii and unicode sequences
      extractedText = buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ");
    }

    return extractedText.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.warn("[DocParser] PDF extraction fallback:", err);
    return buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\u017F\n]/g, " ").trim();
  }
}

/**
 * Extracts simple keywords (stemmed Turkish-friendly lowercase words).
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
    "onlar", "tarafından", "üzerine", "göre"
  ]);

  const unique = Array.from(new Set(words.filter((w) => !stopWords.has(w))));
  return unique.slice(0, 50);
}

/**
 * Chunks text intelligently respecting paragraphs and headings.
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 800,
  overlap: number = 100
): { chunkIndex: number; content: string; keywords: string[] }[] {
  const paragraphs = text.split(/\n\s*\n+/);
  const chunks: { chunkIndex: number; content: string; keywords: string[] }[] = [];

  let currentChunk = "";
  let chunkIdx = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    } else {
      if (currentChunk) {
        chunks.push({
          chunkIndex: chunkIdx++,
          content: currentChunk,
          keywords: extractKeywords(currentChunk),
        });
        // Keep an overlap from the tail of currentChunk
        const tail = currentChunk.slice(-overlap);
        currentChunk = tail + "\n\n" + trimmed;
      } else {
        // If single paragraph is larger than maxChunkSize, split by sentence or length
        let start = 0;
        while (start < trimmed.length) {
          const slice = trimmed.slice(start, start + maxChunkSize);
          chunks.push({
            chunkIndex: chunkIdx++,
            content: slice,
            keywords: extractKeywords(slice),
          });
          start += maxChunkSize - overlap;
        }
        currentChunk = "";
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      chunkIndex: chunkIdx++,
      content: currentChunk.trim(),
      keywords: extractKeywords(currentChunk),
    });
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

  return {
    title,
    rawContent,
    cleanContent,
    chunks,
  };
}
