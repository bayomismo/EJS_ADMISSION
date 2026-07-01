import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import {
  detectFileType,
  isMimeAllowed,
  maxBytesForMime,
  writeUploadFile,
} from "@/lib/media-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("media", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.media.findMany({ orderBy: { createdAt: "desc" } });
  return ok(items);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("media", "create");
  if (!guard.ok) return guard.response!;

  // Reject early on Content-Length to avoid buffering huge uploads.
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > 60 * 1024 * 1024) {
    return fail("حجم الملف يتجاوز الحد المسموح به (60MB)", 413);
  }

  const form = await req.formData();
  const file = form.get("file");
  const altAr = (form.get("altAr") as string) || "";
  if (!file || !(file instanceof File)) return fail("لم يتم رفع ملف", 400);

  const buf = Buffer.from(await file.arrayBuffer());

  // 1. Magic-byte detection — never trust the client-supplied MIME type.
  const detected = detectFileType(buf);
  if (!detected) {
    return fail("نوع الملف غير مدعوم أو غير معروف", 415);
  }

  // 2. Reject disallowed types (defence-in-depth even if magic matches).
  if (!isMimeAllowed(detected.mime)) {
    return fail("نوع الملف غير مسموح به (SVG/HTML/XML/Executables محظورة)", 415);
  }

  // 3. Per-type size cap.
  const cap = maxBytesForMime(detected.mime);
  if (buf.byteLength > cap) {
    return fail(`حجم الملف يتجاوز الحد المسموح به لهذا النوع (${Math.round(cap / 1024 / 1024)}MB)`, 413);
  }

  // 4. Write outside public/ — served via authenticated API route.
  const id = randomUUID();
  const storedName = await writeUploadFile(id, detected.ext, buf, detected.mime);

  // Type bucket for the UI.
  const type = detected.mime.startsWith("image/")
    ? "IMAGE"
    : detected.mime.startsWith("video/")
    ? "VIDEO"
    : "DOC";

  // Store an internal URL; the file GET handler below serves it with auth.
  const internalUrl = `/api/admin/media/file/${id}`;

  const item = await db.media.create({
    data: {
      filename: storedName,
      originalName: file.name,
      mimeType: detected.mime,
      size: buf.byteLength,
      url: internalUrl,
      altAr,
      type,
    },
  });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "CREATE",
    entity: "media",
    entityId: item.id,
    newValue: { ...item, url: undefined },
    summary: `رفع ملف: ${item.originalName}`,
    req,
  });
  return ok(item, 201);
}
