import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("cities", "view");
  if (!guard.ok) return guard.response!;
  const { searchParams } = new URL(req.url);
  const governorateId = searchParams.get("governorateId") || undefined;
  const items = await db.city.findMany({
    where: governorateId ? { governorateId } : undefined,
    orderBy: { sortOrder: "asc" },
    include: { governorate: { select: { nameAr: true } }, _count: { select: { schools: { where: { isActive: true, isArchived: false } } } } },
  });
  return ok(items);
}

const schema = z.object({
  nameAr: z.string().min(2), nameEn: z.string().min(2),
  governorateId: z.string().min(1),
  sortOrder: z.number().int().default(0), isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("cities", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  try {
    const item = await db.city.create({ data: parsed.data });
    const session = await getServerSession(authOptions);
    await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "city", entityId: item.id, newValue: item, summary: `إضافة مدينة: ${item.nameAr}`, req });
    return ok(item, 201);
  } catch {
    return fail("المدينة موجودة في هذه المحافظة", 409);
  }
}
