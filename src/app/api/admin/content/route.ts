// GET  /api/admin/content          — list all blocks (grouped)
// POST /api/admin/content          — create a new block
//
// PATCH/DELETE handled by /api/admin/content/[key]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9._-]+$/, "Key must be lowercase letters, numbers, dots, dashes, underscores"),
  valueAr: z.string().min(1).max(10000),
  valueEn: z.string().max(10000).optional().nullable(),
  group: z.string().min(1).max(50),
  label: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const guard = await requirePermission("content", "view");
  if (!guard.ok) return guard.response!;

  const blocks = await db.contentBlock.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
    select: {
      key: true,
      valueAr: true,
      valueEn: true,
      group: true,
      label: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      updatedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { revisions: true } },
    },
  });
  return ok({ items: blocks });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("content", "create");
  if (!guard.ok) return guard.response!;
  const userId = (guard.session?.user as any)?.id as string | undefined;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.contentBlock.findUnique({ where: { key: parsed.data.key } });
  if (existing) return fail("هذا المفتاح مستخدم بالفعل", 409);

  const created = await db.contentBlock.create({
    data: {
      key: parsed.data.key,
      valueAr: parsed.data.valueAr,
      valueEn: parsed.data.valueEn || null,
      group: parsed.data.group,
      label: parsed.data.label || null,
      description: parsed.data.description || null,
      isActive: parsed.data.isActive,
      updatedById: userId,
    },
  });

  await logAudit({
    userId,
    action: "CREATE",
    entity: "ContentBlock",
    entityId: created.key,
    newValue: JSON.stringify({ key: created.key, group: created.group }),
    summary: `إضافة بلوك محتوى: ${created.key}`,
  });

  return ok(created);
}