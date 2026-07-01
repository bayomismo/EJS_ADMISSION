import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("faq", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.faq.findMany({ orderBy: { sortOrder: "asc" }, include: { category: true } });
  return ok(items);
}

const schema = z.object({
  categoryId: z.string().optional().nullable(),
  questionAr: z.string().min(2),
  questionEn: z.string().optional().nullable(),
  answerAr: z.string().min(1),
  answerEn: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("faq", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const item = await db.faq.create({ data: parsed.data });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "faq", entityId: item.id, newValue: item, summary: `إضافة سؤال: ${item.questionAr}`, req });
  return ok(item, 201);
}
