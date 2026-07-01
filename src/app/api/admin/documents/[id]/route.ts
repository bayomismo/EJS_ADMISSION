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
  descriptionAr: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  downloadCount: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("documents", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.document.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const item = await db.document.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "UPDATE", entity: "document", entityId: id, oldValue: old, newValue: item, req });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("documents", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.document.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  await db.document.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "DELETE", entity: "document", entityId: id, oldValue: old, req });
  return ok({ success: true });
}
