import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  categoryId: z.string().optional().nullable(),
  questionAr: z.string().min(2).optional(),
  questionEn: z.string().optional().nullable(),
  answerAr: z.string().min(1).optional(),
  answerEn: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("faq", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.faq.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const item = await db.faq.update({ where: { id }, data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "UPDATE", entity: "faq", entityId: id, oldValue: old, newValue: item, req });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("faq", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.faq.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  await db.faq.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "DELETE", entity: "faq", entityId: id, oldValue: old, req });
  return ok({ success: true });
}
