import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";

export const dynamic = "force-dynamic";

// GET /api/public/governorates — with cities + counts
export async function GET() {
  const governorates = await db.governorate.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      cities: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameAr: true, nameEn: true },
      },
      _count: { select: { schools: { where: { isActive: true, isArchived: false } } } },
    },
  });
  return NextResponse.json(governorates);
}
