import path from "path";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName || "file");
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export function isAllowedUploadMime(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimetype);
}

export function buildStorageKey(
  prefix: string,
  userId: string,
  originalName: string,
): string {
  return `${prefix}/${userId}/${Date.now()}-${sanitizeFilename(originalName)}`;
}
