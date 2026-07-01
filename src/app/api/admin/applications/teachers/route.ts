import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireAdmissionManager, ok } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmissionManager("teacher");
  if (!guard.ok) return guard.response!;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "15")));

  const where: any = {};
  if (q) where.OR = [
    { fullNameAr: { contains: q } },
    { referenceNo: { contains: q } },
    { phone: { contains: q } },
    { nationalId: { contains: q } },
    { subjects: { contains: q } },
    { specialization: { contains: q } },
  ];
  if (status && status !== "all") where.status = status;

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
  return ok({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
