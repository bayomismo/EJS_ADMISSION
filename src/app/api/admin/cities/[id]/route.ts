import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("cities", "view");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  return ok(await db.city.findUnique({ where: { id } }));
}

const schema = z.object({
  nameAr: z.string().min(2).optional(), nameEn: z.string().min(2).optional(),
  governorateId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(), isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("cities", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.city.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const item = await db.city.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "UPDATE", entity: "city", entityId: id, oldValue: old, newValue: item, summary: `تعديل مدينة: ${item.nameAr}`, req });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("cities", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.city.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const schoolsCount = await db.school.count({ where: { cityId: id } });
  if (schoolsCount > 0) return fail("لا يمكن حذف مدينة بها مدارس", 409);
  await db.city.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "DELETE", entity: "city", entityId: id, oldValue: old, summary: `حذف مدينة: ${old.nameAr}`, req });
  return ok({ success: true });
}
