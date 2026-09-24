import { generateReactHelpers, generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing.server";

// Export typed React helpers for client components
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();

// Export typed UploadButton component
export const UploadButton = generateUploadButton<OurFileRouter>();

// Export typed UploadDropzone component
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
