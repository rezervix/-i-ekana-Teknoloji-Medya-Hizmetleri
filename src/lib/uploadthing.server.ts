import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { auth } from "@/lib/auth";

// NOTE: Jimp is imported dynamically inside handlers so a failed native-module
// load does NOT crash the entire UploadThing route — uploads still work.

const f = createUploadthing();

// Safely initialize UTApi - validate env variables first
function getUtapi() {
  const secret = process.env.UPLOADTHING_SECRET;
  const appId = process.env.UPLOADTHING_APP_ID;
  
  if (!secret || secret.includes("sk_live_your_secret_here") || !appId || appId.includes("your_app_id_here")) {
    console.error("[UploadThing] CRITICAL: UploadThing credentials not properly configured!");
    console.error("[UploadThing] Set UPLOADTHING_SECRET and UPLOADTHING_APP_ID environment variables");
  }
  
  return new UTApi();
}

const utapi = getUtapi();

// Auth helper — verify admin session on uploads
async function authGuard() {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("No session found");
    }
    const role = (session.user as any)?.role;
    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      throw new Error(`Invalid role: ${role}. Expected SUPER_ADMIN or ADMIN`);
    }
    return { userId: (session.user as { id?: string })?.id || "admin" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[uploadthing] Auth guard failed:", message);
    throw new Error(`Authentication failed: ${message}`);
  }
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
    console.warn("[uploadthing] Sharp optimization failed:", sharpErr instanceof Error ? sharpErr.message : sharpErr);
    try {
      // Dynamic import so that a Jimp load failure is isolated to this helper
      const Jimp = (await import("jimp")).default;
      const image = await Jimp.read(buffer);
      try {
        const result = await image.getBufferAsync("image/webp" as any);
        console.log("[uploadthing] Jimp WebP conversion successful, size:", result.length);
        return result;
      } catch (webpErr) {
        // WebP not supported by this Jimp build — fall back to JPEG
        console.log("[uploadthing] Jimp WebP failed, trying JPEG...");
        const result = await image.getBufferAsync(Jimp.MIME_JPEG);
        console.log("[uploadthing] Jimp JPEG conversion successful, size:", result.length);
        return result;
      }
    } catch (jimpErr) {
      console.error("[uploadthing] Both Sharp and Jimp failed:", jimpErr instanceof Error ? jimpErr.message : jimpErr);
      return null;
    }
  }
}

/** Convert the just-uploaded file to WebP, re-upload it to UploadThing,
 *  delete the original (non-WebP) file, and return the new WebP URL.
 *  On any failure, returns the original file's URL unchanged. */
async function optimiseAndReplace(file: { url: string; key: string; name: string }): Promise<string> {
  try {
    console.log("[optimiseAndReplace] Starting for file:", file.name, "from URL:", file.url?.substring(0, 50) + "...");
    
    // Step 1: Fetch the uploaded file
    let response: Response;
    try {
      response = await fetch(file.url, { 
        headers: { 
          "User-Agent": "Next.js-Server/1.0",
          "Accept": "image/*"
        } 
      });
    } catch (fetchErr) {
      console.error("[uploadthing] Failed to fetch uploaded file:", fetchErr instanceof Error ? fetchErr.message : fetchErr);
      return file.url; // Return original URL if fetch fails
    }
    
    if (!response.ok) {
      console.warn("[uploadthing] File fetch returned non-200 status:", response.status, response.statusText);
      return file.url;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("[optimiseAndReplace] File fetched successfully, buffer size:", buffer.length);
    
    // Step 2: Optimize the image
    const optimised = await tryOptimiseImage(buffer);

    if (!optimised) {
      console.log("[uploadthing] Optimisation skipped (conversion returned null), keeping original file");
      return file.url;
    }

    // Step 3: Prepare WebP file for re-upload
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const webpFileName = `${baseName}.webp`;
    const webpFile = new File([new Uint8Array(optimised)], webpFileName, { type: "image/webp" });
    console.log("[optimiseAndReplace] WebP file prepared:", webpFileName, "size:", optimised.length);

    // Step 4: Re-upload the WebP file to UploadThing
    console.log("[optimiseAndReplace] Re-uploading WebP to UploadThing...");
    let uploadResult;
    try {
      uploadResult = await utapi.uploadFiles(webpFile);
    } catch (uploadErr) {
      console.error("[uploadthing] UTApi.uploadFiles failed:", uploadErr instanceof Error ? uploadErr.message : uploadErr);
      console.log("[uploadthing] Falling back to original URL");
      return file.url;
    }
    
    if (uploadResult.error) {
      console.error("[uploadthing] Re-upload returned error:", uploadResult.error);
      console.log("[uploadthing] Falling back to original URL");
      return file.url;
    }
    
    if (!uploadResult.data) {
      console.error("[uploadthing] Re-upload succeeded but no data returned");
      console.log("[uploadthing] Falling back to original URL");
      return file.url;
    }

    const newUrl = uploadResult.data.ufsUrl || uploadResult.data.url;
    if (!newUrl) {
      console.error("[uploadthing] Upload data has no URL field");
      console.log("[uploadthing] Falling back to original URL");
      return file.url;
    }

    // Step 5: Delete the original (non-WebP) file
    console.log("[optimiseAndReplace] Attempting to delete original file with key:", file.key);
    try {
      await utapi.deleteFiles(file.key);
      console.log("[uploadthing] Original file deleted successfully");
    } catch (delErr) {
      console.warn("[uploadthing] Could not delete original file (non-critical):", delErr instanceof Error ? delErr.message : delErr);
    }

    console.log("[uploadthing] Image conversion complete. Original:", file.url?.substring(0, 50) + "... → New:", newUrl?.substring(0, 50) + "...");
    return newUrl;
  } catch (error) {
    console.error("[uploadthing] FATAL: Optimisation/replace pipeline error:", error instanceof Error ? error.stack : error);
    console.log("[uploadthing] Falling back to original URL");
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
      console.log("[imageUploader] Upload complete:", file.url);
      return { url: file.url };
    }),

  // Product image uploads — automatically converted to WebP.
  productImageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async () => {
      console.log("[productImageUploader] Middleware: Starting authentication check...");
      const user = await authGuard();
      console.log("[productImageUploader] Middleware: Auth passed");
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[productImageUploader] onUploadComplete: File upload complete for:", file.name);
      try {
        const finalUrl = await optimiseAndReplace(file);
        console.log("[productImageUploader] onUploadComplete: Optimization finished, returning:", finalUrl?.substring(0, 50) + "...");
        return { url: finalUrl };
      } catch (error) {
        console.error("[productImageUploader] onUploadComplete: Unexpected error during optimization:", error instanceof Error ? error.message : error);
        console.log("[productImageUploader] onUploadComplete: Falling back to original URL");
        return { url: file.url };
      }
    }),

  // Design template uploads (front/back images) — same WebP conversion.
  templateImageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 2 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const finalUrl = await optimiseAndReplace(file);
        return { url: finalUrl };
      } catch (error) {
        console.error("[templateImageUploader] Optimization failed:", error instanceof Error ? error.message : error);
        return { url: file.url };
      }
    }),

  // Logo uploads for clients/partners (PNG, SVG, WebP) — no conversion
  logoUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[logoUploader] Upload complete:", file.url);
      return { url: file.url };
    }),

  // Avatar uploads (team, testimonials) — no conversion
  avatarUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[avatarUploader] Upload complete:", file.url);
      return { url: file.url };
    }),

  // Document uploads (PDFs for projects, quotes)
  documentUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authGuard();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[documentUploader] Upload complete:", file.url);
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
      console.log("[designFileUploader] Upload complete:", file.url, "name:", file.name, "size:", file.size);
      return { url: file.url, name: file.name, size: file.size };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
