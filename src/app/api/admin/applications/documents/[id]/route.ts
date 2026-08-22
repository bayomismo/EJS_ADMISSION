// /api/admin/applications/documents/[id]
//
// Review endpoints for applicant-uploaded documents:
//   PUT    { reviewStatus: "PENDING"|"VERIFIED"|"REJECTED", reviewNote? }
//   DELETE removes the document (DB row + stored bytes)
//
// Access mirrors the applications endpoints: student admission managers for
// student documents, teacher admission managers for teacher documents, and
// row-level scope is enforced against the parent application.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmissionManager, ok, fail, type AdmissionScope } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUploadFile } from "@/lib/media-storage";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  reviewStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  reviewNote: z.string().max(500).optional().nullable(),
});

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

/** Load a document with its parent application's scope-relevant columns. */
async function loadDocWithApp(id: string) {
  const asStudent = await db.applicationDocument.findFirst({
    where: { id, studentAppId: { not: null } },
    include: {
      studentApp: {
        select: {
          id: true,
          referenceNo: true,
          schoolId: true,
          governorateId: true,
        },
      },
    },
  });
  if (asStudent && asStudent.studentApp) {
    return {
      doc: asStudent,
      kind: "student" as const,
      appId: asStudent.studentApp.id,
      referenceNo: asStudent.studentApp.referenceNo,
      scopeRow: {
        schoolId: asStudent.studentApp.schoolId,
        governorateId: asStudent.studentApp.governorateId,
      },
    };
  }

  const asTeacher = await db.applicationDocument.findFirst({
    where: { id, teacherAppId: { not: null } },
    include: {
      teacherApp: {
        select: { id: true, referenceNo: true, preferredGovernorateId: true },
      },
    },
  });
  if (asTeacher && asTeacher.teacherApp) {
    return {
      doc: asTeacher,
      kind: "teacher" as const,
      appId: asTeacher.teacherApp.id,
      referenceNo: asTeacher.teacherApp.referenceNo,
      scopeRow: { preferredGovernorateId: asTeacher.teacherApp.preferredGovernorateId },
    };
  }
  return null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Peek at the doc first so we know which manager role to require.
  const peek = await loadDocWithApp(id);
  if (!peek) return fail("غير موجود", 404);
  const guard = await requireAdmissionManager(peek.kind);
  if (!guard.ok) return guard.response!;
  if (!scopeAllows(guard.scope, peek.scopeRow)) return fail("غير موجود", 404);

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);

  const old = { reviewStatus: peek.doc.reviewStatus, reviewNote: peek.doc.reviewNote };
  const item = await db.applicationDocument.update({
    where: { id },
    data: {
      reviewStatus: parsed.data.reviewStatus,
      reviewNote: parsed.data.reviewNote ?? null,
      reviewedAt: parsed.data.reviewStatus === "PENDING" ? null : new Date(),
    },
  });

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "applicationDocument",
    entityId: id,
    oldValue: old,
    newValue: { reviewStatus: item.reviewStatus, reviewNote: item.reviewNote },
    summary: `مراجعة مستند (${item.docType}) على الطلب ${peek.referenceNo}: ${item.reviewStatus}`,
    req,
  });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const peek = await loadDocWithApp(id);
  if (!peek) return fail("غير موجود", 404);
  const guard = await requireAdmissionManager(peek.kind);
  if (!guard.ok) return guard.response!;
  if (!scopeAllows(guard.scope, peek.scopeRow)) return fail("غير موجود", 404);

  await db.applicationDocument.delete({ where: { id } });
  await deleteUploadFile(peek.doc.filename);

  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "applicationDocument",
    entityId: id,
    oldValue: { docType: peek.doc.docType, originalName: peek.doc.originalName },
    summary: `حذف مستند (${peek.doc.docType}) من الطلب ${peek.referenceNo}`,
    req,
  });
  return ok({ success: true });
}
