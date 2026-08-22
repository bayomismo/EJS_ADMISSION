// /api/admin/applications/documents/file/[id]
//
// Streams (or redirects to) the stored bytes of an application document.
// Mirrors /api/admin/media/file/[id]: Vercel Blob backend 302s to the CDN
// URL; local backend streams bytes inline so PDFs/images preview in-browser.
//
// Access: admission manager for the parent application kind, with row-level
// scope enforced. Every read is audit-logged.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmissionManager } from "@/lib/guards";
import { readUploadFile, storage } from "@/lib/media-storage";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AdmissionScope } from "@/lib/guards";

export const dynamic = "force-dynamic";

function scopeAllows(
  scope: AdmissionScope,
  row: { schoolId?: string; governorateId?: string; preferredGovernorateId?: string | null },
): boolean {
  if (scope.schoolIds !== null) {
    if (scope.schoolIds.length === 0) return false;
    return !!row.schoolId && scope.schoolIds.includes(row.schoolId);
  }
  if (scope.governorateIds !== null) {
    if (scope.governorateIds.length === 0) return false;
    const gov = row.governorateId ?? row.preferredGovernorateId ?? null;
    return !!gov && scope.governorateIds.includes(gov);
  }
  return true;
}

async function loadDoc(id: string) {
  const asStudent = await db.applicationDocument.findFirst({
    where: { id, studentAppId: { not: null } },
    include: {
      studentApp: { select: { schoolId: true, governorateId: true, referenceNo: true } },
    },
  });
  if (asStudent?.studentApp) {
    return {
      doc: asStudent,
      kind: "student" as const,
      scopeRow: {
        schoolId: asStudent.studentApp.schoolId,
        governorateId: asStudent.studentApp.governorateId,
      },
      referenceNo: asStudent.studentApp.referenceNo,
    };
  }
  const asTeacher = await db.applicationDocument.findFirst({
    where: { id, teacherAppId: { not: null } },
    include: {
      teacherApp: { select: { preferredGovernorateId: true, referenceNo: true } },
    },
  });
  if (asTeacher?.teacherApp) {
    return {
      doc: asTeacher,
      kind: "teacher" as const,
      scopeRow: { preferredGovernorateId: asTeacher.teacherApp.preferredGovernorateId },
      referenceNo: asTeacher.teacherApp.referenceNo,
    };
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Peek first to know which manager role gates this document.
  const peek = await loadDoc(id);
  if (!peek) return new NextResponse("Not found", { status: 404 });
  const guard = await requireAdmissionManager(peek.kind);
  if (!guard.ok) return guard.response!;
  if (!scopeAllows(guard.scope, peek.scopeRow)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const doc = peek.doc;

  async function auditRead() {
    const session = await getServerSession(authOptions);
    await logAudit({
      userId: session?.user?.id,
      action: "READ",
      entity: "applicationDocument",
      entityId: id,
      summary: `عرض مستند (${doc.docType}) للطلب ${peek!.referenceNo}`,
      req,
    });
  }

  // ── Remote (Vercel Blob) backend: resolve handle → public URL → 302. ──
  if (storage.isRemote()) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: doc.filename, limit: 1 });
      if (blobs.length === 0) return new NextResponse("Missing on storage", { status: 410 });
      await auditRead();
      return NextResponse.redirect(blobs[0].url, 302);
    } catch {
      return new NextResponse("Storage error", { status: 502 });
    }
  }

  // ── Local backend: stream bytes inline (previewable). ──
  let buf: Buffer;
  try {
    const r = await readUploadFile(doc.filename);
    buf = r.buf;
  } catch {
    return new NextResponse("Missing on disk", { status: 410 });
  }
  await auditRead();

  // Inline for images and PDFs so admins can preview; anything else forces
  // download. Content-Disposition filename uses the original upload name.
  const inline = doc.mimeType.startsWith("image/") || doc.mimeType === "application/pdf";
  const disposition = inline
    ? "inline"
    : `attachment; filename="${encodeURIComponent(doc.originalName)}"`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": disposition,
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; object-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60",
    },
  });
}
