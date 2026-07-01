import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireAdmissionManager, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canSeeFullPII, redactStudentApp } from "@/lib/redact";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEW", "ACCEPTED", "REJECTED", "WAITLIST"]).optional(),
  statusNote: z.string().max(2000).optional().nullable(),
  studentNameAr: z.string().min(3).max(120).optional(),
  guardianName: z.string().min(3).max(120).optional(),
  guardianPhone: z.string().regex(/^01[0-9]{9}$/).optional(),
  guardianEmail: z.string().email().optional().nullable(),
  addressAr: z.string().min(3).max(400).optional(),
  notes: z.string().max(2000).optional().nullable(),
  schoolId: z.string().optional(),
  gradeId: z.string().optional().nullable(),
});

/** Returns a `where` fragment that restricts a student-application row to
 *  the caller's scope. Used by GET/PUT/DELETE to enforce row-level isolation.
 *  Returns null when the caller has full access (super-admin/admin). */
function scopeFilter(
  scope: { schoolIds: string[] | null; governorateIds: string[] | null },
  row: { schoolId: string; governorateId: string },
): boolean {
  if (scope.schoolIds !== null) {
    if (scope.schoolIds.length === 0) return false;
    return scope.schoolIds.includes(row.schoolId);
  }
  if (scope.governorateIds !== null) {
    if (scope.governorateIds.length === 0) return false;
    return scope.governorateIds.includes(row.governorateId);
  }
  return true; // unrestricted
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("student");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const app = await db.studentApplication.findUnique({
    where: { id },
    include: { school: true, governorate: true, city: true, grade: true },
  });
  if (!app) return fail("غير موجود", 404);
  if (!scopeFilter(guard.scope, app)) {
    // 404 (not 403) to avoid revealing the existence of out-of-scope rows.
    return fail("غير موجود", 404);
  }
  const canSeeFull = canSeeFullPII((guard.session?.user as any)?.roleName);
  return ok(redactStudentApp(app as any, canSeeFull));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("student");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.studentApplication.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  if (!scopeFilter(guard.scope, old)) return fail("غير موجود", 404);

  // If the update moves the row to a different school, check the target
  // is in the user's scope too.
  if (parsed.data.schoolId && parsed.data.schoolId !== old.schoolId) {
    if (guard.scope.schoolIds !== null && !guard.scope.schoolIds.includes(parsed.data.schoolId)) {
      return fail("المدرسة المستهدفة خارج نطاق صلاحياتك", 403);
    }
  }

  const item = await db.studentApplication.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "studentApplication",
    entityId: id,
    oldValue: { ...old, nationalId: "[redacted]", guardianNationalId: "[redacted]", guardianPhone: "[redacted]", guardianEmail: "[redacted]" },
    newValue: { ...item, nationalId: "[redacted]", guardianNationalId: "[redacted]", guardianPhone: "[redacted]", guardianEmail: "[redacted]" },
    summary: `تعديل طلب طالب: ${item.referenceNo}`,
    req,
  });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("student");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.studentApplication.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  if (!scopeFilter(guard.scope, old)) return fail("غير موجود", 404);
  await db.studentApplication.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "studentApplication",
    entityId: id,
    oldValue: { ...old, nationalId: "[redacted]", guardianNationalId: "[redacted]", guardianPhone: "[redacted]", guardianEmail: "[redacted]" },
    summary: `حذف طلب طالب: ${old.referenceNo}`,
    req,
  });
  return ok({ success: true });
}
