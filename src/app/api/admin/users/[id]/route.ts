import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("users", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.user.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const { password, ...data } = parsed.data;
  const updateData: any = { ...data };
  if (data.email) updateData.email = data.email.toLowerCase();
  if (password) updateData.passwordHash = hashPassword(password);
  const item = await db.user.update({ where: { id }, data: updateData });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "UPDATE", entity: "user", entityId: id, oldValue: { ...old, passwordHash: "[hidden]" }, newValue: { ...item, passwordHash: "[hidden]" }, summary: `تعديل مستخدم: ${item.name}`, req });
  return ok({ ...item, passwordHash: undefined });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("users", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user?.id === id) return fail("لا يمكنك حذف حسابك الحالي", 400);
  const old = await db.user.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  await db.user.delete({ where: { id } });
  await logAudit({ userId: session?.user?.id, action: "DELETE", entity: "user", entityId: id, oldValue: { ...old, passwordHash: "[hidden]" }, summary: `حذف مستخدم: ${old.name}`, req });
  return ok({ success: true });
}
