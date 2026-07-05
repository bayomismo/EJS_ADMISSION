// PATCH  /api/admin/content/[key]  — update a block (creates revision)
// DELETE /api/admin/content/[key]  — soft-delete (isActive=false) or hard delete
// POST   /api/admin/content/[key]/restore/[revisionId] — restore from revision

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  valueAr: z.string().min(1).max(10000).optional(),
  valueEn: z.string().max(10000).optional().nullable(),
  group: z.string().min(1).max(50).optional(),
  label: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requirePermission("content", "edit");
  if (!guard.ok) return guard.response!;
  const userId = (guard.session?.user as any)?.id as string | undefined;
  const { key } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.contentBlock.findUnique({ where: { key } });
  if (!existing) return fail("البلوك غير موجود", 404);

  // Snapshot the current value to revisions before overwriting (only if
  // the Arabic or English value actually changed).
  const arChanged = parsed.data.valueAr !== undefined && parsed.data.valueAr !== existing.valueAr;
  const enChanged = parsed.data.valueEn !== undefined && (parsed.data.valueEn || "") !== (existing.valueEn || "");

  const updated = await db.$transaction(async (tx) => {
    if (arChanged || enChanged) {
      await tx.contentBlockRevision.create({
        data: {
          blockKey: existing.key,
          valueAr: existing.valueAr,
          valueEn: existing.valueEn,
          editedById: userId,
        },
      });
    }
    return tx.contentBlock.update({
      where: { key },
      data: {
        ...(parsed.data.valueAr !== undefined && { valueAr: parsed.data.valueAr }),
        ...(parsed.data.valueEn !== undefined && { valueEn: parsed.data.valueEn || null }),
        ...(parsed.data.group !== undefined && { group: parsed.data.group }),
        ...(parsed.data.label !== undefined && { label: parsed.data.label || null }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        updatedById: userId,
      },
    });
  });

  await logAudit({
    userId,
    action: "UPDATE",
    entity: "ContentBlock",
    entityId: updated.key,
    oldValue: JSON.stringify({ valueAr: existing.valueAr, valueEn: existing.valueEn, isActive: existing.isActive }),
    newValue: JSON.stringify({ valueAr: updated.valueAr, valueEn: updated.valueEn, isActive: updated.isActive }),
    summary: `تعديل بلوك محتوى: ${updated.key}`,
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requirePermission("content", "delete");
  if (!guard.ok) return guard.response!;
  const userId = (guard.session?.user as any)?.id as string | undefined;
  const { key } = await params;

  // ?hard=true deletes the row (and all revisions via cascade).
  // Default is soft delete (isActive=false) so the block stops rendering
  // but the data is preserved.
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  const existing = await db.contentBlock.findUnique({ where: { key } });
  if (!existing) return fail("البلوك غير موجود", 404);

  if (hard) {
    await db.contentBlock.delete({ where: { key } });
  } else {
    await db.contentBlock.update({ where: { key }, data: { isActive: false, updatedById: userId } });
  }

  await logAudit({
    userId,
    action: "DELETE",
    entity: "ContentBlock",
    entityId: key,
    oldValue: JSON.stringify({ hard }),
    summary: hard ? `حذف بلوك محتوى: ${key}` : `إخفاء بلوك محتوى: ${key}`,
  });

  return ok({ deleted: true, hard });
}