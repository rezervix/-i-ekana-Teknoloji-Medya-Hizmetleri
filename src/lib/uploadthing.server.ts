import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { auth } from "@/lib/auth";
// NOTE: Jimp is imported dynamically inside handlers so a failed native-module
// load does NOT crash the entire UploadThing route — uploads still work.
 
const f = createUploadthing();
const utapi = new UTApi();
 
// Auth helper — verify admin session on uploads
async function authGuard() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user?.email || "admin" };
}
 
/** Attempt a best-effort image optimisation and return the buffer.
 *  Returns null if Jimp is unavailable or conversion fails — caller should
 *  fall back to the original file URL in that case. */
async function tryOptimiseImage(buffer: Buffer): Promise<Buffer | null> {
  try {
    // Attempt sharp optimization first (fast, native)
    const sharp = (await import("sharp")).default;
    return await sharp(buffer).webp({ quality: 82 }).toBuffer();
  } catch (sharpErr) {
    console.warn("[uploadthing] Sharp optimization failed or unsupported. Falling back to Jimp...", sharpErr);
    try {
      // Dynamic import so that a Jimp load failure is isolated to this helper
      const Jimp = (await import("jimp")).default;
      const image = await Jimp.read(buffer);
      try {
        return await image.getBufferAsync("image/webp" as any);
      } catch {
        // WebP not supported by this Jimp build — fall back to JPEG
        return await image.getBufferAsync(Jimp.MIME_JPEG);
      }
    } catch (jimpErr) {
      console.error("[uploadthing] Jimp optimization failed too:", jimpErr);
      return null;
    }
  }
}
 
/** Convert the just-uploaded file to WebP, re-upload it to UploadThing,
 *  delete the original (non-WebP) file, and return the new WebP URL.
 *  On any failure, returns the original file's URL unchanged. */
async function optimiseAndReplace(file: { url: string; key: string; name: string }): Promise<string> {
  try {
    const response = await fetch(file.url);
    if (!response.ok) {
      console.warn("[uploadthing] Could not fetch uploaded file for optimisation:", response.status);
      return file.url;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const optimised = await tryOptimiseImage(buffer);
 
    if (!optimised) {
      console.log("[uploadthing] Optimisation skipped, keeping original file.");
      return file.url;
    }
 
    // Build a .webp filename based on the original name
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const webpFile = new File([new Uint8Array(optimised)], `${baseName}.webp`, { type: "image/webp" });
 
    const uploadResult = await utapi.uploadFiles(webpFile);
    if (uploadResult.error || !uploadResult.data) {
      console.error("[uploadthing] Re-upload of WebP file failed:", uploadResult.error);
      return file.url;
    }
 
    const newUrl = uploadResult.data.ufsUrl || uploadResult.data.url;
 
    // Best-effort delete of the original (non-WebP) file — don't fail the
    // whole flow if this errors.
    try {
      await utapi.deleteFiles(file.key);
    } catch (delErr) {
      console.warn("[uploadthing] Could not delete original file after WebP conversion:", delErr);
    }
 
    console.log("[uploadthing] Image converted to WebP:", newUrl, "size:", optimised.length);
    return newUrl;
  } catch (error) {
    console.error("[uploadthing] Optimisation/replace pipeline error:", error);
    return file.url;
  }
}
 
export const ourFileRouter = {
  // General image uploads (blog, projects, team, etc.)
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image upload complete:", file.url);
      return { url: file.url };
    }),
 
  // Product image uploads — automatically converted to WebP. ("Lossless" is
  // not literally possible since WebP itself is the destination format, so
  // quality is kept high at 82 to preserve visual fidelity while shrinking
  // the file size for fast page loads.)
  productImageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const finalUrl = await optimiseAndReplace(file);
      return { url: finalUrl };
    }),
 
  // Design template uploads (front/back images) — same WebP conversion.
  templateImageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 2 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const finalUrl = await optimiseAndReplace(file);
      return { url: finalUrl };
    }),
 
  // Logo uploads for clients/partners marquee (PNG, SVG, WebP)
  logoUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Logo upload complete:", file.url);
      return { url: file.url };
    }),
 
  // Avatar uploads (team, testimonials)
  avatarUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
 
  // Document uploads (PDFs for projects, quotes)
  documentUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
 
  // Design file uploads (PDF, AI, CDR for customer designs)
  designFileUploader: f({ 
    "application/pdf": { maxFileSize: "32MB", maxFileCount: 5 },
    "application/postscript": { maxFileSize: "32MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Design file upload complete:", file.url, "name:", file.name, "size:", file.size);
      return { url: file.url, name: file.name, size: file.size };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
