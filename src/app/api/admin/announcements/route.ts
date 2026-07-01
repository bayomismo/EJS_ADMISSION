import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("announcements", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.announcement.findMany({ orderBy: { sortOrder: "asc" } });
  return ok(items);
}

const schema = z.object({
  titleAr: z.string().min(2),
  titleEn: z.string().optional().nullable(),
  bodyAr: z.string().min(1),
  bodyEn: z.string().optional().nullable(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "URGENT"]).default("INFO"),
  linkUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("announcements", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const { startDate, endDate, ...data } = parsed.data;
  const item = await db.announcement.create({
    data: { ...data, startDate: startDate ? new Date(startDate) : new Date(), endDate: endDate ? new Date(endDate) : null },
  });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "announcement", entityId: item.id, newValue: item, summary: `إضافة إعلان: ${item.titleAr}`, req });
  return ok(item, 201);
}
