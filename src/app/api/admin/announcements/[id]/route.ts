import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  titleAr: z.string().min(2).optional(),
  titleEn: z.string().optional().nullable(),
  bodyAr: z.string().min(1).optional(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "URGENT"]).optional(),
  linkUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("announcements", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.announcement.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const { startDate, endDate, ...data } = parsed.data;
  const item = await db.announcement.update({
    where: { id },
    data: { ...data, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined },
  });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "UPDATE", entity: "announcement", entityId: id, oldValue: old, newValue: item, req });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("announcements", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.announcement.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  await db.announcement.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "DELETE", entity: "announcement", entityId: id, oldValue: old, req });
  return ok({ success: true });
}
