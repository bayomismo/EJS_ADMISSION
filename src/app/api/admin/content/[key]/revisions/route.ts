// GET  /api/admin/content/[key]/revisions  — list revisions for a block
// POST /api/admin/content/[key]/revisions  — restore a revision
//                                          body: { revisionId: "..." }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const restoreSchema = z.object({ revisionId: z.string().min(1) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requirePermission("content", "view");
  if (!guard.ok) return guard.response!;
  const { key } = await params;

  const revisions = await db.contentBlockRevision.findMany({
    where: { blockKey: key },
    orderBy: { editedAt: "desc" },
    take: 50,
    include: { editedBy: { select: { id: true, name: true, email: true } } },
  });
  return ok({ items: revisions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requirePermission("content", "edit");
  if (!guard.ok) return guard.response!;
  const userId = (guard.session?.user as any)?.id as string | undefined;
  const { key } = await params;

  const body = await req.json().catch(() => null);
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) return fail("بيانات غير صالحة", 422);

  const revision = await db.contentBlockRevision.findUnique({ where: { id: parsed.data.revisionId } });
  if (!revision || revision.blockKey !== key) return fail("النسخة غير موجودة", 404);

  const current = await db.contentBlock.findUnique({ where: { key } });
  if (!current) return fail("البلوك غير موجود", 404);

  // Save current as a new revision (so restore is reversible), then update.
  await db.$transaction(async (tx) => {
    await tx.contentBlockRevision.create({
      data: {
        blockKey: key,
        valueAr: current.valueAr,
        valueEn: current.valueEn,
        editedById: userId,
      },
    });
    await tx.contentBlock.update({
      where: { key },
      data: {
        valueAr: revision.valueAr,
        valueEn: revision.valueEn,
        updatedById: userId,
      },
    });
  });

  await logAudit({
    userId,
    action: "UPDATE",
    entity: "ContentBlock",
    entityId: key,
    newValue: JSON.stringify({ restoredFromRevision: revision.id }),
    summary: `استعادة نسخة قديمة للبلوك: ${key}`,
  });

  return ok({ restored: true });
}