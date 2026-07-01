import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guards";
import { readUploadFile, storage } from "@/lib/media-storage";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Streams a media file from non-served storage. The file URL stored in
 * Media.url points here; the previous /public/uploads/<filename> path is gone.
 *
 * On the Vercel Blob backend, we resolve the blob handle to a public URL
 * and 302-redirect. The blob is served by Vercel's edge CDN with the
 * Content-Type set at upload time. This is faster than proxying bytes
 * through a serverless function.
 *
 * On the local filesystem backend, we read the file and stream it back,
 * supporting range requests (needed for video scrubbing).
 *
 * requirePermission("media", "view") is the only way to fetch the bytes.
 * Content-Disposition forces download for non-image types so the browser
 * cannot render them as HTML (defence-in-depth against any future
 * attacker-controlled file that sneaks past magic-byte detection).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("media", "view");
  if (!guard.ok) return guard.response!;

  const { id } = await params;
  const item = await db.media.findUnique({ where: { id } });
  if (!item) return new NextResponse("Not found", { status: 404 });

  // ── Remote (Vercel Blob) backend: resolve to a public URL and 302. ──
  if (storage.isRemote()) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: item.filename, limit: 1 });
      if (blobs.length === 0) {
        return new NextResponse("Missing on storage", { status: 410 });
      }
      const session = await getServerSession(authOptions);
      await logAudit({
        userId: session?.user?.id,
        action: "READ",
        entity: "media",
        entityId: id,
        summary: `تحميل ملف: ${item.originalName}`,
        req,
      });
      return NextResponse.redirect(blobs[0].url, 302);
    } catch (e) {
      return new NextResponse("Storage error", { status: 502 });
    }
  }

  // ── Local backend: stream bytes with range support. ──
  let fh: Buffer;
  let total: number;
  try {
    const r = await readUploadFile(item.filename);
    fh = r.buf;
    total = r.size;
  } catch {
    return new NextResponse("Missing on disk", { status: 410 });
  }

  const range = req.headers.get("range");
  const isImage = item.mimeType.startsWith("image/");
  const disposition = isImage
    ? "inline"
    : `attachment; filename="${encodeURIComponent(item.originalName)}"`;

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : total - 1;
      if (start >= total || end >= total) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
      }
      const slice = fh.subarray(start, end + 1);
      const session = await getServerSession(authOptions);
      await logAudit({
        userId: session?.user?.id,
        action: "READ",
        entity: "media",
        entityId: id,
        summary: `تحميل ملف: ${item.originalName}`,
        req,
      });
      return new NextResponse(slice, {
        status: 206,
        headers: {
          "Content-Type": item.mimeType,
          "Content-Length": String(slice.length),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=60",
        },
      });
    }
  }

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "READ",
    entity: "media",
    entityId: id,
    summary: `تحميل ملف: ${item.originalName}`,
    req,
  });
  return new NextResponse(fh, {
    status: 200,
    headers: {
      "Content-Type": item.mimeType,
      "Content-Length": String(total),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=60",
    },
  });
}