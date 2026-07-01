import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ok } from "@/lib/guards";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// GET /api/admin/schools/export — download all schools as xlsx
export async function GET(req: NextRequest) {
  const guard = await requirePermission("schools", "view");
  if (!guard.ok) return guard.response!;

  const schools = await db.school.findMany({
    include: {
      governorate: { select: { nameAr: true } },
      city: { select: { nameAr: true } },
    },
    orderBy: { code: "asc" },
  });

  const rows = schools.map((s) => ({
    "الكود": s.code,
    "الاسم بالعربية": s.nameAr,
    "الاسم بالإنجليزية": s.nameEn || "",
    "المحافظة": s.governorate.nameAr,
    "المدينة": s.city.nameAr,
    "النوع": s.type === "ARABIC" ? "عربي" : "لغات",
    "النوع (بنين/بنات)": s.gender === "MIXED" ? "مختلط" : s.gender === "MALE" ? "بنين" : "بنات",
    "العنوان": s.addressAr || "",
    "الهاتف": s.phone || "",
    "البريد": s.email || "",
    "السعة": s.capacity || "",
    "رابط التقديم": s.applicationUrl || "",
    "مميزة": s.isFeatured ? "نعم" : "لا",
    "نشطة": s.isActive ? "نعم" : "لا",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // RTL-ish column widths
  ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المدارس");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ejs-schools-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
