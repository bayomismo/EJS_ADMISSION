import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("documents", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.document.findMany({ orderBy: { createdAt: "desc" }, include: { category: true } });
  return ok(items);
}

const schema = z.object({
  titleAr: z.string().min(2),
  titleEn: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  mediaId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("documents", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const item = await db.document.create({ data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "document", entityId: item.id, newValue: item, summary: `إضافة مستند: ${item.titleAr}`, req });
  return ok(item, 201);
}
