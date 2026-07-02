// GET /api/admin/applications/students/export
// Streams all student applications matching the same filters as the list
// endpoint as an .xlsx file (re-uses xlsx which is already bundled for
// the schools export).
//
// Query: q, status, schoolId, governorateId, gradeId (all optional).

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { requireAdmissionManager, fail } from "@/lib/guards";
import { canSeeFullPII, redactStudentApp } from "@/lib/redact";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ARABIC_HEADERS: Array<[keyof StudentRow | string, string]> = [
  ["referenceNo", "الرقم المرجعي"],
  ["submittedAt", "تاريخ التقديم"],
  ["status", "الحالة"],
  ["studentNameAr", "اسم الطالب"],
  ["nationalId", "الرقم القومي"],
  ["gender", "النوع"],
  ["birthDate", "تاريخ الميلاد"],
  ["governorate", "المحافظة"],
  ["city", "المدينة"],
  ["school", "المدرسة"],
  ["grade", "المرحلة"],
  ["guardianName", "ولي الأمر"],
  ["guardianPhone", "هاتف ولي الأمر"],
  ["guardianNationalId", "الرقم القومي لولي الأمر"],
  ["addressAr", "العنوان"],
  ["previousSchool", "المدرسة السابقة"],
  ["notes", "ملاحظات"],
];

interface StudentRow {
  referenceNo: string;
  submittedAt: string;
  status: string;
  studentNameAr: string;
  nationalId: string;
  gender: string;
  birthDate: string;
  governorate: string;
  city: string;
  school: string;
  grade: string;
  guardianName: string;
  guardianPhone: string;
  guardianNationalId: string;
  addressAr: string;
  previousSchool: string;
  notes: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  REVIEW: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  WAITLIST: "قائمة انتظار",
};

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

  const where: Prisma.StudentApplicationWhereInput = {};
  if (q) {
    where.OR = [
      { studentNameAr: { contains: q } },
      { referenceNo: { contains: q } },
      { guardianName: { contains: q } },
      { guardianPhone: { contains: q } },
      { nationalId: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;
  if (gradeId) where.gradeId = gradeId;

  // Scope-restriction (same logic as the list endpoint)
  if (scope.schoolIds !== null) {
    where.schoolId = scope.schoolIds.length === 0
      ? { in: [] }
      : schoolId && scope.schoolIds.includes(schoolId)
        ? schoolId
        : { in: scope.schoolIds };
  } else if (scope.governorateIds !== null) {
    where.governorateId = scope.governorateIds.length === 0
      ? { in: [] }
      : governorateId && scope.governorateIds.includes(governorateId)
        ? governorateId
        : { in: scope.governorateIds };
  } else {
    if (schoolId) where.schoolId = schoolId;
    if (governorateId) where.governorateId = governorateId;
  }

  // Hard cap to prevent runaway exports
  const items = await db.studentApplication.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    take: 5000,
    include: {
      school: { select: { nameAr: true } },
      governorate: { select: { nameAr: true } },
      city: { select: { nameAr: true } },
      grade: { select: { nameAr: true } },
    },
  });

  // Redact PII if user can't see it
  const safe = items.map((it) => redactStudentApp(it as any, canSeeFull));

  const rows: StudentRow[] = safe.map((a: any) => ({
    referenceNo: a.referenceNo || "",
    submittedAt: a.submittedAt ? new Date(a.submittedAt).toLocaleString("ar-EG") : "",
    status: STATUS_LABELS[a.status] || a.status || "",
    studentNameAr: a.studentNameAr || "",
    nationalId: a.nationalId || "",
    gender: a.gender === "MALE" ? "بنين" : a.gender === "FEMALE" ? "بنات" : "",
    birthDate: a.birthDate ? new Date(a.birthDate).toLocaleDateString("ar-EG") : "",
    governorate: a.governorate?.nameAr || "",
    city: a.city?.nameAr || "",
    school: a.school?.nameAr || "",
    grade: a.grade?.nameAr || "",
    guardianName: a.guardianName || "",
    guardianPhone: a.guardianPhone || "",
    guardianNationalId: a.guardianNationalId || "",
    addressAr: a.addressAr || "",
    previousSchool: a.previousSchool || "",
    notes: a.notes || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => Object.fromEntries(ARABIC_HEADERS.map(([k, label]) => [label, (r as any)[k]])))
  );
  // Make the header row bold-ish: just widen first column
  ws["!cols"] = ARABIC_HEADERS.map(([, label], i) => ({ wch: i === 0 ? 22 : Math.max(14, label.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws, "طلبات الطلاب");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  await logAudit({
    action: "BULK",
    entity: "StudentApplication",
    entityId: "export",
    newValue: { count: rows.length, filters: { q, status, schoolId, governorateId, gradeId } },
  });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ejs-students-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}