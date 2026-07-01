import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/schools/[code]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const school = await db.school.findFirst({
    where: { code, isActive: true, isArchived: false },
    include: {
      governorate: true,
      city: true,
      images: { orderBy: { sortOrder: "asc" } },
      facilities: { include: { facility: true } },
      grades: { include: { grade: true }, orderBy: { grade: { sortOrder: "asc" } } },
    },
  });
  if (!school) {
    return NextResponse.json({ error: "المدرسة غير موجودة" }, { status: 404 });
  }
  return NextResponse.json(school);
}
