import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("users", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, roleId: true, isActive: true, lastLoginAt: true, createdAt: true, role: { select: { id: true, name: true, description: true } } },
  });
  const roles = await db.role.findMany({ orderBy: { name: "asc" }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
  return ok({ items, roles });
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  roleId: z.string().min(1),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("users", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const { password, ...data } = parsed.data;
  if (!password) return fail("كلمة المرور مطلوبة", 422);
  try {
    const item = await db.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: hashPassword(password) } });
    const session = await getServerSession(authOptions);
    await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "user", entityId: item.id, newValue: { ...item, passwordHash: "[hidden]" }, summary: `إضافة مستخدم: ${item.name}`, req });
    return ok({ ...item, passwordHash: undefined }, 201);
  } catch {
    return fail("البريد الإلكتروني مستخدم بالفعل", 409);
  }
}
