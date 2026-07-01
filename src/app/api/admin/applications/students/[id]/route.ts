import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEW", "ACCEPTED", "REJECTED", "WAITLIST"]).optional(),
  statusNote: z.string().optional().nullable(),
  studentNameAr: z.string().min(3).optional(),
  guardianName: z.string().min(3).optional(),
  guardianPhone: z.string().min(10).optional(),
  guardianEmail: z.string().email().optional().nullable(),
  addressAr: z.string().optional(),
  notes: z.string().optional().nullable(),
  schoolId: z.string().optional(),
  gradeId: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("schools", "view");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const app = await db.studentApplication.findUnique({
    where: { id },
    include: { school: true, governorate: true, city: true, grade: true },
  });
  if (!app) return fail("غير موجود", 404);
  return ok(app);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("schools", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.studentApplication.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const item = await db.studentApplication.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "studentApplication",
    entityId: id,
    oldValue: old,
    newValue: item,
    summary: `تعديل طلب طالب: ${item.referenceNo}`,
    req,
  });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("schools", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.studentApplication.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  await db.studentApplication.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "studentApplication",
    entityId: id,
    oldValue: old,
    summary: `حذف طلب طالب: ${old.referenceNo}`,
    req,
  });
  return ok({ success: true });
}
