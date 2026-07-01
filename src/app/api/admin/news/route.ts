import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("news", "view");
  if (!guard.ok) return guard.response!;
  const items = await db.news.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
  return ok(items);
}

const schema = z.object({
  titleAr: z.string().min(2),
  titleEn: z.string().optional().nullable(),
  slug: z.string().min(2),
  excerptAr: z.string().optional().nullable(),
  excerptEn: z.string().optional().nullable(),
  bodyAr: z.string().min(1),
  bodyEn: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  publishedAt: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("news", "create");
  if (!guard.ok) return guard.response!;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const { publishedAt, scheduledAt, ...data } = parsed.data;
  try {
    const item = await db.news.create({
      data: {
        ...data,
        publishedAt: publishedAt ? new Date(publishedAt) : data.status === "PUBLISHED" ? new Date() : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });
    const session = await getServerSession(authOptions);
    await logAudit({ userId: session?.user?.id, action: "CREATE", entity: "news", entityId: item.id, newValue: item, summary: `إضافة خبر: ${item.titleAr}`, req });
    return ok(item, 201);
  } catch {
    return fail("المعرف (slug) مستخدم بالفعل", 409);
  }
}
