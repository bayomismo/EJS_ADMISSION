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
  slug: z.string().min(2).optional(),
  excerptAr: z.string().optional().nullable(),
  excerptEn: z.string().optional().nullable(),
  bodyAr: z.string().min(1).optional(),
  bodyEn: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  publishedAt: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  viewCount: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("news", "update");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);
  const old = await db.news.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  const { publishedAt, scheduledAt, ...data } = parsed.data;
  const item = await db.news.update({
    where: { id },
    data: {
      ...data,
      publishedAt: publishedAt ? new Date(publishedAt) : data.status === "PUBLISHED" && !old.publishedAt ? new Date() : old.publishedAt,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "UPDATE", entity: "news", entityId: id, oldValue: old, newValue: item, summary: `تعديل خبر: ${item.titleAr}`, req });
  return ok(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("news", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.news.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  await db.news.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({ userId: session?.user?.id, action: "DELETE", entity: "news", entityId: id, oldValue: old, summary: `حذف خبر: ${old.titleAr}`, req });
  return ok({ success: true });
}
