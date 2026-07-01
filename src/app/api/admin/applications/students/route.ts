import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok, fail } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/applications/students?q=&status=&schoolId=&governorateId=&gradeId=&page=
export async function GET(req: NextRequest) {
  const guard = await requirePermission("schools", "view");
  if (!guard.ok) return guard.response!;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || undefined;
  const schoolId = searchParams.get("schoolId") || undefined;
  const governorateId = searchParams.get("governorateId") || undefined;
  const gradeId = searchParams.get("gradeId") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "15")));

  const where: any = {};
  if (q) where.OR = [
    { studentNameAr: { contains: q } },
    { referenceNo: { contains: q } },
    { guardianName: { contains: q } },
    { guardianPhone: { contains: q } },
    { nationalId: { contains: q } },
  ];
  if (status && status !== "all") where.status = status;
  if (schoolId) where.schoolId = schoolId;
  if (governorateId) where.governorateId = governorateId;
  if (gradeId) where.gradeId = gradeId;

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

  return ok({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
