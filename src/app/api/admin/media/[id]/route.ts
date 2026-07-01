import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUploadFile } from "@/lib/media-storage";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("media", "delete");
  if (!guard.ok) return guard.response!;
  const { id } = await params;
  const old = await db.media.findUnique({ where: { id } });
  if (!old) return fail("غير موجود", 404);
  // Best-effort delete; never block the DB delete on filesystem errors.
  await deleteUploadFile(old.filename);
  await db.media.delete({ where: { id } });
  const session = await getServerSession(authOptions);
  await logAudit({
    userId: session?.user?.id,
    action: "DELETE",
    entity: "media",
    entityId: id,
    oldValue: { ...old, url: undefined },
    summary: `حذف ملف: ${old.originalName}`,
    req,
  });
  return ok({ success: true });
}
