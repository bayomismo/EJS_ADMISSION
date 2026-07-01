import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireAdmissionManager, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canSeeFullPII, redactStudentApp } from "@/lib/redact";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/admin/applications/students?q=&status=&schoolId=&governorateId=&gradeId=&page=
export async function GET(req: NextRequest) {
  const guard = await requireAdmissionManager("student");
  if (!guard.ok) return guard.response!;
  const { scope, session } = guard;
  const canSeeFull = canSeeFullPII((session?.user as any)?.roleName);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || undefined;
  let schoolId = searchParams.get("schoolId") || undefined;
  let governorateId = searchParams.get("governorateId") || undefined;
  const gradeId = searchParams.get("gradeId") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "15")));

  const where: Prisma.StudentApplicationWhereInput = {};
  if (q) where.OR = [
    { studentNameAr: { contains: q } },
    { referenceNo: { contains: q } },
    { guardianName: { contains: q } },
    { guardianPhone: { contains: q } },
    { nationalId: { contains: q } },
  ];
  if (status && status !== "all") where.status = status;
  if (gradeId) where.gradeId = gradeId;

  // Apply row-level scope. If the user is scoped by school, force schoolId;
  // if scoped by governorate, force governorateId.
  if (scope.schoolIds !== null) {
    // scoped to specific schools
    if (scope.schoolIds.length === 0) {
      // explicitly no access — return empty result rather than 403 (avoids existence oracle)
      return ok({ items: [], total: 0, page, pageSize, totalPages: 1 });
    }
    where.schoolId = schoolId && scope.schoolIds.includes(schoolId)
      ? schoolId
      : { in: scope.schoolIds };
  } else if (scope.governorateIds !== null) {
    if (scope.governorateIds.length === 0) {
      return ok({ items: [], total: 0, page, pageSize, totalPages: 1 });
    }
    where.governorateId = governorateId && scope.governorateIds.includes(governorateId)
      ? governorateId
      : { in: scope.governorateIds };
  } else {
    // unrestricted — let the query filter through normally
    if (schoolId) where.schoolId = schoolId;
    if (governorateId) where.governorateId = governorateId;
  }

  const [items, total] = await Promise.all([
    db.studentApplication.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        school: { select: { nameAr: true, code: true } },
        governorate: { select: { nameAr: true } },
        city: { select: { nameAr: true } },
        grade: { select: { nameAr: true } },
      },
    }),
    db.studentApplication.count({ where }),
  ]);

  const safeItems = items.map((it) => redactStudentApp(it as any, canSeeFull));
  return ok({ items: safeItems, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
