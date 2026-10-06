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
  console.log("[authGuard] Session:", session?.user?.email, "Role:", (session?.user as any)?.role);
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any)?.role)) {
    throw new Error("Unauthorized: Missing session or invalid role");
  }
  return { userId: (session.user as { id?: string })?.id || "admin" };
}

/** Attempt a best-effort image optimisation and return the buffer.
 *  Returns null if Jimp is unavailable or conversion fails — caller should
 *  fall back to the original file URL in that case. */
async function tryOptimiseImage(buffer: Buffer): Promise<Buffer | null> {
  try {
    // Attempt sharp optimization first (fast, native)
    const sharp = (await import("sharp")).default;
    const result = await sharp(buffer).webp({ quality: 82 }).toBuffer();
    console.log("[uploadthing] Sharp WebP conversion successful, size:", result.length);
    return result;
  } catch (sharpErr) {
    console.warn("[uploadthing] Sharp optimization failed or unsupported:", sharpErr);
    try {
      // Dynamic import so that a Jimp load failure is isolated to this helper
      const Jimp = (await import("jimp")).default;
      const image = await Jimp.read(buffer);
      try {
        const result = await image.getBufferAsync("image/webp" as any);
        console.log("[uploadthing] Jimp WebP conversion successful, size:", result.length);
        return result;
      } catch {
        // WebP not supported by this Jimp build — fall back to JPEG
        console.log("[uploadthing] Jimp WebP failed, trying JPEG...");
        const result = await image.getBufferAsync(Jimp.MIME_JPEG);
        console.log("[uploadthing] Jimp JPEG conversion successful, size:", result.length);
        return result;
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
    console.log("[optimiseAndReplace] Starting for file:", file.name, "key:", file.key);
    
    const response = await fetch(file.url);
    if (!response.ok) {
      console.warn("[uploadthing] Could not fetch uploaded file for optimisation:", response.status, response.statusText);
      return file.url;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log("[optimiseAndReplace] File fetched, buffer size:", buffer.length);
    
    const optimised = await tryOptimiseImage(buffer);

    if (!optimised) {
      console.log("[uploadthing] Optimisation skipped, keeping original file.");
      return file.url;
    }

    // Build a .webp filename based on the original name
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const webpFile = new File([new Uint8Array(optimised)], `${baseName}.webp`, { type: "image/webp" });

    console.log("[optimiseAndReplace] Uploading WebP:", `${baseName}.webp`, "size:", optimised.length);
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

    console.log("[uploadthing] Image converted to WebP successfully:", newUrl);
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
      console.log("[productImageUploader] Middleware called - checking auth...");
      const user = await authGuard();
      console.log("[productImageUploader] Auth passed, userId:", user.userId);
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[productImageUploader] Upload complete for:", file.name, "- starting optimization...");
      const finalUrl = await optimiseAndReplace(file);
      console.log("[productImageUploader] Final URL:", finalUrl);
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
