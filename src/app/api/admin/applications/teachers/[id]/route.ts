import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireAdmissionManager, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEW", "ACCEPTED", "REJECTED", "WAITLIST"]).optional(),
  statusNote: z.string().optional().nullable(),
  fullNameAr: z.string().min(3).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  addressAr: z.string().optional(),
  subjects: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const app = await db.teacherApplication.findUnique({
    where: { id },
    include: { preferredGovernorate: true },
  });
  if (!app) return fail("غير موجود", 404);
  return ok(app);
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
  const item = await db.teacherApplication.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "UPDATE",
    entity: "teacherApplication",
    entityId: id,
    oldValue: old,
    newValue: item,
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
  await db.teacherApplication.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "teacherApplication",
    entityId: id,
    oldValue: old,
    summary: `حذف طلب معلم: ${old.referenceNo}`,
    req,
  });
  return ok({ success: true });
}
