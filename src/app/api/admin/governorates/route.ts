import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("governorates", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.governorate.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { cities: true, schools: { where: { isActive: true, isArchived: false } } } } },
  });
  return ok(items);
}

const schema = z.object({
  nameAr: z.string().min(2), nameEn: z.string().min(2),
  sortOrder: z.number().int().default(0), isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("governorates", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  try {
    const item = await db.governorate.create({ data: parsed.data });
    const session = await getServerSession(authOptions);
    await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "governorate", entityId: item.id, newValue: item, summary: `إضافة محافظة: ${item.nameAr}`, req });
    return ok(item, 201);
  } catch (e: any) {
    return fail("المحافظة موجودة بالفعل", 409);
  }
}
