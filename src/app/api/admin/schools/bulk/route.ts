import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["activate", "deactivate", "feature", "unfeature", "archive", "unarchive", "delete"]),
});

export async function POST(req: NextRequest) {
  const action = requirePermission("schools", "delete");
  // delete requires delete perm; others require update
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten()), 422);

  const { ids, action: act } = parsed.data;

  // permission gate based on action
  const needDelete = act === "delete";
  const guard = needDelete
    ? await requirePermission("schools", "delete")
    : await requirePermission("schools", "update");
  if (!guard.ok) return guard.response!;

  let result: { count: number } = { count: 0 };
  const session = await getServerSession(authOptions);

  switch (act) {
    case "activate":
      result = await db.school.updateMany({ where: { id: { in: ids } }, data: { isActive: true, isArchived: false } });
      break;
    case "deactivate":
      result = await db.school.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
      break;
    case "feature":
      result = await db.school.updateMany({ where: { id: { in: ids } }, data: { isFeatured: true } });
      break;
    case "unfeature":
      result = await db.school.updateMany({ where: { id: { in: ids } }, data: { isFeatured: false } });
      break;
    case "archive":
      result = await db.school.updateMany({ where: { id: { in: ids } }, data: { isArchived: true } });
      break;
    case "unarchive":
      result = await db.school.updateMany({ where: { id: { in: ids } }, data: { isArchived: false } });
      break;
    case "delete":
      result = await db.school.deleteMany({ where: { id: { in: ids } } });
      break;
  }

  await logAudit({
    userId: session?.user?.id,
    action: "BULK",
    entity: "school",
    newValue: { ids, action: act, count: result.count },
    summary: `إجراء جماعي (${act}) على ${result.count} مدرسة`,
    req,
  });

  return ok({ success: true, count: result.count });
}
