import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireAdmissionManager, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canSeeFullPII, redactTeacherApp } from "@/lib/redact";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEW", "ACCEPTED", "REJECTED", "WAITLIST"]).optional(),
  statusNote: z.string().max(2000).optional().nullable(),
  fullNameAr: z.string().min(3).max(120).optional(),
  phone: z.string().regex(/^01[0-9]{9}$/).optional(),
  email: z.string().email().optional().nullable(),
  addressAr: z.string().min(3).max(400).optional(),
  subjects: z.string().max(2000).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

function scopeFilter(
  scope: { schoolIds: string[] | null; governorateIds: string[] | null },
  row: { preferredGovernorateId: string | null },
): boolean {
  if (scope.governorateIds !== null) {
    if (scope.governorateIds.length === 0) return false;
    return !!row.preferredGovernorateId && scope.governorateIds.includes(row.preferredGovernorateId);
  }
  if (scope.schoolIds !== null) {
    if (scope.schoolIds.length === 0) return false;
    return false; // teacher apps have no schoolId
  }
  return true;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const app = await db.teacherApplication.findUnique({
    where: { id },
    include: { preferredGovernorate: true },
  });
  if (!app) return fail("غير موجود", 404);
  if (!scopeFilter(guard.scope, app)) return fail("غير موجود", 404);
  const canSeeFull = canSeeFullPII((guard.session?.user as any)?.roleName);
  return ok(redactTeacherApp(app as any, canSeeFull));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.teacherApplication.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  if (!scopeFilter(guard.scope, old)) return fail("غير موجود", 404);
  const item = await db.teacherApplication.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "teacherApplication",
    entityId: id,
    oldValue: { ...old, nationalId: "[redacted]", phone: "[redacted]", email: "[redacted]" },
    newValue: { ...item, nationalId: "[redacted]", phone: "[redacted]", email: "[redacted]" },
    summary: `تعديل طلب معلم: ${item.referenceNo}`,
    req,
  });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.teacherApplication.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  if (!scopeFilter(guard.scope, old)) return fail("غير موجود", 404);
  await db.teacherApplication.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "teacherApplication",
    entityId: id,
    oldValue: { ...old, nationalId: "[redacted]", phone: "[redacted]", email: "[redacted]" },
    summary: `حذف طلب معلم: ${old.referenceNo}`,
    req,
  });
  return ok({ success: true });
}
