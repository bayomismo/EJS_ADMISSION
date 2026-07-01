import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("audit", "view");
  if (!guard.ok) return guard.response!;
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") || undefined;
  const action = searchParams.get("action") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "25")));

  const where: any = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return ok({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
