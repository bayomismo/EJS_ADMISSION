import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireAdmissionManager, ok } from "@/lib/guards";
import { canSeeFullPII, redactTeacherApp } from "@/lib/redact";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { scope, session } = guard;
  const canSeeFull = canSeeFullPII((session?.user as any)?.roleName);
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "15")));

  const where: Prisma.TeacherApplicationWhereInput = {};
  if (q) where.OR = [
    { fullNameAr: { contains: q } },
    { referenceNo: { contains: q } },
    { phone: { contains: q } },
    { nationalId: { contains: q } },
    { subjects: { contains: q } },
    { specialization: { contains: q } },
  ];
  if (status && status !== "all") where.status = status;

  // Apply row-level scope. Teacher applications have preferredGovernorateId
  // (optional); we restrict by that, or by the school scope (treated as
  // a superset — if a teacher has no preferred gov, they are not in the
  // governorate scope).
  if (scope.governorateIds !== null) {
    if (scope.governorateIds.length === 0) {
      return ok({ items: [], total: 0, page, pageSize, totalPages: 1 });
    }
    where.preferredGovernorateId = { in: scope.governorateIds };
  } else if (scope.schoolIds !== null && scope.schoolIds.length > 0) {
    // School scope on teacher apps: none of the seeded teacher apps have a
    // schoolId; conservatively return empty unless the user also has gov scope.
    return ok({ items: [], total: 0, page, pageSize, totalPages: 1 });
  }

  const [items, total] = await Promise.all([
    db.teacherApplication.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { preferredGovernorate: { select: { nameAr: true } } },
    }),
    db.teacherApplication.count({ where }),
  ]);
  const safeItems = items.map((it) => redactTeacherApp(it as any, canSeeFull));
  return ok({ items: safeItems, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
