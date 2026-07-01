/**
 * Centralized media storage.
 *
 * Two backends, picked at module load:
 *
 * 1. **Vercel Blob** — when `BLOB_READ_WRITE_TOKEN` is set (Vercel production
 *    deploy, or any host pointing at @vercel/blob). Files are uploaded to
 *    the `ejs-media/` prefix; the public URL is stored on the Media row.
 *    Content-addressed pathnames make the storage immutable and CDN-friendly.
 *
 * 2. **Local filesystem** — default for self-hosted / Caddy / dev. Files go
 *    to `<project>/var/ejs-uploads/`, NEVER to public/. They are streamed
 *    back through an authenticated API route.
 *
 * The chosen backend's `write` / `read` / `delete` are exposed as the
 * module-level functions `writeUploadFile`, `readUploadFile`,
 * `deleteUploadFile`. Callers do not care which backend is in use.
 */
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ── Config ──────────────────────────────────────────────────────────────────

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DOC_BYTES = 50 * 1024 * 1024;   // 50 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

/** Allowed MIME types. SVG/HTML/XML/executable MIME ranges are explicitly excluded. */
const ALLOWED_MIME = new Set<string>([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4", "video/quicktime",
]);

/** Magic-byte signatures for the most common file types we accept. */
const MAGIC: Array<{ test: (b: Uint8Array) => boolean; mime: string; ext: string }> = [
  { test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, mime: "image/jpeg", ext: "jpg" },
  { test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, mime: "image/png", ext: "png" },
  { test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46, mime: "image/gif", ext: "gif" },
  // WebP: "RIFF....WEBP"
  { test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
            && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
    mime: "image/webp", ext: "webp" },
  // PDF: "%PDF"
  { test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, mime: "application/pdf", ext: "pdf" },
  // ZIP/DOCX/XLSX: "PK\x03\x04"
  { test: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
    mime: "application/octet-stream", ext: "zip" },
  // MP4: "....ftyp" at byte 4
  { test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70, mime: "video/mp4", ext: "mp4" },
  // QuickTime MOV: same ftyp at 4
];

/** Identify file type by inspecting the first bytes. Returns null if unknown/unsupported. */
export function detectFileType(buf: Buffer): { mime: string; ext: string } | null {
  const head = new Uint8Array(buf.buffer, buf.byteOffset, Math.min(buf.byteLength, 16));
  for (const m of MAGIC) {
    if (m.test(head)) return { mime: m.mime, ext: m.ext };
  }
  return null;
}

export function isMimeAllowed(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function maxBytesForMime(mime: string): number {
  if (mime.startsWith("image/")) return MAX_IMAGE_BYTES;
  if (mime.startsWith("video/")) return MAX_VIDEO_BYTES;
  return MAX_DOC_BYTES;
}

// ── Backend interface ──────────────────────────────────────────────────────

export interface MediaStorage {
  /** Store a file. Returns the storage handle (pathname for blob, filename for local). */
  write(id: string, ext: string, buf: Buffer, mime: string): Promise<string>;
  /** Read a file by its handle. Returns Buffer + size. */
  read(handle: string): Promise<{ buf: Buffer; size: number }>;
  /** Delete a file by its handle. Best-effort; never throws. */
  delete(handle: string): Promise<void>;
  /** True if this is a remote (CDN-backed) backend. */
  isRemote(): boolean;
}

// ── Local filesystem backend ────────────────────────────────────────────────

export const UPLOAD_ROOT = path.resolve(
  process.env.EJS_UPLOAD_DIR || path.join(process.cwd(), "var", "ejs-uploads"),
);

function resolveUploadPath(relative: string): string {
  const safe = relative.replace(/^[/\\]+/, "");
  const abs = path.resolve(UPLOAD_ROOT, safe);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep) && abs !== UPLOAD_ROOT) {
    throw new Error("path escape detected");
  }
  return abs;
}

const LocalStorage: MediaStorage = {
  async write(id, ext, buf) {
    if (!existsSync(UPLOAD_ROOT)) {
      await mkdir(UPLOAD_ROOT, { recursive: true });
    }
    const filename = `${id}.${ext}`;
    await writeFile(path.join(UPLOAD_ROOT, filename), buf);
    return filename;
  },
  async read(handle) {
    const abs = resolveUploadPath(handle);
    const buf = await readFile(abs);
    return { buf, size: buf.byteLength };
  },
  async delete(handle) {
    try {
      await unlink(resolveUploadPath(handle));
    } catch {
      /* swallow */
    }
  },
  isRemote() {
    return false;
  },
};

// ── Vercel Blob backend ────────────────────────────────────────────────────

const BLOB_PREFIX = "ejs-media/";

const BlobStorage: MediaStorage = {
  async write(id, ext, buf, mime) {
    // Dynamic import so we don't drag @vercel/blob into builds that don't use it.
    const { put } = await import("@vercel/blob");
    const pathname = `${BLOB_PREFIX}${id}.${ext}`;
    const result = await put(pathname, buf, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false, // id is already a uuid, no need
    });
    return result.pathname; // store the blob pathname as the handle
  },
  async read(handle) {
    // For Vercel Blob, the "handle" is the pathname; we resolve it to a URL
    // and fetch. The URL is short-lived (CDN-cached for the configured TTL).
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: handle, limit: 1 });
    if (blobs.length === 0) {
      throw new Error("blob not found");
    }
    const url = blobs[0].url;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`blob fetch ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    return { buf: Buffer.from(ab), size: ab.byteLength };
  },
  async delete(handle) {
    try {
      const { del } = await import("@vercel/blob");
      await del(handle);
    } catch {
      /* swallow */
    }
  },
  isRemote() {
    return true;
  },
};

// ── Backend selection ──────────────────────────────────────────────────────

/**
 * True when we should write to Vercel Blob. Vercel injects
 * BLOB_READ_WRITE_TOKEN automatically when the @vercel/blob integration is
 * enabled on the project. For self-hosting, set the token explicitly if you
 * want to use the same code path.
 */
function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const storage: MediaStorage = useBlob() ? BlobStorage : LocalStorage;

/**
 * Backwards-compatible shims (the original media route uses these names).
 * The handle is whatever the storage backend's `write` returned; for the
 * local backend that's just the filename, for the blob backend it's the
 * blob pathname. Callers store it on Media.filename.
 */
export async function writeUploadFile(
  id: string,
  ext: string,
  buf: Buffer,
  mime: string,
): Promise<string> {
  return storage.write(id, ext, buf, mime);
}

export async function readUploadFile(handle: string): Promise<{ buf: Buffer; size: number }> {
  return storage.read(handle);
}

export async function deleteUploadFile(handle: string): Promise<void> {
  return storage.delete(handle);
}

/** Re-export for compatibility with the file-streaming route. */
export { resolveUploadPath };