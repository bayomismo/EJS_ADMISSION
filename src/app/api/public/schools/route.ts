import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";

export const dynamic = "force-dynamic";

// GET /api/public/schools?q=&governorateId=&cityId=&type=&gender=&sort=&page=&pageSize=&featured=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const governorateId = searchParams.get("governorateId") || undefined;
  const cityId = searchParams.get("cityId") || undefined;
  const type = searchParams.get("type") || undefined;
  const gender = searchParams.get("gender") || undefined;
  const featured = searchParams.get("featured") === "true" ? true : undefined;
  const sort = searchParams.get("sort") || "governorate";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(60, Math.max(1, Number(searchParams.get("pageSize") || "12")));

  const where: any = {
    isActive: true,
    isArchived: false,
    ...(governorateId ? { governorateId } : {}),
    ...(cityId ? { cityId } : {}),
    ...(type ? { type } : {}),
    ...(gender ? { gender } : {}),
    ...(featured ? { isFeatured: true } : {}),
  };

  // Arabic-normalized text search across nameAr/nameEn/code/governorate/city
  let schools = await db.school.findMany({
    where,
    include: {
      governorate: { select: { id: true, nameAr: true, nameEn: true } },
      city: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });

  if (q) {
    const nq = normalizeArabic(q);
    schools = schools.filter((s) => {
      const blob = normalizeArabic(
        `${s.nameAr} ${s.nameEn || ""} ${s.code} ${s.governorate.nameAr} ${s.governorate.nameEn} ${s.city.nameAr} ${s.city.nameEn || ""}`
      );
      return blob.includes(nq);
    });
  }

  // sorting
  const sorters: Record<string, (a: any, b: any) => number> = {
    governorate: (a, b) =>
      a.governorate.nameAr.localeCompare(b.governorate.nameAr, "ar") ||
      a.city.nameAr.localeCompare(b.city.nameAr, "ar") ||
      a.nameAr.localeCompare(b.nameAr, "ar"),
    name: (a, b) => a.nameAr.localeCompare(b.nameAr, "ar"),
    code: (a, b) => a.code.localeCompare(b.code),
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    featured: (a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      a.nameAr.localeCompare(b.nameAr, "ar"),
  };
  schools.sort(sorters[sort] || sorters.governorate);

  const total = schools.length;
  const start = (page - 1) * pageSize;
  const paged = schools.slice(start, start + pageSize);

  return NextResponse.json({
    items: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
